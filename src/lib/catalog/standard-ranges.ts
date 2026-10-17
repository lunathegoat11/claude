/**
 * Standard adult reference ranges, from US government sources (mostly MedlinePlus, the
 * US National Library of Medicine at the NIH). Kosha uses these to mark a result Low,
 * Normal or High, instead of the range printed on the report, so results from different
 * labs are judged the same way.
 *
 * When there is no standard range (a test not listed here, a unit we can't convert, or a
 * person under 18, whose ranges differ), the range printed on the report is used instead.
 *
 * Every range names its source and links to it. Gathered October 2026. MedlinePlus notes
 * that normal ranges "may vary slightly among different laboratories".
 */
import { normUnit } from "./reference-guides";
import { GUIDE_DATA } from "./reference-guides-data";

interface Span {
  low: number | null;
  high: number | null;
}
export interface StandardRange {
  unit: string;
  /** Upper limits are "under" limits (e.g. total cholesterol under 200). */
  under?: boolean;
  /** Same for everyone. */
  all?: Span;
  male?: Span;
  female?: Span;
  /** Different from age 50 (ESR). */
  over50?: { male: Span; female: Span };
  source: string;
  url: string;
  note?: string;
  /** The same range in other units: value_in_unit = value * factor (+ offset). */
  convert?: { unit: string; factor: number; offset?: number }[];
}

/** Raise this when the ranges change, so saved results are re-checked. */
export const RANGE_VERSION = 3;

const MEDLINE = "MedlinePlus (US National Library of Medicine, NIH)";
const ency = (n: string) => `https://medlineplus.gov/ency/article/${n}.htm`;
const STATPEARLS = "NCBI Bookshelf (US National Library of Medicine, NIH)";
const span = (low: number | null, high: number | null): Span => ({ low, high });
const sexes = (m: [number | null, number | null], f: [number | null, number | null]) => ({
  male: span(...m),
  female: span(...f),
});

const COUNT_K = [
  { unit: "10^3/µL", factor: 0.001 },
  { unit: "10^9/L", factor: 0.001 },
];
const GLUCOSE = [{ unit: "mmol/L", factor: 0.0555 }];
const CHOL = [{ unit: "mmol/L", factor: 0.02586 }];
const BILI = [{ unit: "µmol/L", factor: 17.1 }];
const PROTEIN = [{ unit: "g/L", factor: 10 }];
const CHOLESTEROL_PAGE = "https://medlineplus.gov/cholesterollevelswhatyouneedtoknow.html";

export const STANDARD_RANGES: Record<string, StandardRange> = {
  // ── Blood count ──
  HGB: {
    unit: "g/dL",
    ...sexes([13.8, 17.2], [12.1, 15.1]),
    source: MEDLINE,
    url: ency("003645"),
    convert: [{ unit: "g/L", factor: 10 }],
  },
  HCT: { unit: "%", ...sexes([37, 48], [34, 43]), source: MEDLINE, url: ency("003646") },
  RBC: {
    unit: "million/µL",
    ...sexes([4.2, 5.7], [3.8, 5.1]),
    source: MEDLINE,
    url: ency("003644"),
    convert: [
      { unit: "10^6/µL", factor: 1 },
      { unit: "10^12/L", factor: 1 },
    ],
  },
  WBC: {
    unit: "/µL",
    all: span(4500, 11000),
    source: MEDLINE,
    url: ency("003643"),
    convert: COUNT_K,
  },
  PLT: {
    unit: "/µL",
    all: span(150000, 400000),
    source: MEDLINE,
    url: ency("003647"),
    convert: [...COUNT_K, { unit: "lakh/µL", factor: 0.00001 }],
  },
  MCV: { unit: "fL", all: span(79, 95), source: MEDLINE, url: ency("003648") },
  MCH: { unit: "pg", ...sexes([27, 33], [26, 33]), source: MEDLINE, url: ency("003648") },
  MCHC: { unit: "g/dL", all: span(32, 36), source: MEDLINE, url: ency("003648") },
  RDW: {
    unit: "%",
    all: span(11.5, 15),
    source: STATPEARLS,
    url: "https://www.ncbi.nlm.nih.gov/books/NBK604207/",
  },
  NEUT: { unit: "%", all: span(40, 60), source: MEDLINE, url: ency("003657") },
  LYMPH: { unit: "%", all: span(20, 40), source: MEDLINE, url: ency("003657") },
  MONO: { unit: "%", all: span(2, 8), source: MEDLINE, url: ency("003657") },
  EOS: { unit: "%", all: span(1, 4), source: MEDLINE, url: ency("003657") },
  BASO: { unit: "%", all: span(0.5, 1), source: MEDLINE, url: ency("003657") },
  ANC: {
    unit: "/µL",
    all: span(1500, 8000),
    source: STATPEARLS,
    url: "https://www.ncbi.nlm.nih.gov/books/NBK604207/",
    convert: COUNT_K,
  },
  ALC: {
    unit: "/µL",
    all: span(1000, 4800),
    source: "NHLBI (National Heart, Lung, and Blood Institute, NIH)",
    url: "https://www.nhlbi.nih.gov/health/lymphopenia/diagnosis",
    convert: COUNT_K,
  },
  AMC: {
    unit: "/µL",
    all: span(200, 1000),
    source: STATPEARLS,
    url: "https://www.ncbi.nlm.nih.gov/books/NBK604207/",
    convert: COUNT_K,
  },
  AEC: {
    unit: "/µL",
    under: true,
    all: span(null, 500),
    source: MEDLINE,
    url: ency("003649"),
    convert: COUNT_K,
  },
  ABC: {
    unit: "/µL",
    all: span(0, 200),
    source: STATPEARLS,
    url: "https://www.ncbi.nlm.nih.gov/books/NBK604207/",
    convert: COUNT_K,
  },
  RETIC: { unit: "%", all: span(0.77, 2.26), source: MEDLINE, url: ency("003637") },
  ESR: {
    unit: "mm/hr",
    under: true,
    ...sexes([null, 15], [null, 20]),
    over50: { male: span(null, 20), female: span(null, 30) },
    source: MEDLINE,
    url: ency("003638"),
  },

  // ── Blood sugar ──
  GLU_FASTING: {
    unit: "mg/dL",
    all: span(70, 99),
    source: MEDLINE,
    url: ency("003482"),
    convert: GLUCOSE,
  },
  GLU_PP: {
    unit: "mg/dL",
    under: true,
    all: span(null, 140),
    source: MEDLINE,
    url: ency("003466"),
    note: "2 hours after a meal or glucose drink: under 140",
    convert: GLUCOSE,
  },
  GLU_RANDOM: {
    unit: "mg/dL",
    under: true,
    all: span(null, 200),
    source: "NIDDK (National Institute of Diabetes and Digestive and Kidney Diseases, NIH)",
    url: "https://www.niddk.nih.gov/health-information/diabetes/overview/tests-diagnosis",
    note: "200 or more suggests diabetes",
    convert: GLUCOSE,
  },
  HBA1C: {
    unit: "%",
    under: true,
    all: span(null, 5.7),
    source: MEDLINE,
    url: "https://medlineplus.gov/lab-tests/hemoglobin-a1c-hba1c-test/",
    note: "5.7 to 6.4 is the prediabetes range; 6.5 or more, the diabetes range",
    convert: [{ unit: "mmol/mol", factor: 10.929, offset: -23.5 }],
  },

  // ── Lipids ──
  CHOL: {
    unit: "mg/dL",
    under: true,
    all: span(null, 200),
    source: MEDLINE,
    url: CHOLESTEROL_PAGE,
    convert: CHOL,
  },
  LDL: {
    unit: "mg/dL",
    under: true,
    all: span(null, 100),
    source: MEDLINE,
    url: CHOLESTEROL_PAGE,
    convert: CHOL,
  },
  HDL: {
    unit: "mg/dL",
    ...sexes([40, null], [50, null]),
    source: MEDLINE,
    url: "https://medlineplus.gov/hdlthegoodcholesterol.html",
    convert: CHOL,
  },
  TRIG: {
    unit: "mg/dL",
    under: true,
    all: span(null, 150),
    source: MEDLINE,
    url: CHOLESTEROL_PAGE,
    convert: [{ unit: "mmol/L", factor: 0.01129 }],
  },
  VLDL: { unit: "mg/dL", all: span(2, 30), source: MEDLINE, url: ency("003494"), convert: CHOL },
  NONHDL: {
    unit: "mg/dL",
    under: true,
    all: span(null, 130),
    source: MEDLINE,
    url: CHOLESTEROL_PAGE,
    convert: CHOL,
  },

  // ── Liver ──
  ALT: { unit: "U/L", all: span(4, 36), source: MEDLINE, url: ency("003473") },
  AST: { unit: "U/L", all: span(8, 33), source: MEDLINE, url: ency("003472") },
  ALP: { unit: "U/L", all: span(40, 129), source: MEDLINE, url: ency("003470") },
  GGT: { unit: "U/L", all: span(5, 40), source: MEDLINE, url: ency("003458") },
  LDH: { unit: "U/L", all: span(125, 220), source: MEDLINE, url: ency("003471") },
  BILI_T: {
    unit: "mg/dL",
    all: span(0.1, 1.2),
    source: MEDLINE,
    url: ency("003479"),
    convert: BILI,
  },
  BILI_D: {
    unit: "mg/dL",
    under: true,
    all: span(null, 0.3),
    source: MEDLINE,
    url: ency("003479"),
    convert: BILI,
  },
  TP: { unit: "g/dL", all: span(6.5, 8.1), source: MEDLINE, url: ency("003483"), convert: PROTEIN },
  ALB: {
    unit: "g/dL",
    all: span(3.4, 5.4),
    source: MEDLINE,
    url: ency("003480"),
    convert: PROTEIN,
  },

  // ── Kidney and salts ──
  CREAT: {
    unit: "mg/dL",
    ...sexes([0.7, 1.3], [0.5, 0.95]),
    source: MEDLINE,
    url: ency("003475"),
    convert: [{ unit: "µmol/L", factor: 88.4 }],
  },
  BUN: { unit: "mg/dL", all: span(6, 20), source: MEDLINE, url: ency("003474") },
  UREA: {
    unit: "mg/dL",
    all: span(12.8, 42.8),
    source: MEDLINE,
    url: ency("003474"),
    note: "MedlinePlus gives blood urea nitrogen (BUN) as 6 to 20; urea is BUN × 2.14",
    convert: [{ unit: "mmol/L", factor: 0.1665 }],
  },
  URIC: {
    unit: "mg/dL",
    ...sexes([4.0, 8.6], [3.0, 7.1]),
    source: MEDLINE,
    url: ency("003476"),
    convert: [{ unit: "µmol/L", factor: 59.48 }],
  },
  EGFR: {
    unit: "mL/min/1.73m²",
    all: span(60, null),
    source: "NIDDK (National Institute of Diabetes and Digestive and Kidney Diseases, NIH)",
    url: "https://www.niddk.nih.gov/health-information/kidney-disease/chronic-kidney-disease-ckd/tests-diagnosis",
  },
  NA: { unit: "mmol/L", all: span(135, 145), source: MEDLINE, url: ency("003481") },
  K: { unit: "mmol/L", all: span(3.7, 5.2), source: MEDLINE, url: ency("003484") },
  CL: { unit: "mmol/L", all: span(98, 107), source: MEDLINE, url: ency("003485") },
  BICARB: { unit: "mmol/L", all: span(23, 29), source: MEDLINE, url: ency("003469") },
  CA: {
    unit: "mg/dL",
    all: span(8.8, 10.3),
    source: MEDLINE,
    url: ency("003477"),
    convert: [{ unit: "mmol/L", factor: 0.2495 }],
  },
  ICA: {
    unit: "mg/dL",
    all: span(4.8, 5.6),
    source: MEDLINE,
    url: ency("003486"),
    convert: [{ unit: "mmol/L", factor: 0.2495 }],
  },
  PHOS: {
    unit: "mg/dL",
    all: span(2.8, 4.5),
    source: MEDLINE,
    url: ency("003478"),
    convert: [{ unit: "mmol/L", factor: 0.3229 }],
  },
  MG: {
    unit: "mg/dL",
    all: span(1.7, 2.2),
    source: MEDLINE,
    url: ency("003487"),
    convert: [{ unit: "mmol/L", factor: 0.4114 }],
  },
  AMYLASE: { unit: "U/L", all: span(40, 140), source: MEDLINE, url: ency("003464") },
  LIPASE: { unit: "U/L", all: span(0, 160), source: MEDLINE, url: ency("003465") },

  // ── Thyroid ──
  TSH: { unit: "µIU/mL", all: span(0.4, 4.8), source: MEDLINE, url: ency("003684") },
  T3: {
    unit: "ng/dL",
    all: span(78, 158),
    source: MEDLINE,
    url: ency("003687"),
    convert: [
      { unit: "nmol/L", factor: 0.01536 },
      { unit: "ng/mL", factor: 0.01 },
    ],
  },
  T4: {
    unit: "µg/dL",
    all: span(4, 11),
    source: "ATSDR (US Agency for Toxic Substances and Disease Registry), via NCBI Bookshelf",
    url: "https://www.ncbi.nlm.nih.gov/books/NBK598105/table/ch3.tab10/",
    convert: [{ unit: "nmol/L", factor: 12.87 }],
  },
  FT4: {
    unit: "ng/dL",
    all: span(0.8, 1.9),
    source: MEDLINE,
    url: ency("003517"),
    convert: [{ unit: "pmol/L", factor: 12.87 }],
  },
  FT3: {
    unit: "pg/mL",
    all: span(2.1, 4.4),
    source: MEDLINE,
    url: ency("003687"),
    note: "Published as 210 to 440 pg/dL",
    convert: [
      { unit: "pmol/L", factor: 1.536 },
      { unit: "pg/dL", factor: 100 },
    ],
  },

  // ── Iron, vitamins ──
  IRON: {
    unit: "µg/dL",
    ...sexes([59, 158], [37, 145]),
    source: MEDLINE,
    url: ency("003488"),
    convert: [{ unit: "µmol/L", factor: 0.179 }],
  },
  TIBC: {
    unit: "µg/dL",
    ...sexes([171, 505], [149, 492]),
    source: MEDLINE,
    url: ency("003489"),
    convert: [{ unit: "µmol/L", factor: 0.179 }],
  },
  TSAT: { unit: "%", ...sexes([20, 50], [15, 45]), source: MEDLINE, url: ency("003489") },
  FERRITIN: {
    unit: "ng/mL",
    ...sexes([30, 400], [13, 150]),
    source: MEDLINE,
    url: ency("003490"),
    convert: [{ unit: "µg/L", factor: 1 }],
  },
  TRANSFERRIN: {
    unit: "mg/dL",
    all: span(204, 360),
    source: STATPEARLS,
    url: "https://www.ncbi.nlm.nih.gov/books/NBK532928/",
  },
  VITD: {
    unit: "ng/mL",
    all: span(20, null),
    source: "Office of Dietary Supplements (NIH)",
    url: "https://ods.od.nih.gov/factsheets/VitaminD-HealthProfessional/",
    note: "20 or more is enough for most people; under 12 risks deficiency",
    convert: [{ unit: "nmol/L", factor: 2.496 }],
  },
  B12: {
    unit: "pg/mL",
    all: span(299, 1054),
    source: MEDLINE,
    url: ency("003705"),
    convert: [{ unit: "pmol/L", factor: 0.738 }],
  },
  FOLATE: {
    unit: "ng/mL",
    all: span(2.7, 17),
    source: MEDLINE,
    url: ency("003686"),
    convert: [{ unit: "nmol/L", factor: 2.266 }],
  },

  // ── Inflammation, clotting ──
  CRP: {
    unit: "mg/dL",
    under: true,
    all: span(null, 0.3),
    source: MEDLINE,
    url: ency("003356"),
    convert: [{ unit: "mg/L", factor: 10 }],
  },
  HSCRP: {
    unit: "mg/L",
    all: span(null, 3),
    source: MEDLINE,
    url: ency("003356"),
    note: "For heart risk: under 1 is low, 1 to 3 average, over 3 high",
    convert: [{ unit: "mg/dL", factor: 0.1 }],
  },
  PT: { unit: "sec", all: span(11, 13.5), source: MEDLINE, url: ency("003652") },
  INR: {
    unit: "ratio",
    all: span(0.8, 1.1),
    source: MEDLINE,
    url: ency("003652"),
    note: "People taking warfarin usually aim for 2 to 3",
  },
  APTT: { unit: "sec", all: span(25, 35), source: MEDLINE, url: ency("003653") },
  FIBRINOGEN: {
    unit: "mg/dL",
    all: span(200, 400),
    source: MEDLINE,
    url: ency("003650"),
    convert: [{ unit: "g/L", factor: 0.01 }],
  },
};

/**
 * India's national ranges, where an Indian public-health body has published one (ICMR
 * Standard Treatment Workflows, and Ministry of Health programmes and surveys). Used in
 * India when the report doesn't print a range. Sources and links are shared with the
 * chart guides in reference-guides-data.ts.
 */
const india = (
  code: string,
  r: Pick<StandardRange, "all" | "male" | "female" | "under" | "note">,
): [string, StandardRange] => {
  const g = GUIDE_DATA[code].india!;
  return [
    code,
    { unit: g.unit, source: g.source, url: g.url, convert: STANDARD_RANGES[code]?.convert, ...r },
  ];
};
export const INDIA_RANGES: Record<string, StandardRange> = Object.fromEntries([
  india("HGB", { ...sexes([13, null], [12, null]), note: "Below this is anaemia (WHO cut-off)" }),
  india("GLU_FASTING", { all: span(null, 99), note: "100 to 125 is the prediabetes range" }),
  india("GLU_PP", { all: span(null, 139), note: "140 to 199 is the prediabetes range" }),
  india("GLU_RANDOM", { under: true, all: span(null, 200) }),
  india("HBA1C", { all: span(null, 5.6), note: "5.7 to 6.4 is the prediabetes range" }),
  india("CHOL", { all: span(null, 199) }),
  india("LDL", { all: span(null, 99), note: "The target for people with diabetes" }),
  india("HDL", sexes([40, null], [50, null])),
  india("TRIG", { all: span(null, 149) }),
  india("VITD", { all: span(20, null), note: "12 to 19.9 is insufficient; under 12, deficient" }),
  india("B12", { all: span(203, null), note: "Below this is deficiency (WHO cut-off)" }),
]);

/** Which ranges to prefer: "INDIA" or "INTERNATIONAL" (US NIH and other US sources). */
export type RangeRegion = "INDIA" | "INTERNATIONAL";

/** India when the phone's time zone is India's; elsewhere, international. */
export function regionFor(choice: string | null | undefined, timezone?: string | null) {
  if (choice === "INDIA" || choice === "INTERNATIONAL") return choice;
  return timezone === "Asia/Kolkata" || timezone === "Asia/Calcutta" ? "INDIA" : "INTERNATIONAL";
}

/**
 * The range to judge a result by, or null to use the range printed on the report.
 *
 * In India: the report's own range first; if it has none, India's national range; if there
 * isn't one either, the US standard range. Elsewhere (or when the person chooses
 * international ranges): the US standard range, else the report's.
 */
export function chooseRange(
  code: string | null | undefined,
  unit: string | null | undefined,
  who: { sex?: string | null; dateOfBirth?: Date | null; on?: Date; region: RangeRegion },
  reportHasRange: boolean,
): AppliedRange | null {
  if (who.region === "INDIA") {
    if (reportHasRange) return null;
    return standardRangeFor(code, unit, who, INDIA_RANGES) ?? standardRangeFor(code, unit, who);
  }
  return standardRangeFor(code, unit, who);
}

export interface AppliedRange {
  low: number | null;
  high: number | null;
  under: boolean;
  /** In words, e.g. "70 – 99", "Under 200", "20 or more". */
  text: string;
  source: string;
  url: string;
  note?: string;
}

/** Whole years between two dates. */
function ageOn(dob: Date, on: Date) {
  let a = on.getUTCFullYear() - dob.getUTCFullYear();
  const m = on.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && on.getUTCDate() < dob.getUTCDate())) a--;
  return a;
}

const round = (v: number) => Number(v.toPrecision(4));

/**
 * The standard range for a test, in the result's unit, for this person; or null when there
 * isn't one (then the range printed on the report is used).
 *
 * If the person's sex isn't set, a sex-specific range uses the widest span (the lowest low
 * and the highest high), so only results outside both are marked.
 */
export function standardRangeFor(
  code: string | null | undefined,
  unit: string | null | undefined,
  who: { sex?: string | null; dateOfBirth?: Date | null; on?: Date } = {},
  table: Record<string, StandardRange> = STANDARD_RANGES,
): AppliedRange | null {
  const def = code ? table[code] : undefined;
  if (!def) return null;
  const on = who.on ?? new Date();
  const age = who.dateOfBirth ? ageOn(who.dateOfBirth, on) : null;
  if (age !== null && age < 18) return null; // children's ranges differ

  let s: Span | undefined;
  const set = age !== null && age >= 50 && def.over50 ? def.over50 : def;
  if (def.all) s = def.all;
  else if (who.sex === "MALE") s = set.male;
  else if (who.sex === "FEMALE") s = set.female;
  else if (set.male && set.female) {
    const lows = [set.male.low, set.female.low];
    const highs = [set.male.high, set.female.high];
    s = {
      low: lows.includes(null) ? null : Math.min(...(lows as number[])),
      high: highs.includes(null) ? null : Math.max(...(highs as number[])),
    };
  }
  if (!s) return null;

  let f = (v: number) => v;
  const u = normUnit(unit);
  if (u && u !== normUnit(def.unit)) {
    const c = def.convert?.find((x) => normUnit(x.unit) === u);
    if (!c) return null; // a unit we can't convert: use the report's range
    f = (v) => round(v * c.factor + (c.offset ?? 0));
  }
  const low = s.low === null ? null : f(s.low);
  const high = s.high === null ? null : f(s.high);
  const under = !!def.under;
  const text =
    low !== null && high !== null
      ? `${low} – ${high}`
      : high !== null
        ? `${under ? "Under" : "Up to"} ${high}`
        : `${low} or more`;
  return {
    low,
    high,
    under,
    text,
    source: def.source,
    url: def.url,
    note: def.note,
  };
}

/** Low, Normal or High against a standard range. */
export function flagAgainst(value: number | null, r: AppliedRange) {
  if (value === null) return "UNKNOWN" as const;
  if (r.low !== null && value < r.low) return "LOW" as const;
  if (r.high !== null && (r.under ? value >= r.high : value > r.high)) return "HIGH" as const;
  return "NORMAL" as const;
}

/** Short name of a range's source, for small labels ("NIH range"). */
export function shortSource(source: string) {
  if (/ICMR/.test(source)) return "ICMR";
  if (/Ministry of Health|National Nutrition Survey/.test(source)) return "Health Ministry";
  if (/ATSDR/.test(source)) return "CDC";
  if (/NIH|National Library of Medicine/.test(source)) return "NIH";
  return source;
}
