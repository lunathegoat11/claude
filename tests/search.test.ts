import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createRecord } from "@/server/services/records";
import { createLabPanel } from "@/server/services/labs";
import { createMeasurement } from "@/server/services/measurements";
import { expandTerms, parseDateQuery, searchAll } from "@/server/services/search";
import { TZ, cleanup, daysAgoInput, makeUser, metricId } from "./helpers/factory";

let alice: { id: string };
let bob: { id: string };
beforeAll(async () => {
  alice = await makeUser("Alice");
  bob = await makeUser("Bob");
  await createRecord(
    alice.id,
    {
      type: "DOCTOR_VISIT",
      title: "Diabetes consultation",
      date: "2026-09-18",
      facilityName: "Lakeside Clinic, Kochi",
      notes: "Discussed glucose control",
      tags: "diabetes",
    },
    TZ,
  );
  await createLabPanel(
    alice.id,
    {
      name: "Sugar",
      collectedAt: "2026-09-12",
      labName: "Kochi Labs",
      results: [{ testName: "Glucose, fasting", value: "108", unit: "mg/dL" }],
    },
    TZ,
  );
  await createMeasurement(
    alice.id,
    {
      metricId: await metricId("blood_glucose"),
      value: "112",
      unit: "mg/dL",
      measuredAt: daysAgoInput(2),
      context: "FASTING",
    },
    TZ,
  );
  await createRecord(
    bob.id,
    { type: "DOCTOR_VISIT", title: "Bob glucose visit", date: "2026-09-18", tags: "" },
    TZ,
  );
});
afterAll(() => cleanup(alice.id, bob.id));

describe("search helpers", () => {
  it("expands Indian/common synonyms", () => {
    expect(expandTerms("sugar")).toContain("glucose");
    expect(expandTerms("BP")).toContain("blood pressure");
    expect(expandTerms("sgpt")).toContain("alt");
  });
  it("parses Indian date formats", () => {
    const d = parseDateQuery("12/09/2026")!;
    expect(d.from.toISOString()).toBe("2026-09-11T18:30:00.000Z");
    expect(parseDateQuery("Sep 2026")!.to.toISOString()).toBe("2026-09-30T18:30:00.000Z");
    expect(parseDateQuery("glucose")).toBeNull();
  });
});

describe("global search", () => {
  it("finds records, labs and measurements for 'glucose' — only the user's own", async () => {
    const r = await searchAll(alice.id, "glucose");
    expect(r.records.map((x) => x.title)).toEqual(["Diabetes consultation"]);
    expect(r.labs).toHaveLength(1);
    expect(r.measurements.length).toBeGreaterThan(0);
    expect(JSON.stringify(r)).not.toContain("Bob");
  });
  it("finds via synonyms, providers and numbers", async () => {
    expect((await searchAll(alice.id, "sugar")).labs).toHaveLength(1);
    expect((await searchAll(alice.id, "Kochi")).providers.length).toBeGreaterThan(0);
    expect((await searchAll(alice.id, "108")).labs).toHaveLength(1);
    expect((await searchAll(alice.id, "12/09/2026")).labs).toHaveLength(1);
  });
  it("respects type filters and minimum length", async () => {
    const r = await searchAll(alice.id, "glucose", { types: ["records"] });
    expect(r.labs).toHaveLength(0);
    expect(r.records).toHaveLength(1);
    expect((await searchAll(alice.id, "g")).total).toBe(0);
  });
});
