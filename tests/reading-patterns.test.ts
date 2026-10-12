import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import {
  correctionEvents,
  labelHash,
  learnFromCorrection,
  loadPatterns,
  setImproveReading,
  suggestFromSwaps,
} from "@/server/services/reading-patterns";
import { OUTSIDE_RANGE_CHECK, parseLabText } from "@/server/extraction/lab-parser";
import { cleanup, makeUser } from "./helpers/factory";

const people: { id: string }[] = [];
beforeAll(async () => {
  for (const n of ["A", "B", "C", "D"]) people.push(await makeUser(n));
  await db.readingPattern.deleteMany({});
});
afterAll(async () => {
  await db.readingPattern.deleteMany({});
  await cleanup(...people.map((p) => p.id));
});

const read = [
  { testName: "Globulin", biomarkerCode: "GLOB", value: "1.7" },
  { testName: "Recieved", biomarkerCode: null, value: "31" },
  { testName: "Mrs Usha Pralhad Kale", biomarkerCode: null, value: "55" },
  { testName: "S G O T", biomarkerCode: null, value: "14" },
];
const corrected = [
  { testName: "Globulin", biomarkerCode: "GLOB", value: "7.7" },
  { testName: "AST (SGOT)", biomarkerCode: "AST", value: "14" },
];

describe("learning from a correction", () => {
  it("notes only the kind of mistake", () => {
    const ev = correctionEvents(read, corrected);
    expect(ev.digits).toEqual([["1", "7"]]);
    expect(ev.junk).toEqual(["Recieved", "Mrs Usha Pralhad Kale"]);
    expect(ev.alias).toEqual([["S G O T", "AST"]]);
  });

  it("does nothing for someone who hasn't agreed", async () => {
    await learnFromCorrection(people[0].id, read, corrected);
    expect(await db.readingPattern.count()).toBe(0);
  });

  it("keeps no values, names or people, and keeps labels only once three people agree", async () => {
    for (const p of people) await setImproveReading(p.id, true);
    // Everyone deletes "Recieved"; only one report has this patient's name.
    await learnFromCorrection(people[0].id, read, corrected);
    await learnFromCorrection(people[1].id, read.slice(0, 2), corrected.slice(0, 1));
    let rows = await db.readingPattern.findMany();
    // Only what a pattern holds (timestamps could contain digits like "17.7" by chance).
    const stored = JSON.stringify(
      rows.map(({ kind, key, target, count }) => ({ kind, key, target, count })),
    );
    for (const secret of ["Usha", "Kale", "Recieved", "1.7", "7.7", people[0].id])
      expect(stored).not.toContain(secret);
    expect(rows.filter((r) => r.kind === "JUNK")).toHaveLength(0); // only two people so far
    await learnFromCorrection(people[2].id, read.slice(0, 2), corrected.slice(0, 1));
    rows = await db.readingPattern.findMany();
    const junk = rows.filter((r) => r.kind === "JUNK").map((r) => r.key);
    expect(junk).toEqual([labelHash("Recieved")]);
    expect(junk).not.toContain(labelHash("Mrs Usha Pralhad Kale"));
    expect(rows.find((r) => r.kind === "DIGIT")).toMatchObject({ key: "1", target: "7", count: 3 });
  });

  it("uses what it learned the next time a report is read", async () => {
    const patterns = await loadPatterns();
    const text = "Recieved 31 mg/dl 10-40\nTotal Proteins 1.7 gm/dl 6.4-8.4";
    const report = parseLabText(text, { source: "ocr", patterns });
    expect(report.candidates.map((c) => c.testName)).not.toContain("Recieved");
    const tp = report.candidates.find((c) => c.biomarkerCode === "TP")!;
    expect(tp.value).toBe("1.7"); // never changed automatically
    expect(suggestFromSwaps(tp, patterns.digitSwaps).warnings).toContain(
      `${OUTSIDE_RANGE_CHECK} It may be 7.7.`,
    );
  });
});
