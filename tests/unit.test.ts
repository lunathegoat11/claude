import { describe, expect, it } from "vitest";
import { ZodError, z } from "zod";
import { parseLabText, findReportDate } from "@/server/extraction/lab-parser";
import { parseCsv } from "@/server/extraction/csv";
import {
  formatDate,
  formatRelativeDateTime,
  parseZonedInput,
  formatINR,
  formatNumber,
  toDateTimeInputValue,
} from "@/lib/format";
import { normaliseIndianPhone, formatIndianPhone } from "@/lib/india";
import { matchBiomarker, findBiomarkersInText, BIOMARKERS } from "@/lib/catalog/biomarkers";
import {
  recordSchema,
  profileSchema,
  labPanelSchema,
  assistantQuestionSchema,
} from "@/lib/validation/health";
import { AppError, toSafeError } from "@/server/errors";
import { normaliseTags } from "@/lib/utils";

describe("lab text parser", () => {
  const text = `CITY PATHOLOGY LABS, NAGPUR
Patient: Demo   Collected on: 05-Aug-2026
Haemoglobin 11.2 L g/dL 12.0 - 15.0
Total Leucocyte Count 7,400 /cumm 4000 - 11000
Platelet Count 2.1 lakhs/cumm 1.5 - 4.1
SGPT (ALT) 42 H U/L Up to 35
TSH (Ultrasensitive) 3.25 uIU/mL 0.35 - 5.50
Some random line 123
HbA1c 6.1 % 4.0 - 5.6`;
  it("extracts values, units, ranges and lab flags", () => {
    const r = parseLabText(text);
    const by = Object.fromEntries(r.candidates.map((c) => [c.biomarkerCode, c]));
    expect(by.HGB).toMatchObject({
      value: "11.2",
      unit: "g/dL",
      refLow: 12,
      refHigh: 15,
      labFlag: "LOW",
    });
    expect(by.PLT).toMatchObject({ value: "2.1", unit: "lakh/µL", refLow: 1.5, refHigh: 4.1 });
    expect(by.ALT).toMatchObject({ value: "42", labFlag: "HIGH", refHigh: 35, refLow: null });
    expect(by.TSH).toMatchObject({ value: "3.25", unit: "µIU/mL" });
    expect(by.HBA1C).toMatchObject({ value: "6.1", unit: "%" });
    expect(r.collectedAt).toBe("2026-08-05");
    expect(r.labName).toBe("CITY PATHOLOGY LABS, NAGPUR");
    expect(r.candidates.every((c) => c.confidence > 0 && c.confidence <= 0.95)).toBe(true);
  });
  it("never invents values for lines without numbers", () => {
    expect(parseLabText("Hemoglobin: see attached\nTSH pending").candidates).toHaveLength(0);
  });
  it("reads dd/mm/yyyy dates the Indian way", () => {
    expect(findReportDate("Report date: 03/04/2026")).toBe("2026-04-03");
  });
});

describe("catalogue", () => {
  it("contains no reference ranges", () => {
    for (const b of BIOMARKERS)
      expect(Object.keys(b)).not.toEqual(
        expect.arrayContaining(["low", "high", "range", "refLow", "refHigh"]),
      );
  });
  it("matches Indian lab naming", () => {
    expect(matchBiomarker("S. Creatinine")?.code).toBe("CREAT");
    expect(matchBiomarker("SGOT (AST)")?.code).toBe("AST");
    expect(matchBiomarker("PPBS")?.code).toBe("GLU_PP");
    expect(
      findBiomarkersInText("compare my hba1c and ldl")
        .map((b) => b.code)
        .sort(),
    ).toEqual(["HBA1C", "LDL"]);
  });
});

describe("India formatting", () => {
  it("formats dates day-first in IST", () => {
    expect(formatDate("2026-09-25T20:00:00Z")).toBe("26 Sept 2026"); // already the 26th in IST
    expect(
      formatRelativeDateTime(new Date("2026-10-03T03:02:00Z"), new Date("2026-10-03T10:00:00Z")),
    ).toBe("Today, 8:32 AM");
    expect(formatNumber(150000, 0)).toBe("1,50,000");
    expect(formatINR(500000)).toBe("₹5,00,000");
  });
  it("round-trips IST wall-clock input", () => {
    const d = parseZonedInput("2026-09-25T08:32")!;
    expect(d.toISOString()).toBe("2026-09-25T03:02:00.000Z");
    expect(toDateTimeInputValue(d)).toBe("2026-09-25T08:32");
    expect(parseZonedInput("2026-09-25")!.toISOString()).toBe("2026-09-25T06:30:00.000Z");
    expect(parseZonedInput("25/09/2026")).toBeNull();
  });
  it("validates Indian phone numbers", () => {
    expect(normaliseIndianPhone("+91 98765 43210")).toBe("+919876543210");
    expect(normaliseIndianPhone("098765-43210")).toBe("+919876543210");
    expect(normaliseIndianPhone("919876543210")).toBe("+919876543210");
    expect(normaliseIndianPhone("12345")).toBeNull();
    expect(normaliseIndianPhone("+1 415 555 0100")).toBeNull();
    expect(formatIndianPhone("+919876543210")).toBe("+91 98765 43210");
  });
});

describe("input validation", () => {
  it("validates records", () => {
    expect(
      recordSchema.safeParse({
        type: "DOCTOR_VISIT",
        title: "  Visit  ",
        date: "2026-01-01",
        tags: "A, b ,a",
      }).data,
    ).toMatchObject({ title: "Visit", tags: ["a", "b"] });
    expect(
      recordSchema.safeParse({ type: "SURGERY", title: "x", date: "2026-01-01" }).success,
    ).toBe(false);
    expect(recordSchema.safeParse({ type: "OTHER", title: "", date: "2026-01-01" }).success).toBe(
      false,
    );
    expect(
      recordSchema.safeParse({
        type: "HOSPITALIZATION",
        title: "x",
        date: "2026-01-05",
        endDate: "2026-01-01",
      }).success,
    ).toBe(false);
    expect(
      recordSchema.safeParse({ type: "OTHER", title: "x".repeat(201), date: "2026-01-01" }).success,
    ).toBe(false);
  });
  it("validates profiles with Indian phone numbers", () => {
    expect(profileSchema.safeParse({ fullName: "A", phone: "98765 43210" }).success).toBe(true);
    expect(profileSchema.safeParse({ fullName: "A", phone: "555-0100" }).success).toBe(false);
    expect(profileSchema.safeParse({ fullName: "A", heightCm: "400" }).success).toBe(false);
  });
  it("caps lab panels and assistant questions", () => {
    const results = Array.from({ length: 101 }, () => ({ testName: "TSH", value: "1" }));
    expect(
      labPanelSchema.safeParse({ name: "x", collectedAt: "2026-01-01", results }).success,
    ).toBe(false);
    expect(assistantQuestionSchema.safeParse({ message: "  " }).success).toBe(false);
    expect(assistantQuestionSchema.safeParse({ message: "x".repeat(2001) }).success).toBe(false);
  });
  it("normalises tags", () => {
    expect(normaliseTags("Blood Pressure, ,BP,bp")).toEqual(["blood-pressure", "bp"]);
  });
});

describe("error handling", () => {
  it("never exposes internal error details", () => {
    const safe = toSafeError(new Error('relation "User" does not exist at db.internal:5432'));
    expect(safe).toEqual({
      code: "INTERNAL",
      message: "Something went wrong on our side. Please try again.",
    });
  });
  it("passes through safe app errors and field-level validation errors", () => {
    expect(toSafeError(new AppError("NOT_FOUND", "Record not found.")).message).toBe(
      "Record not found.",
    );
    let err: ZodError | undefined;
    try {
      z.object({ results: z.array(z.object({ value: z.string().min(1, "Required") })) }).parse({
        results: [{ value: "" }],
      });
    } catch (e) {
      err = e as ZodError;
    }
    expect(toSafeError(err).fieldErrors).toEqual({ "results.0.value": ["Required"] });
  });
});

describe("csv parser", () => {
  it("handles quotes, commas and CRLF", () => {
    expect(parseCsv('a,b\r\n"x, y","he said ""hi"""\r\n\r\n')).toEqual([
      ["a", "b"],
      ["x, y", 'he said "hi"'],
    ]);
  });
});
