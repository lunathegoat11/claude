import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import {
  createRecord,
  deleteRecord,
  getRecord,
  listRecords,
  updateRecord,
} from "@/server/services/records";
import {
  createLabPanel,
  deleteLabPanel,
  getLabPanel,
  getTestHistory,
  listTestSeries,
} from "@/server/services/labs";
import {
  createMeasurement,
  deleteMeasurement,
  getMeasurement,
  updateMeasurement,
  createCustomMetric,
  listMetrics,
  getSeries,
} from "@/server/services/measurements";
import { ask, deleteConversation, getConversation } from "@/server/services/assistant";
import { deleteHealthItem, upsertMedication } from "@/server/services/profile";
import { listTimeline } from "@/server/services/timeline";
import { AppError } from "@/server/errors";
import { TZ, cleanup, daysAgoInput, makeUser, metricId } from "./helpers/factory";

/**
 * Every service is scoped by userId. These tests confirm that one user can
 * never read, change or delete another user's health data, even with valid IDs.
 */
let alice: { id: string };
let bob: { id: string };
const notFound = (p: Promise<unknown>) =>
  expect(p).rejects.toSatisfy((e) => e instanceof AppError && e.code === "NOT_FOUND");

beforeAll(async () => {
  alice = await makeUser("Alice");
  bob = await makeUser("Bob");
});
afterAll(() => cleanup(alice.id, bob.id));

describe("medical record ownership", () => {
  it("isolates records between users", async () => {
    const rec = await createRecord(
      alice.id,
      { type: "DOCTOR_VISIT", title: "Alice private visit", date: "2026-01-10", tags: "" },
      TZ,
    );
    await notFound(getRecord(bob.id, rec.id));
    await notFound(
      updateRecord(
        bob.id,
        rec.id,
        { type: "DOCTOR_VISIT", title: "hijacked", date: "2026-01-10", tags: "" },
        TZ,
      ),
    );
    await notFound(deleteRecord(bob.id, rec.id));
    expect((await listRecords(bob.id)).items).toHaveLength(0);
    expect((await listRecords(bob.id, { q: "Alice" })).total).toBe(0);
    const still = await getRecord(alice.id, rec.id);
    expect(still.title).toBe("Alice private visit");
  });

  it("soft-deletes records and hides them afterwards", async () => {
    const rec = await createRecord(
      alice.id,
      { type: "VACCINATION", title: "Tetanus booster", date: "2026-02-01", tags: "" },
      TZ,
    );
    await deleteRecord(alice.id, rec.id);
    await notFound(getRecord(alice.id, rec.id));
    const row = await db.medicalRecord.findUnique({ where: { id: rec.id } });
    expect(row?.deletedAt).not.toBeNull();
    const tl = await listTimeline(alice.id, { includeRoutine: true });
    expect(tl.items.some((e) => e.sourceId === rec.id)).toBe(false);
  });
});

describe("lab ownership", () => {
  it("isolates lab panels and test history", async () => {
    const panel = await createLabPanel(
      alice.id,
      {
        name: "HbA1c",
        collectedAt: "2026-03-01",
        results: [{ testName: "HbA1c", value: "5.6", unit: "%", refLow: "4", refHigh: "5.6" }],
      },
      TZ,
    );
    await notFound(getLabPanel(bob.id, panel.id));
    await notFound(deleteLabPanel(bob.id, panel.id));
    await notFound(getTestHistory(bob.id, "HBA1C"));
    expect(await listTestSeries(bob.id)).toHaveLength(0);
    expect((await getTestHistory(alice.id, "HBA1C")).results).toHaveLength(1);
  });

  it("does not allow linking another user's document", async () => {
    const doc = await db.medicalDocument.create({
      data: {
        userId: alice.id,
        name: "a",
        type: "LAB_REPORT",
        storageKey: `u/${alice.id}/x-${Date.now()}`,
        originalFilename: "a.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1,
        sha256: "x",
      },
    });
    await notFound(
      createLabPanel(
        bob.id,
        {
          name: "x",
          collectedAt: "2026-03-01",
          documentId: doc.id,
          results: [{ testName: "TSH", value: "2" }],
        },
        TZ,
      ),
    );
  });
});

describe("measurement ownership", () => {
  it("isolates readings and series", async () => {
    const m = await createMeasurement(
      alice.id,
      {
        metricId: await metricId("heart_rate"),
        value: "72",
        unit: "bpm",
        measuredAt: daysAgoInput(1),
      },
      TZ,
    );
    await notFound(getMeasurement(bob.id, m.id));
    await notFound(
      updateMeasurement(
        bob.id,
        m.id,
        { metricId: m.metricId, value: "200", unit: "bpm", measuredAt: daysAgoInput(1) },
        TZ,
      ),
    );
    await notFound(deleteMeasurement(bob.id, m.id));
    expect(await getSeries(bob.id, m.metricId, "all")).toHaveLength(0);
  });

  it("keeps custom metrics private to their owner", async () => {
    const metric = await createCustomMetric(alice.id, { name: "Waist", unit: "cm", decimals: "1" });
    expect((await listMetrics(bob.id)).some((m) => m.id === metric.id)).toBe(false);
    await notFound(
      createMeasurement(
        bob.id,
        { metricId: metric.id, value: "80", unit: "cm", measuredAt: daysAgoInput(1) },
        TZ,
      ),
    );
  });
});

describe("assistant & health summary ownership", () => {
  it("isolates conversations", async () => {
    const reply = await ask(alice.id, { message: "Show me my HbA1c trend" }, TZ);
    await notFound(getConversation(bob.id, reply.conversationId));
    await notFound(deleteConversation(bob.id, reply.conversationId));
    await notFound(ask(bob.id, { conversationId: reply.conversationId, message: "continue" }, TZ));
  });

  it("does not let users delete each other's medications", async () => {
    await upsertMedication(
      alice.id,
      null,
      { name: "Metformin", dosage: "500 mg", active: "on" },
      TZ,
    );
    const med = await db.medication.findFirstOrThrow({ where: { userId: alice.id } });
    await notFound(deleteHealthItem(bob.id, "medication", med.id));
    await notFound(upsertMedication(bob.id, med.id, { name: "Changed", active: "on" }, TZ));
  });
});
