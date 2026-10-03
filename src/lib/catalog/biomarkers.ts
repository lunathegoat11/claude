/**
 * Built-in biomarker catalogue.
 *
 * Used to recognise tests (including common Indian lab naming), group them into
 * panels, suggest units, and give plain-language descriptions of what a test
 * generally measures.
 *
 * IMPORTANT: this catalogue deliberately contains NO reference ranges.
 * Ranges vary by laboratory, method, age, sex and other factors, so they are
 * stored on each individual LabResult exactly as printed on the report.
 *
 * Any test not in this list can still be recorded as a free-text test.
 */
export interface BiomarkerDef {
  code: string;
  name: string;
  shortName?: string;
  category: BiomarkerCategory;
  units: string[];
  decimals: number;
  aliases: string[];
  description: string;
}

export type BiomarkerCategory =
  | "CBC"
  | "METABOLIC"
  | "DIABETES"
  | "LIPID"
  | "LIVER"
  | "KIDNEY"
  | "THYROID"
  | "VITAMINS"
  | "OTHER";

export const CATEGORY_LABELS: Record<BiomarkerCategory, string> = {
  CBC: "Complete blood count",
  METABOLIC: "Metabolic & electrolytes",
  DIABETES: "Blood sugar",
  LIPID: "Lipid profile",
  LIVER: "Liver function",
  KIDNEY: "Kidney function",
  THYROID: "Thyroid profile",
  VITAMINS: "Vitamins & minerals",
  OTHER: "Other tests",
};

export const PANEL_TEMPLATES: {
  key: string;
  name: string;
  category: BiomarkerCategory;
  codes: string[];
}[] = [
  {
    key: "cbc",
    name: "Complete Blood Count (CBC)",
    category: "CBC",
    codes: ["HGB", "HCT", "RBC", "WBC", "PLT"],
  },
  {
    key: "sugar",
    name: "Blood Sugar Profile",
    category: "DIABETES",
    codes: ["GLU_FASTING", "GLU_PP", "HBA1C"],
  },
  { key: "lipid", name: "Lipid Profile", category: "LIPID", codes: ["CHOL", "LDL", "HDL", "TRIG"] },
  {
    key: "lft",
    name: "Liver Function Test (LFT)",
    category: "LIVER",
    codes: ["ALT", "AST", "BILI_T", "ALB"],
  },
  {
    key: "kft",
    name: "Kidney Function Test (KFT)",
    category: "KIDNEY",
    codes: ["CREAT", "UREA", "NA", "K"],
  },
  { key: "thyroid", name: "Thyroid Profile", category: "THYROID", codes: ["TSH", "T3", "T4"] },
];

export const BIOMARKERS: BiomarkerDef[] = [
  // CBC
  {
    code: "HGB",
    name: "Hemoglobin",
    shortName: "Hb",
    category: "CBC",
    units: ["g/dL"],
    decimals: 1,
    aliases: ["hemoglobin", "haemoglobin", "hb", "hgb"],
    description:
      "The iron-containing protein in red blood cells that carries oxygen around the body.",
  },
  {
    code: "HCT",
    name: "Hematocrit",
    shortName: "HCT",
    category: "CBC",
    units: ["%"],
    decimals: 1,
    aliases: ["hematocrit", "haematocrit", "hct", "pcv", "packed cell volume"],
    description: "The percentage of your blood volume made up of red blood cells.",
  },
  {
    code: "RBC",
    name: "Red blood cell count",
    shortName: "RBC",
    category: "CBC",
    units: ["million/µL", "10^6/µL"],
    decimals: 2,
    aliases: ["rbc", "rbc count", "red blood cell count", "total rbc count", "erythrocyte count"],
    description: "The number of red blood cells in a volume of blood.",
  },
  {
    code: "WBC",
    name: "White blood cell count",
    shortName: "WBC",
    category: "CBC",
    units: ["/µL", "10^3/µL", "cells/cumm"],
    decimals: 0,
    aliases: [
      "wbc",
      "wbc count",
      "total leucocyte count",
      "tlc",
      "total wbc count",
      "white blood cell count",
      "leukocyte count",
    ],
    description: "The number of white blood cells, which are part of the immune system.",
  },
  {
    code: "PLT",
    name: "Platelet count",
    shortName: "PLT",
    category: "CBC",
    units: ["lakh/µL", "10^3/µL", "/µL"],
    decimals: 2,
    aliases: ["platelet count", "platelets", "plt"],
    description: "The number of platelets, small cell fragments that help blood clot.",
  },

  // Metabolic / diabetes
  {
    code: "GLU_FASTING",
    name: "Glucose, fasting",
    shortName: "FBS",
    category: "DIABETES",
    units: ["mg/dL", "mmol/L"],
    decimals: 0,
    aliases: [
      "fasting blood sugar",
      "fbs",
      "glucose fasting",
      "fasting glucose",
      "fasting plasma glucose",
      "fpg",
      "blood sugar fasting",
      "glucose, fasting",
      "glucose - fasting",
      "glucose (fasting)",
      "plasma glucose fasting",
      "plasma glucose - fasting",
    ],
    description: "Blood sugar measured after not eating for at least 8 hours.",
  },
  {
    code: "GLU_PP",
    name: "Glucose, post-prandial",
    shortName: "PPBS",
    category: "DIABETES",
    units: ["mg/dL", "mmol/L"],
    decimals: 0,
    aliases: [
      "post prandial blood sugar",
      "ppbs",
      "glucose pp",
      "post-prandial glucose",
      "glucose post prandial",
      "blood sugar pp",
      "glucose, post-prandial",
      "glucose - pp",
      "glucose (pp)",
      "plasma glucose pp",
      "glucose - post prandial",
    ],
    description: "Blood sugar measured about two hours after a meal.",
  },
  {
    code: "GLU_RANDOM",
    name: "Glucose, random",
    shortName: "RBS",
    category: "DIABETES",
    units: ["mg/dL", "mmol/L"],
    decimals: 0,
    aliases: ["random blood sugar", "rbs", "glucose random", "random glucose"],
    description: "Blood sugar measured at any time regardless of meals.",
  },
  {
    code: "HBA1C",
    name: "HbA1c",
    shortName: "HbA1c",
    category: "DIABETES",
    units: ["%", "mmol/mol"],
    decimals: 1,
    aliases: [
      "hba1c",
      "glycated hemoglobin",
      "glycosylated hemoglobin",
      "glycated haemoglobin",
      "a1c",
      "hb a1c",
      "hemoglobin a1c",
      "haemoglobin a1c",
      "glycosylated haemoglobin",
      "hbalc",
      "hbaic",
      "hb alc",
    ],
    description: "Reflects average blood sugar over roughly the previous 2–3 months.",
  },
  {
    code: "CREAT",
    name: "Creatinine",
    category: "KIDNEY",
    units: ["mg/dL", "µmol/L"],
    decimals: 2,
    aliases: ["creatinine", "serum creatinine", "s. creatinine", "creatinine serum"],
    description:
      "A waste product filtered by the kidneys; commonly used to assess kidney function.",
  },
  {
    code: "UREA",
    name: "Urea",
    category: "KIDNEY",
    units: ["mg/dL"],
    decimals: 1,
    aliases: ["urea", "blood urea", "serum urea", "bun", "blood urea nitrogen"],
    description: "A waste product from protein breakdown that is cleared by the kidneys.",
  },
  {
    code: "NA",
    name: "Sodium",
    shortName: "Na⁺",
    category: "METABOLIC",
    units: ["mmol/L", "mEq/L"],
    decimals: 0,
    aliases: ["sodium", "serum sodium", "na", "na+"],
    description: "An electrolyte important for fluid balance and nerve and muscle function.",
  },
  {
    code: "K",
    name: "Potassium",
    shortName: "K⁺",
    category: "METABOLIC",
    units: ["mmol/L", "mEq/L"],
    decimals: 1,
    aliases: ["potassium", "serum potassium", "k", "k+"],
    description: "An electrolyte important for heart rhythm and muscle function.",
  },

  // Lipid
  {
    code: "CHOL",
    name: "Total cholesterol",
    category: "LIPID",
    units: ["mg/dL", "mmol/L"],
    decimals: 0,
    aliases: [
      "total cholesterol",
      "cholesterol",
      "cholesterol total",
      "serum cholesterol",
      "cholesterol, total",
    ],
    description: "The total amount of cholesterol carried in the blood.",
  },
  {
    code: "LDL",
    name: "LDL cholesterol",
    shortName: "LDL",
    category: "LIPID",
    units: ["mg/dL", "mmol/L"],
    decimals: 0,
    aliases: [
      "ldl",
      "ldl cholesterol",
      "ldl-c",
      "ldl cholesterol direct",
      "low density lipoprotein",
    ],
    description: 'Low-density lipoprotein, often referred to as "bad" cholesterol.',
  },
  {
    code: "HDL",
    name: "HDL cholesterol",
    shortName: "HDL",
    category: "LIPID",
    units: ["mg/dL", "mmol/L"],
    decimals: 0,
    aliases: ["hdl", "hdl cholesterol", "hdl-c", "high density lipoprotein"],
    description: 'High-density lipoprotein, often referred to as "good" cholesterol.',
  },
  {
    code: "TRIG",
    name: "Triglycerides",
    category: "LIPID",
    units: ["mg/dL", "mmol/L"],
    decimals: 0,
    aliases: ["triglycerides", "triglyceride", "tg", "serum triglycerides"],
    description: "A type of fat in the blood; levels are influenced by recent meals.",
  },

  // Liver
  {
    code: "ALT",
    name: "ALT (SGPT)",
    shortName: "ALT",
    category: "LIVER",
    units: ["U/L", "IU/L"],
    decimals: 0,
    aliases: [
      "alt",
      "sgpt",
      "alt (sgpt)",
      "sgpt (alt)",
      "alanine aminotransferase",
      "alanine transaminase",
    ],
    description: "A liver enzyme; it can rise when liver cells are irritated or injured.",
  },
  {
    code: "AST",
    name: "AST (SGOT)",
    shortName: "AST",
    category: "LIVER",
    units: ["U/L", "IU/L"],
    decimals: 0,
    aliases: [
      "ast",
      "sgot",
      "ast (sgot)",
      "sgot (ast)",
      "aspartate aminotransferase",
      "aspartate transaminase",
    ],
    description: "An enzyme found in the liver, heart and muscles.",
  },
  {
    code: "BILI_T",
    name: "Bilirubin, total",
    shortName: "T. Bil",
    category: "LIVER",
    units: ["mg/dL", "µmol/L"],
    decimals: 2,
    aliases: [
      "bilirubin total",
      "total bilirubin",
      "bilirubin",
      "serum bilirubin total",
      "bilirubin, total",
      "s. bilirubin",
    ],
    description:
      "A yellow pigment produced when red blood cells break down and processed by the liver.",
  },
  {
    code: "ALB",
    name: "Albumin",
    category: "LIVER",
    units: ["g/dL", "g/L"],
    decimals: 1,
    aliases: ["albumin", "serum albumin", "s. albumin"],
    description: "The main protein made by the liver; helps keep fluid in blood vessels.",
  },

  // Thyroid
  {
    code: "TSH",
    name: "TSH",
    category: "THYROID",
    units: ["µIU/mL", "mIU/L"],
    decimals: 2,
    aliases: [
      "tsh",
      "thyroid stimulating hormone",
      "tsh ultrasensitive",
      "ultrasensitive tsh",
      "tsh (ultrasensitive)",
    ],
    description:
      "Thyroid-stimulating hormone, released by the pituitary gland to regulate the thyroid.",
  },
  {
    code: "T3",
    name: "T3, total",
    shortName: "T3",
    category: "THYROID",
    units: ["ng/dL", "nmol/L"],
    decimals: 0,
    aliases: ["t3", "total t3", "t3 total", "triiodothyronine", "t3, total"],
    description: "Triiodothyronine, one of the thyroid hormones.",
  },
  {
    code: "T4",
    name: "T4, total",
    shortName: "T4",
    category: "THYROID",
    units: ["µg/dL", "nmol/L"],
    decimals: 1,
    aliases: ["t4", "total t4", "t4 total", "thyroxine", "t4, total"],
    description: "Thyroxine, the main hormone produced by the thyroid gland.",
  },

  // Vitamins (common in Indian check-up packages)
  {
    code: "VITD",
    name: "Vitamin D (25-OH)",
    shortName: "Vit D",
    category: "VITAMINS",
    units: ["ng/mL", "nmol/L"],
    decimals: 1,
    aliases: [
      "vitamin d",
      "25-oh vitamin d",
      "25 hydroxy vitamin d",
      "vit d",
      "vitamin d total",
      "25(oh) vitamin d",
    ],
    description: "A measure of vitamin D stored in the body.",
  },
  {
    code: "B12",
    name: "Vitamin B12",
    shortName: "B12",
    category: "VITAMINS",
    units: ["pg/mL", "pmol/L"],
    decimals: 0,
    aliases: ["vitamin b12", "b12", "cyanocobalamin", "vit b12"],
    description: "A vitamin needed to make red blood cells and maintain nerves.",
  },
];

const byCode = new Map(BIOMARKERS.map((b) => [b.code, b]));

export function getBiomarker(code: string | null | undefined): BiomarkerDef | undefined {
  return code ? byCode.get(code) : undefined;
}

function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9+ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const aliasIndex: { alias: string; code: string }[] = BIOMARKERS.flatMap((b) =>
  [b.name, b.shortName ?? "", ...b.aliases]
    .filter(Boolean)
    .map((a) => ({ alias: norm(a), code: b.code })),
).sort((a, b) => b.alias.length - a.alias.length);

/** Match a free-text test name (e.g. "S. Creatinine") to a catalogue code. */
export function matchBiomarker(testName: string): BiomarkerDef | undefined {
  const n = norm(testName);
  if (!n) return undefined;
  const exact = aliasIndex.find((a) => a.alias === n);
  if (exact) return byCode.get(exact.code);
  return undefined;
}

/** Find catalogue biomarkers mentioned anywhere in a piece of text (e.g. a question). */
export function findBiomarkersInText(text: string): BiomarkerDef[] {
  const n = ` ${norm(text)} `;
  const found = new Map<string, BiomarkerDef>();
  for (const { alias, code } of aliasIndex) {
    if (alias.length < 2) continue;
    if (n.includes(` ${alias} `)) found.set(code, byCode.get(code)!);
  }
  return [...found.values()];
}
