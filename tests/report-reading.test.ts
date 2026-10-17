import { describe, expect, it } from "vitest";
import { candidatesFromResults, parseLabText, reportNameFor } from "@/server/extraction/lab-parser";
import { plausibleDate } from "@/server/extraction/pipeline";

const REPORT = `CITY PATHOLOGY LABS, LUCKNOW
Patient Name : Test Person      Age : 45 Years   Sex : Male
Ref. By : Dr. Example           Mobile : 9876543210
Sample Collected : 03/07/2026
COMPLETE BLOOD COUNT
Test Name                 Result   Unit          Biological Ref. Interval
1. Haemoglobin            13.4     g/dL          13.0 - 17.0
2. Total Leucocyte Count  7800     /cumm         4000 - 11000
3. Platelet Count
   2.1                    lakh/cumm  1.5 - 4.1
* Mean Corpuscular Volume  86.2   fL   83 - 101
ESR (Westergren)          22   H   mm/hr   0 - 15
Vitamin B12               180      pg/mL         211 - 911
Page 1 of 2`;

describe("reading real-world report layouts", () => {
  const r = parseLabText(REPORT);
  const by = (n: string) => r.candidates.find((c) => c.testName === n || c.biomarkerCode === n);

  it("reads numbered rows and rows with list markers", () => {
    expect(by("HGB")).toMatchObject({ value: "13.4", unit: "g/dL", refLow: 13, refHigh: 17 });
    expect(by("WBC")).toMatchObject({ value: "7800" });
  });

  it("reads a value printed on the line below the test name", () => {
    expect(by("PLT")).toMatchObject({ value: "2.1", unit: "lakh/µL" });
  });

  it("reads tests it knows by other names, and ones that aren't in the built-in list", () => {
    expect(by("ESR")).toMatchObject({
      value: "22",
      labFlag: "HIGH",
      refText: "0 - 15",
    });
  });

  it("does not mistake patient details, phone numbers or page numbers for results", () => {
    const names = r.candidates.map((c) => c.testName.toLowerCase()).join("|");
    expect(names).not.toMatch(/age|mobile|page|ref|collected|patient/);
  });

  it("finds the date (Indian day-first) and names the report", () => {
    expect(r.collectedAt).toBe("2026-07-03");
    expect(r.reportName).toBe("Complete blood count & vitamins");
    expect(reportNameFor([])).toBe("Lab report");
  });
});

describe("photo misreads", () => {
  it("spots a range that lost its decimal points", () => {
    const c = parseLabText("Hemoglobin 12.8 g/dL 120 - 155", { source: "ocr" }).candidates[0];
    expect(c.warnings?.join(" ")).toMatch(/range may be missing a decimal point/);
    // A genuinely low value against a sensible range is not second-guessed.
    const ok = parseLabText("Hemoglobin 9.8 g/dL 12.0 - 15.5").candidates[0];
    expect(ok.warnings).toBeUndefined();
  });
});

describe("results read by an AI model", () => {
  it("links known tests to the catalogue and re-checks ranges locally", () => {
    const c = candidatesFromResults([
      {
        testName: "HbA1c (Glycated Haemoglobin)",
        value: "6.1",
        unit: "%",
        refText: "4.0 - 5.6",
        flag: null,
      },
      { testName: "TSH", value: "52", unit: "uIU/mL", refText: "0.4 - 4.5", flag: "HIGH" },
      { testName: "Urine colour", value: "Pale yellow", unit: null, refText: null, flag: null },
      { testName: "TSH", value: "5.2", unit: "uIU/mL", refText: null, flag: null }, // duplicate
      { testName: "  ", value: "1", unit: null, refText: null, flag: null }, // empty name
    ]);
    expect(c).toHaveLength(3);
    expect(c[0]).toMatchObject({ biomarkerCode: "HBA1C", refLow: 4, refHigh: 5.6 });
    expect(c[1].warnings?.[0]).toMatch(/decimal point/);
    expect(c[2]).toMatchObject({ biomarkerCode: "U_COLOR", value: "Pale yellow" });
  });

  it("accepts only real, past dates", () => {
    expect(plausibleDate("2026-07-03")).toBe("2026-07-03");
    expect(plausibleDate("2026-02-30")).toBeNull();
    expect(plausibleDate("2999-01-01")).toBeNull();
    expect(plausibleDate("03/07/2026")).toBeNull();
    expect(plausibleDate(null)).toBeNull();
  });
});
