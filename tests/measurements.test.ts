import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import {
  createMeasurement,
  getSeries,
  importCsv,
  previewCsv,
  prepareMeasurement,
  metricOverview,
} from "@/server/services/measurements";
import { AppError } from "@/server/errors";
import { toNum } from "@/lib/utils";
import { CSV_TEMPLATE } from "@/lib/csv-template";
import { TZ, cleanup, daysAgoInput, makeUser, metricId } from "./helpers/factory";

let user: { id: string };
beforeAll(async () => {
  user = await makeUser();
});
afterAll(() => cleanup(user.id));

const fail = (p: Promise<unknown>) => expect(p).rejects.toBeInstanceOf(Error);

describe("health measurement creation", () => {
  it("records glucose with context and converts mmol/L to mg/dL", async () => {
    const id = await metricId("blood_glucose");
    const m = await createMeasurement(
      user.id,
      {
        metricId: id,
        value: "6.1",
        unit: "mmol/L",
        measuredAt: daysAgoInput(1, "07:30"),
        context: "FASTING",
        notes: "before tea",
      },
      TZ,
    );
    expect(m.unit).toBe("mg/dL");
    expect(toNum(m.value)).toBeCloseTo(109.9, 1);
    expect(m.context).toBe("FASTING");
    const ev = await db.timelineEvent.findFirst({ where: { sourceId: m.id } });
    expect(ev?.summary).toContain("Fasting");
    expect(ev?.importance).toBe(1);
  });

  it("interprets entered time as IST", async () => {
    const id = await metricId("heart_rate");
    const m = await createMeasurement(
      user.id,
      { metricId: id, value: "70", unit: "bpm", measuredAt: "2026-01-15T08:30" },
      TZ,
    );
    expect(m.measuredAt.toISOString()).toBe("2026-01-15T03:00:00.000Z");
  });

  it("validates blood pressure", async () => {
    const id = await metricId("blood_pressure");
    await fail(
      createMeasurement(
        user.id,
        { metricId: id, value: "80", value2: "120", unit: "mmHg", measuredAt: daysAgoInput(1) },
        TZ,
      ),
    );
    await fail(
      createMeasurement(
        user.id,
        { metricId: id, value: "120", unit: "mmHg", measuredAt: daysAgoInput(1) },
        TZ,
      ),
    );
    const ok = await createMeasurement(
      user.id,
      { metricId: id, value: "124", value2: "80", unit: "mmHg", measuredAt: daysAgoInput(1) },
      TZ,
    );
    expect(toNum(ok.value2)).toBe(80);
  });

  it("rejects implausible values, wrong units, invalid contexts and future dates", async () => {
    const g = await metricId("blood_glucose");
    await fail(
      createMeasurement(
        user.id,
        { metricId: g, value: "9999", unit: "mg/dL", measuredAt: daysAgoInput(1) },
        TZ,
      ),
    );
    await fail(
      createMeasurement(
        user.id,
        { metricId: g, value: "100", unit: "kg", measuredAt: daysAgoInput(1) },
        TZ,
      ),
    );
    await fail(
      createMeasurement(
        user.id,
        {
          metricId: g,
          value: "100",
          unit: "mg/dL",
          measuredAt: daysAgoInput(1),
          context: "WHILE_FLYING",
        },
        TZ,
      ),
    );
    await fail(
      createMeasurement(
        user.id,
        { metricId: g, value: "abc", unit: "mg/dL", measuredAt: daysAgoInput(1) },
        TZ,
      ),
    );
    await fail(
      createMeasurement(
        user.id,
        { metricId: g, value: "100", unit: "mg/dL", measuredAt: "2099-01-01T10:00" },
        TZ,
      ),
    );
    const spo2 = await metricId("spo2");
    await fail(
      createMeasurement(
        user.id,
        { metricId: spo2, value: "101", unit: "%", measuredAt: daysAgoInput(1) },
        TZ,
      ),
    );
  });

  it("prepareMeasurement converts °C and lb", () => {
    const base = {
      minValue: null,
      maxValue: null,
      contexts: [],
      decimals: 1,
      valueType: "SINGLE" as const,
      secondaryLabel: null,
    };
    expect(
      prepareMeasurement(
        { ...base, key: "temperature", name: "Temp", unit: "°F" },
        { value: 37, unit: "°C" },
      ).value,
    ).toBeCloseTo(98.6, 1);
    expect(
      prepareMeasurement(
        { ...base, key: "weight", name: "Weight", unit: "kg" },
        { value: 154, unit: "lb" },
      ).value,
    ).toBeCloseTo(69.85, 1);
    expect(() =>
      prepareMeasurement(
        { ...base, key: "weight", name: "Weight", unit: "kg" },
        { value: 70, unit: "stone" },
      ),
    ).toThrow(AppError);
  });

  it("returns series filtered by range and only metrics with data in the overview", async () => {
    const hr = await metricId("heart_rate");
    await createMeasurement(
      user.id,
      { metricId: hr, value: "66", unit: "bpm", measuredAt: daysAgoInput(100) },
      TZ,
    );
    const last30 = await getSeries(user.id, hr, "30d");
    const all = await getSeries(user.id, hr, "all");
    expect(all.length).toBeGreaterThan(last30.length);
    const overview = await metricOverview(user.id);
    expect(overview.tracked.map((t) => t.metric.key).sort()).toEqual([
      "blood_glucose",
      "blood_pressure",
      "heart_rate",
    ]);
  });
});

describe("CSV import", () => {
  it("previews without saving, then imports only valid rows", async () => {
    const before = await db.healthMeasurement.count({ where: { userId: user.id } });
    const csv = `${CSV_TEMPLATE}unknown_metric,1,,x,2026-01-01 10:00,,\nweight,abc,,kg,2026-01-01 10:00,,\n`;
    const preview = await previewCsv(user.id, csv, TZ);
    expect(preview.filter((r) => r.ok)).toHaveLength(3);
    expect(preview.filter((r) => !r.ok).map((r) => r.error)).toEqual([
      expect.stringContaining("Unknown metric"),
      "Value is not a number",
    ]);
    expect(await db.healthMeasurement.count({ where: { userId: user.id } })).toBe(before);
    const res = await importCsv(user.id, csv, TZ);
    expect(res).toEqual({ imported: 3, skipped: 2 });
    expect(
      await db.healthMeasurement.count({ where: { userId: user.id, source: "CSV_IMPORT" } }),
    ).toBe(3);
  });

  it("rejects CSVs without required columns", async () => {
    await expect(previewCsv(user.id, "a,b\n1,2", TZ)).rejects.toThrow(/Missing required column/);
  });
});
