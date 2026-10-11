import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { extractDocument } from "@/server/extraction/pipeline";
import { fixOcrLine, mergeReports, parseLabText } from "@/server/extraction/lab-parser";

/**
 * A made-up report laid out like a real one a user photographed: white-on-red banner,
 * a table whose units sit a little lower than the values, a "Reported" date and a
 * footer with an address and phone number. Phone-camera blur, slight tilt, WhatsApp-
 * style compression (720 px wide, low JPEG quality).
 */
describe("reading a phone photo of a real-world report", () => {
  it("reads every result with its unit and printed range, and nothing else", async () => {
    const r = await extractDocument(
      readFileSync("tests/fixtures/biochemistry-photo.jpg"),
      "image/jpeg",
    );
    expect(r.extractor).toBe("ocr");
    const rows = Object.fromEntries(
      // IU/L and U/L are the same unit; either reading is right.
      r.report!.candidates.map((c) => [
        c.testName,
        `${c.value} ${c.unit?.replace("IU/L", "U/L")} ${c.refText}`,
      ]),
    );
    expect(rows).toEqual({
      Urea: "20 mg/dL 10-40",
      Creatinine: "0.7 mg/dL 0.6-1.2",
      "Uric acid": "5.0 mg/dL 2.4-5.7",
      "Bilirubin, total": "0.50 mg/dL 0.0-1.2",
      "Bilirubin, direct": "0.16 mg/dL 0.0-0.5",
      "Bilirubin, indirect": "0.34 mg/dL 0.0-0.7",
      "AST (SGOT)": "14.0 U/L 0-46",
      "ALT (SGPT)": "26 U/L 0-49",
      "Total protein": "7.7 g/dL 6.4-8.4",
      Albumin: "4.0 g/dL 3.2-5.0",
      Globulin: "3.7 g/dL 1.8-3.6",
      "Alkaline phosphatase": "79 U/L 25-100",
    });
    expect(r.report!.collectedAt).toBe("2025-07-14");
    expect(r.report!.labName).toMatch(/Sunrise Hospital & Research Centre/);
  }, 120_000);
});

describe("OCR clean-up", () => {
  it("fixes smudged units and comma decimals", () => {
    expect(fixOcrLine("CREATININE 0.7 ma/d| 0.6-1.2")).toBe("CREATININE 0.7 mg/dl 0.6-1.2");
    expect(fixOcrLine("Total Proteins 7.7 am/dl 6.4-8.4")).toBe("Total Proteins 7.7 gm/dl 6.4-8.4");
    expect(fixOcrLine("UREA 20 mag/d| 10-40")).toBe("UREA 20 mg/dl 10-40");
    expect(fixOcrLine("ALP 79 1U/L 25-100")).toBe("ALP 79 IU/L 25-100");
    expect(fixOcrLine("Albumin 4.0 gm/dl 3,2-5.0")).toBe("Albumin 4.0 gm/dl 3.2-5.0");
  });

  it("ignores dates, phone numbers and addresses that look like results", () => {
    const r = parseLabText(
      "Reported 31-05-2025 11:56\nSome Marg, Example Nagar - 414 001. Tel : 0241 - 2320473\nUric acid 5.0 mg/dl 2.4-5.7",
      { source: "ocr" },
    );
    expect(r.candidates.map((c) => c.testName)).toEqual(["Uric acid"]);
  });

  it("trusts values two reads agree on, fills gaps, and flags disagreements", () => {
    const a = parseLabText("UREA 20\nAlbumin 4.0 gm/dl 3.2-5.0", { source: "ocr" });
    const b = parseLabText("UREA 20 mg/dl 10-40\nAlbumin 4.6 gm/dl 3.2-5.0", { source: "ocr" });
    const m = mergeReports([a, b]).candidates;
    expect(m[0]).toMatchObject({ value: "20", refText: "10-40", confidence: 0.8 });
    expect(m[1].warnings?.[0]).toMatch(/read as 4.0 once and 4.6 once/);
  });
});
