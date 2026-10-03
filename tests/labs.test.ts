import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { db } from "@/server/db";
import {
  createLabPanel,
  deleteLabPanel,
  getPreviousResults,
  listTestSeries,
  updateLabPanel,
} from "@/server/services/labs";
import { computeLabFlag, parseReferenceRange } from "@/lib/lab-range";
import { toNum } from "@/lib/utils";
import { AppError } from "@/server/errors";
import { TZ, cleanup, makeUser } from "./helpers/factory";

let user: { id: string };
beforeAll(async () => {
  user = await makeUser();
});
afterAll(() => cleanup(user.id));

describe("reference ranges", () => {
  it("parses ranges as printed on Indian lab reports", () => {
    expect(parseReferenceRange("13.0 - 17.0")).toEqual({ low: 13, high: 17 });
    expect(parseReferenceRange("4.0–5.6")).toEqual({ low: 4, high: 5.6 });
    expect(parseReferenceRange("< 200")).toEqual({ low: null, high: 200 });
    expect(parseReferenceRange("Up to 40")).toEqual({ low: null, high: 40 });
    expect(parseReferenceRange("> 40")).toEqual({ low: 40, high: null });
    expect(parseReferenceRange("1,50,000 - 4,10,000")).toEqual({ low: 150000, high: 410000 });
    expect(parseReferenceRange("see note")).toEqual({ low: null, high: null });
  });

  it("flags only against the stored range, never a universal one", () => {
    expect(computeLabFlag(5.7, 4, 5.6)).toBe("HIGH");
    expect(computeLabFlag(3.9, 4, 5.6)).toBe("LOW");
    expect(computeLabFlag(5, 4, 5.6)).toBe("NORMAL");
    // No range on the report → no judgement at all.
    expect(computeLabFlag(500, null, null)).toBe("UNKNOWN");
    // The lab's own flag wins.
    expect(computeLabFlag(5, 4, 5.6, "ABNORMAL")).toBe("ABNORMAL");
  });
});

describe("lab panel creation", () => {
  it("stores values, units and per-result ranges, and creates a timeline event", async () => {
    const panel = await createLabPanel(
      user.id,
      {
        name: "Lipid Profile",
        collectedAt: "2026-06-01",
        labName: "Test Labs, Pune",
        results: [
          { testName: "Total cholesterol", value: "212", unit: "mg/dL", refText: "< 200" },
          { testName: "HDL cholesterol", value: "46", unit: "mg/dL", refLow: "40" },
          { testName: "Urine colour", value: "Pale yellow" },
        ],
      },
      TZ,
    );
    const results = await db.labResult.findMany({
      where: { panelId: panel.id },
      orderBy: { createdAt: "asc" },
    });
    expect(results).toHaveLength(3);
    const chol = results.find((r) => r.testName === "Total cholesterol")!;
    expect(chol.biomarkerCode).toBe("CHOL");
    expect(toNum(chol.valueNumeric)).toBe(212);
    expect(toNum(chol.refHigh)).toBe(200);
    expect(chol.flag).toBe("HIGH");
    const urine = results.find((r) => r.testName === "Urine colour")!;
    expect(urine.valueNumeric).toBeNull();
    expect(urine.valueText).toBe("Pale yellow");
    expect(urine.flag).toBe("UNKNOWN");
    const ev = await db.timelineEvent.findUnique({
      where: { sourceType_sourceId: { sourceType: "LAB_PANEL", sourceId: panel.id } },
    });
    expect(ev?.title).toBe("Lipid Profile");
    expect(
      await db.provider.count({
        where: { userId: user.id, name: "Test Labs, Pune", type: "LABORATORY" },
      }),
    ).toBe(1);
  });

  it("rejects invalid lab values", async () => {
    const bad = (results: unknown[], extra: Record<string, unknown> = {}) =>
      createLabPanel(user.id, { name: "Bad", collectedAt: "2026-06-01", results, ...extra }, TZ);
    await expect(bad([])).rejects.toBeInstanceOf(ZodError);
    await expect(bad([{ testName: "", value: "5" }])).rejects.toBeInstanceOf(ZodError);
    await expect(bad([{ testName: "TSH", value: "" }])).rejects.toBeInstanceOf(ZodError);
    await expect(bad([{ testName: "TSH", value: "-3" }])).rejects.toBeInstanceOf(ZodError);
    await expect(
      bad([{ testName: "TSH", value: "2", refLow: "5", refHigh: "1" }]),
    ).rejects.toBeInstanceOf(ZodError);
    await expect(
      bad([{ testName: "TSH", value: "2" }], { collectedAt: "not-a-date" }),
    ).rejects.toBeInstanceOf(ZodError);
    await expect(
      bad([{ testName: "TSH", value: "2" }], { collectedAt: "2099-01-01" }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("compares with previous results of the same test", async () => {
    await createLabPanel(
      user.id,
      {
        name: "A1c",
        collectedAt: "2026-01-01",
        results: [{ testName: "HbA1c", value: "5.4", unit: "%" }],
      },
      TZ,
    );
    const later = await createLabPanel(
      user.id,
      {
        name: "A1c",
        collectedAt: "2026-07-01",
        results: [{ testName: "Glycated hemoglobin", value: "5.7", unit: "%" }],
      },
      TZ,
    );
    const full = await db.labPanel.findUniqueOrThrow({
      where: { id: later.id },
      include: { results: true },
    });
    const prev = await getPreviousResults(user.id, full);
    expect(toNum(prev.get("HBA1C")?.valueNumeric)).toBe(5.4);
    const series = await listTestSeries(user.id);
    expect(series.find((s) => s.key === "HBA1C")?.count).toBe(2);
  });

  it("edits replace results and deletes are soft", async () => {
    const p = await createLabPanel(
      user.id,
      {
        name: "TSH",
        collectedAt: "2026-05-01",
        results: [{ testName: "TSH", value: "6.1", unit: "µIU/mL" }],
      },
      TZ,
    );
    await updateLabPanel(
      user.id,
      p.id,
      {
        name: "TSH",
        collectedAt: "2026-05-01",
        results: [{ testName: "TSH", value: "3.1", unit: "µIU/mL" }],
      },
      TZ,
    );
    const active = await db.labResult.findMany({ where: { panelId: p.id, deletedAt: null } });
    expect(active.map((r) => toNum(r.valueNumeric))).toEqual([3.1]);
    await deleteLabPanel(user.id, p.id);
    expect((await db.labPanel.findUnique({ where: { id: p.id } }))?.deletedAt).not.toBeNull();
    expect(await db.labResult.count({ where: { panelId: p.id, deletedAt: null } })).toBe(0);
    expect(await db.timelineEvent.count({ where: { sourceId: p.id } })).toBe(0);
  });
});
