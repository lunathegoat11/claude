import { describe, expect, it } from "vitest";
import {
  BIOMARKERS,
  CATEGORY_ORDER,
  categoriesOf,
  getBiomarker,
  matchBiomarker,
  qualitativeFlag,
} from "@/lib/catalog/biomarkers";
import { groupByCategory } from "@/lib/lab-groups";
import { parseLabText } from "@/server/extraction/lab-parser";

describe("categories", () => {
  it("follow the order of the clinical pathology list", () => {
    expect(CATEGORY_ORDER).toEqual([
      "CBC",
      "CBC_MORPHOLOGY",
      "SUGAR",
      "LIPID",
      "VITAMINS",
      "HORMONES",
      "IRON",
      "LIVER",
      "KIDNEY",
      "ELECTROLYTES",
      "MINERALS",
      "OTHER",
      "CLOTTING",
      "HEART",
      "URINE",
      "MALARIA",
      "TYPHOID",
      "DENGUE",
    ]);
    for (const b of BIOMARKERS) expect(CATEGORY_ORDER).toContain(b.category);
  });

  it("put each listed test in its category, hs-CRP in both Other and Heart", () => {
    const where: Record<string, string> = {
      ABC: "CBC",
      CPEPTIDE: "SUGAR",
      CHOL_HDL: "LIPID",
      E2: "HORMONES",
      TSAT: "IRON",
      AG_RATIO: "LIVER",
      BUN_CREAT: "KIDNEY",
      CL: "ELECTROLYTES",
      PHOS: "MINERALS",
      URIC: "OTHER",
      PSA: "OTHER",
      DDIMER: "CLOTTING",
      MRPROANP: "HEART",
      U_HCAST: "URINE",
      MAL_PCR: "MALARIA",
      TYPHIDOT: "TYPHOID",
      DENGUE_NS1: "DENGUE",
    };
    for (const [code, cat] of Object.entries(where)) expect(getBiomarker(code)?.category).toBe(cat);
    expect(categoriesOf(getBiomarker("HSCRP"))).toEqual(["OTHER", "HEART"]);
  });

  it("lists a report's tests by category, alphabetically within each", () => {
    const rows = ["TSH", "WBC", "HGB", "T3", "ALT", "ABC", "AST"].map((code) => ({
      biomarkerCode: code,
      testName: getBiomarker(code)!.name,
    }));
    const groups = groupByCategory([...rows, { biomarkerCode: null, testName: "Zinc" }]);
    expect(groups.map((g) => [g.category, g.rows.map((r) => r.testName)])).toEqual([
      ["CBC", ["Absolute basophil count", "Hemoglobin", "White blood cell count"]],
      ["HORMONES", ["T3, total", "TSH"]],
      ["LIVER", ["ALT (SGPT)", "AST (SGOT)"]],
      ["OTHER", ["Zinc"]],
    ]);
  });
});

describe("urine and word results", () => {
  it("reads a urine section without mixing it up with blood tests", () => {
    const r = parseLabText(
      [
        "HAEMATOLOGY",
        "Haemoglobin 13.5 g/dL 13.0 - 17.0",
        "RBC Count 4.8 million/cumm 4.5 - 5.5",
        "URINE ROUTINE EXAMINATION",
        "Colour Pale yellow",
        "Appearance Clear",
        "Specific Gravity 1.020 1.005 - 1.030",
        "pH 6.0 4.6 - 8.0",
        "Glucose Nil Nil",
        "Protein Trace Nil",
        "Pus Cells 2-4 /hpf 0 - 5",
        "RBC Nil /hpf",
      ].join("\n"),
    );
    const by = Object.fromEntries(r.candidates.map((c) => [c.biomarkerCode, c.value]));
    expect(by).toMatchObject({
      HGB: "13.5",
      RBC: "4.8",
      U_COLOR: "Pale yellow",
      U_APPEAR: "Clear",
      U_SG: "1.020",
      U_PH: "6.0",
      U_GLU: "Nil",
      U_PROT: "Trace",
      U_WBC: "2-4",
      U_RBC: "Nil",
    });
    expect(by.GLU_FASTING).toBeUndefined();
  });

  it("reads rapid tests and marks positive results", () => {
    const r = parseLabText(
      [
        "SEROLOGY",
        "Dengue NS1 Antigen Negative",
        "Malaria Antigen Positive",
        "Widal Test 1:160",
      ].join("\n"),
    );
    const by = Object.fromEntries(r.candidates.map((c) => [c.biomarkerCode, c.value]));
    expect(by).toMatchObject({ DENGUE_NS1: "Negative", MAL_RDT: "Positive", WIDAL: "1:160" });
    expect(qualitativeFlag(getBiomarker("MAL_RDT"), "Positive")).toBe("ABNORMAL");
    expect(qualitativeFlag(getBiomarker("DENGUE_NS1"), "Negative")).toBe("NORMAL");
    expect(qualitativeFlag(getBiomarker("U_PROT"), "2+")).toBe("ABNORMAL");
    expect(qualitativeFlag(getBiomarker("U_GLU"), "Nil")).toBe("NORMAL");
    expect(qualitativeFlag(getBiomarker("WIDAL"), "1:160")).toBeNull();
  });

  it("only treats ambiguous urine names as urine inside a urine report", () => {
    expect(matchBiomarker("Glucose")?.code).not.toBe("U_GLU");
    expect(matchBiomarker("Glucose", { urine: true })?.code).toBe("U_GLU");
    expect(matchBiomarker("Pus cells")?.code).toBeUndefined();
  });
});
