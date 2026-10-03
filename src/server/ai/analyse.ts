import { findBiomarkersInText } from "@/lib/catalog/biomarkers";
import type { Intent, QuestionAnalysis } from "./types";

/**
 * Pure, deterministic question analysis used to choose which slices of the
 * user's data are relevant. Kept free of I/O so it is easy to unit-test.
 */

const METRIC_TERMS: { key: string; terms: string[] }[] = [
  {
    key: "blood_glucose",
    terms: ["glucose", "sugar", "blood sugar", "glycemia", "glucometer", "fasting sugar"],
  },
  {
    key: "blood_pressure",
    terms: ["blood pressure", "bp", "systolic", "diastolic", "hypertension"],
  },
  { key: "heart_rate", terms: ["heart rate", "pulse", "bpm", "heartbeat"] },
  { key: "spo2", terms: ["spo2", "spo₂", "oxygen", "saturation", "oximeter"] },
  { key: "temperature", terms: ["temperature", "fever", "temp"] },
  { key: "weight", terms: ["weight", "kg", "bmi"] },
  { key: "height", terms: ["height"] },
  { key: "sleep", terms: ["sleep", "slept"] },
  { key: "exercise", terms: ["exercise", "workout", "walk", "walking", "activity", "steps"] },
];

const STOP = new Set(
  "a an and are as at be been by can could did do does for from had has have how i if in is it its me mention mentions mentioned my of on or over please show tell than that the their them there these this those to was were what when where which who why will with you your about any all been between change changed compare document documents file files last month months week weeks year years day days summarize summarise summary recent recently readings reading results result trend trends report reports test tests blood doctor visits visit".split(
    " ",
  ),
);

function has(text: string, ...patterns: (string | RegExp)[]) {
  return patterns.some((p) =>
    typeof p === "string" ? new RegExp(`\\b${p}\\b`, "i").test(text) : p.test(text),
  );
}

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

export function parseTimeRange(
  q: string,
  now: Date,
): { from: Date | null; to: Date; label: string } {
  const text = q.toLowerCase();
  const day = 86_400_000;
  let m = /(?:last|past|previous)\s+(\d{1,3})\s+(day|week|month|year)s?/.exec(text);
  if (m) {
    const n = Number(m[1]);
    const mult = m[2] === "day" ? 1 : m[2] === "week" ? 7 : m[2] === "month" ? 30 : 365;
    return {
      from: new Date(now.getTime() - n * mult * day),
      to: now,
      label: `the last ${n} ${m[2]}${n === 1 ? "" : "s"}`,
    };
  }
  m = /(?:last|past|previous)\s+(week|month|year|fortnight|quarter)/.exec(text);
  if (m) {
    const days = { week: 7, fortnight: 14, month: 30, quarter: 90, year: 365 }[m[1] as "week"];
    return { from: new Date(now.getTime() - days * day), to: now, label: `the last ${m[1]}` };
  }
  if (/\bthis month\b/.test(text)) {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now, label: "this month" };
  }
  if (/\bthis year\b/.test(text)) {
    return { from: new Date(now.getFullYear(), 0, 1), to: now, label: "this year" };
  }
  if (/\btoday\b/.test(text))
    return { from: new Date(now.getTime() - day), to: now, label: "today" };
  if (/\bthis week\b/.test(text))
    return { from: new Date(now.getTime() - 7 * day), to: now, label: "this week" };
  m = new RegExp(
    `since\\s+(${MONTHS.join("|")}|${MONTHS.map((x) => x.slice(0, 3)).join("|")})\\s*(\\d{4})?`,
  ).exec(text);
  if (m) {
    const idx = MONTHS.findIndex((x) => x.startsWith(m![1].slice(0, 3)));
    let year = m[2] ? Number(m[2]) : now.getFullYear();
    if (!m[2] && idx > now.getMonth()) year -= 1;
    return {
      from: new Date(year, idx, 1),
      to: now,
      label: `since ${MONTHS[idx][0].toUpperCase()}${MONTHS[idx].slice(1)} ${year}`,
    };
  }
  return { from: null, to: now, label: "all available records" };
}

export function analyseQuestion(question: string, now = new Date()): QuestionAnalysis {
  const q = question.toLowerCase();
  const intents = new Set<Intent>();

  const metricKeys = METRIC_TERMS.filter((m) =>
    m.terms.some((t) => has(q, t.replace(/[₂]/g, "₂"))),
  ).map((m) => m.key);
  const biomarkers = findBiomarkersInText(question);
  let biomarkerCodes = biomarkers.map((b) => b.code);
  // "glucose"/"sugar" also refers to lab glucose tests.
  if (metricKeys.includes("blood_glucose"))
    biomarkerCodes = [...new Set([...biomarkerCodes, "GLU_FASTING", "GLU_PP", "GLU_RANDOM"])];
  if (has(q, "cholesterol", "lipid", "lipids"))
    biomarkerCodes = [...new Set([...biomarkerCodes, "CHOL", "LDL", "HDL", "TRIG"])];
  if (has(q, "thyroid")) biomarkerCodes = [...new Set([...biomarkerCodes, "TSH", "T3", "T4"])];
  if (has(q, "liver", "lft"))
    biomarkerCodes = [...new Set([...biomarkerCodes, "ALT", "AST", "BILI_T", "ALB"])];
  if (has(q, "kidney", "kft", "renal"))
    biomarkerCodes = [...new Set([...biomarkerCodes, "CREAT", "UREA", "NA", "K"])];
  if (has(q, "cbc", "blood count"))
    biomarkerCodes = [...new Set([...biomarkerCodes, "HGB", "HCT", "RBC", "WBC", "PLT"])];

  const labWords = has(
    q,
    "lab",
    "labs",
    "blood test",
    "blood tests",
    "blood work",
    "bloodwork",
    "test",
    "tests",
    "report",
    "reports",
    "panel",
    "results",
  );
  const compareWords = has(
    q,
    "compare",
    "compared",
    "comparison",
    "changed",
    "change",
    "changes",
    "difference",
    "differences",
    "between",
    "vs",
    "versus",
    "different",
  );
  const trendWords = has(
    q,
    "trend",
    "trends",
    "over time",
    "history",
    "progress",
    "graph",
    "chart",
    "show me",
  );

  if (has(q, /questions?.{0,30}(ask|for).{0,20}doctor/, /ask my doctor/, /doctor.{0,20}questions?/))
    intents.add("DOCTOR_QUESTIONS");
  if (
    has(
      q,
      "document",
      "documents",
      "file",
      "files",
      "pdf",
      "uploaded",
      "scan",
      "scans",
      "mention",
      "mentions",
      "mentioned",
    )
  )
    intents.add("DOCUMENT_SEARCH");
  if (
    has(
      q,
      "doctor",
      "doctors",
      "visit",
      "visits",
      "consultation",
      "appointment",
      "checkup",
      "check-up",
      "hospital",
      "discharge",
      "surgery",
      "procedure",
      "vaccination",
      "vaccine",
      "prescription",
      "specialist",
    )
  ) {
    if (!intents.has("DOCTOR_QUESTIONS") || has(q, "visit", "visits")) intents.add("VISIT_SUMMARY");
  }
  if (
    has(
      q,
      "medication",
      "medications",
      "medicine",
      "medicines",
      "tablet",
      "tablets",
      "allergy",
      "allergies",
      "allergic",
      "condition",
      "conditions",
      "overview",
      "health summary",
    )
  )
    intents.add("HEALTH_SUMMARY");
  if (
    has(q, /what (is|are|does)\b/, "explain", "meaning", "mean", "stand for", "measure", "measures")
  )
    intents.add("EXPLAIN_TERM");

  if (compareWords && (labWords || biomarkerCodes.length)) intents.add("LAB_COMPARE");
  else if (biomarkerCodes.length && (trendWords || !metricKeys.length)) intents.add("LAB_TREND");
  if (labWords && !compareWords && !intents.has("DOCUMENT_SEARCH")) intents.add("LAB_SUMMARY");
  if (metricKeys.length) intents.add("MEASUREMENT_TREND");
  if (biomarkerCodes.length && metricKeys.length) intents.add("LAB_TREND");

  if (intents.size === 0) intents.add("GENERAL");

  const keywords = [
    ...METRIC_TERMS.filter((m) => metricKeys.includes(m.key)).flatMap((m) =>
      m.terms.filter((t) => t.length >= 3),
    ),
    ...biomarkers.flatMap((b) => [
      b.name.toLowerCase(),
      ...(b.shortName ? [b.shortName.toLowerCase()] : []),
    ]),
    ...q
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !STOP.has(w)),
  ];

  return {
    intents: [...intents],
    metricKeys,
    biomarkerCodes,
    range: parseTimeRange(q, now),
    keywords: [...new Set(keywords)].slice(0, 12),
  };
}
