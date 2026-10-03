import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractDocument } from "@/server/extraction/pipeline";
import { looksLikeMissingDecimal, parseLabText } from "@/server/extraction/lab-parser";

describe("photo reading (on-server OCR)", () => {
  it("reads lab values from a photo without any external service", async () => {
    const res = await extractDocument(
      readFileSync("tests/fixtures/lab-report-photo.png"),
      "image/png",
      true,
    );
    expect(res.status).toBe("COMPLETED");
    expect(res.extractor).toBe("ocr");
    const codes = res.report!.candidates.map((c) => c.biomarkerCode);
    expect(codes).toEqual(expect.arrayContaining(["TSH", "HGB"]));
    // Photo-read values are always marked for double-checking.
    expect(res.report!.candidates.every((c) => c.confidence <= 0.6)).toBe(true);
    expect(res.report!.collectedAt).toBe("2026-08-14");
  }, 60_000);

  it("does not try to read HEIC photos it can't decode", async () => {
    const res = await extractDocument(Buffer.from("not really heic"), "image/heic", true);
    expect(res.status).toBe("UNSUPPORTED");
  });

  it("warns about a probably-missing decimal point", () => {
    expect(looksLikeMissingDecimal("52", 0.4, 4.5)).toBe(true); // 5.2 read as 52
    expect(looksLikeMissingDecimal("5.2", 0.4, 4.5)).toBe(false);
    expect(looksLikeMissingDecimal("212", null, 200)).toBe(false); // genuinely high, not 10×
    const r = parseLabText("TSH 52 H uIU/mL 0.4 - 4.5", { source: "ocr" });
    expect(r.candidates[0].warnings?.[0]).toMatch(/decimal point/);
    // Typical OCR damage: both value and range lose their decimal points.
    const both = parseLabText(
      "TSH 52 H ulU/mL 04-45\nHbAlc 5.9 % 40-5.6\nT3, total 110 ng/dL 80-200",
      { source: "ocr" },
    ).candidates;
    expect(both.find((c) => c.biomarkerCode === "TSH")!.warnings).toHaveLength(2);
    expect(both.find((c) => c.biomarkerCode === "HBA1C")!.warnings?.[0]).toMatch(
      /range looks wrong/,
    );
    expect(both.find((c) => c.biomarkerCode === "T3")!.warnings).toBeUndefined(); // T3 is reported in whole numbers
    // Clean PDF text is not second-guessed.
    expect(parseLabText("Platelet count 250 /µL 150 - 410").candidates[0].warnings).toBeUndefined();
  });
});

describe("database migrations", () => {
  it("are named so the initial migration always runs first", () => {
    const dirs = readdirSync("prisma/migrations")
      .filter((d) => /^\d{14}_/.test(d))
      .sort();
    expect(dirs[0]).toMatch(/_init$/);
  });
});
