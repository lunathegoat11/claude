import {
  BIOMARKERS,
  CATEGORY_LABELS,
  matchBiomarker,
  type BiomarkerCategory,
  type BiomarkerDef,
} from "@/lib/catalog/biomarkers";
import { parseReferenceRange } from "@/lib/lab-range";

/**
 * Heuristic, line-based parser for text extracted from lab reports.
 *
 * It only *proposes* candidate values. Every candidate is shown to the user
 * for confirmation/correction before anything is saved.
 */
export interface LabCandidate {
  testName: string;
  biomarkerCode: string | null;
  value: string;
  unit: string | null;
  refText: string | null;
  refLow: number | null;
  refHigh: number | null;
  labFlag: "LOW" | "HIGH" | null;
  /** 0–1. Lower when the unit or range could not be found. */
  confidence: number;
  /** Specific reasons to double-check this value, e.g. a likely missing decimal point. */
  warnings?: string[];
  sourceLine: string;
}

export interface ParsedReport {
  candidates: LabCandidate[];
  collectedAt: string | null; // YYYY-MM-DD
  labName: string | null;
  /** A short title for the report, e.g. "Complete blood count". */
  reportName: string;
}

const UNIT_PATTERN =
  "(mg\\/dl|mg\\/dL|g\\/dl|g\\/dL|g\\/l|mmol\\/l|mmol\\/L|mmol\\/mol|meq\\/l|mEq\\/L|u\\/l|U\\/L|iu\\/l|IU\\/L|µiu\\/ml|uiu\\/ml|µIU\\/mL|uIU\\/mL|miu\\/l|mIU\\/L|ng\\/dl|ng\\/dL|ng\\/ml|ng\\/mL|pg\\/ml|pg\\/mL|µg\\/dl|ug\\/dl|µg\\/dL|ug\\/dL|nmol\\/l|nmol\\/L|pmol\\/l|pmol\\/L|µmol\\/l|umol\\/l|µmol\\/L|umol\\/L|million\\/µl|million\\/ul|million\\/cumm|mill\\/cumm|lakh\\/µl|lakh\\/ul|lakhs\\/cumm|lakh\\/cumm|10\\^3\\/µl|10\\^3\\/ul|10\\^6\\/µl|10\\^6\\/ul|thou\\/ul|\\/cumm|cells\\/cumm|\\/µl|\\/ul|%|fl|pg)";

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const ALIASES: { re: RegExp; def: BiomarkerDef; alias: string }[] = BIOMARKERS.flatMap((def) =>
  [def.name, def.shortName ?? "", ...def.aliases]
    .filter((a) => a && a.length >= 2)
    .map((alias) => ({
      alias,
      def,
      // Alias at line start, followed by a separator (space, colon, bracket, dot).
      re: new RegExp(`^\\s*${escapeRe(alias)}(?=[\\s:(\\[.,-]|$)`, "i"),
    })),
).sort((a, b) => b.alias.length - a.alias.length);

function normaliseUnit(u: string | undefined | null): string | null {
  if (!u) return null;
  const map: Record<string, string> = {
    "mg/dl": "mg/dL",
    "g/dl": "g/dL",
    "mmol/l": "mmol/L",
    "u/l": "U/L",
    "iu/l": "IU/L",
    "uiu/ml": "µIU/mL",
    "µiu/ml": "µIU/mL",
    "ng/dl": "ng/dL",
    "ng/ml": "ng/mL",
    "pg/ml": "pg/mL",
    "ug/dl": "µg/dL",
    "µg/dl": "µg/dL",
    "meq/l": "mEq/L",
    "million/ul": "million/µL",
    "million/µl": "million/µL",
    "million/cumm": "million/µL",
    "mill/cumm": "million/µL",
    "lakh/ul": "lakh/µL",
    "lakh/µl": "lakh/µL",
    "lakhs/cumm": "lakh/µL",
    "lakh/cumm": "lakh/µL",
    "/cumm": "/µL",
    "cells/cumm": "/µL",
    "/ul": "/µL",
    "/µl": "/µL",
    "10^3/ul": "10^3/µL",
    "10^6/ul": "10^6/µL",
    "thou/ul": "10^3/µL",
    "nmol/l": "nmol/L",
    "pmol/l": "pmol/L",
    "umol/l": "µmol/L",
    "µmol/l": "µmol/L",
    "miu/l": "mIU/L",
  };
  return map[u.toLowerCase()] ?? u;
}

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

/** Find a collection/report date (Indian dd/mm/yyyy or dd-Mon-yyyy formats). */
export function findReportDate(text: string): string | null {
  const lines = text.split(/\r?\n/);
  const labelled = lines.filter((l) => /(collect|sample|drawn|report|registered|date)/i.test(l));
  for (const l of [...labelled, ...lines]) {
    let m = /(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/.exec(l);
    if (m) {
      const [, dd, mm, yyyy] = m;
      if (+mm >= 1 && +mm <= 12 && +dd >= 1 && +dd <= 31)
        return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    }
    m = /(\d{1,2})[\s-]([A-Za-z]{3})[a-z]*[\s,-]+(\d{4})/.exec(l);
    if (m && MONTHS[m[2].toLowerCase()]) {
      return `${m[3]}-${String(MONTHS[m[2].toLowerCase()]).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    }
  }
  return null;
}

function findLabName(text: string): string | null {
  const first = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 6);
  const hit = first.find(
    (l) =>
      /(lab|labs|laborator|diagnostic|pathology|hospital|clinic|healthcare)/i.test(l) &&
      l.length < 80,
  );
  return hit ?? null;
}

/**
 * Detect a value that is ~10× or ~100× outside the printed range when a decimal point
 * could have been lost (common with OCR: "5.2" read as "52").
 */
export function looksLikeMissingDecimal(value: string, low: number | null, high: number | null) {
  if (value.includes(".") || high === null) return false;
  const v = Number(value);
  if (!Number.isFinite(v) || v <= high * 4) return false;
  const lo = low ?? 0;
  return [10, 100].some((d) => v / d >= lo * 0.5 && v / d <= high * 2);
}

/** Reasons a parsed value deserves a closer look. Never changes the value itself. */
export function candidateWarnings(
  value: string,
  low: number | null,
  high: number | null,
  refText: string | null,
  usualDecimals: number,
  fromPhoto: boolean,
): { warnings?: string[] } {
  const w: string[] = [];
  if (
    looksLikeMissingDecimal(value, low, high) ||
    (fromPhoto && usualDecimals > 0 && !value.includes(".") && Number(value) >= 10)
  ) {
    w.push("This value may be missing a decimal point — check the report.");
  }
  if (low !== null && high !== null && low > high) {
    w.push("The reference range looks wrong (the low number is higher than the high number).");
  } else if (refText && /(^|[^\d.])0\d/.test(refText)) {
    w.push("The reference range may be missing a decimal point.");
  }
  return w.length ? { warnings: w } : {};
}

/** Words that start lines which carry numbers but are not test results. */
const NOT_A_TEST =
  /^(patient|name|age|sex|gender|date|time|page|ref(erred)?\.?\s*by|ref\.?\s*no|reg|sample|id\b|no\.?\b|mobile|phone|tel|pin|address|dr\.?\b|doctor|consultant|collected|received|reported|printed|barcode|uhid|lab\s*no|bill|amount|rs\.?\b|signature|method|specimen|interval|report|visit|ward|bed|ip\s*no|op\s*no|test\s*name|investigation|parameter|result|unit|biological|reference)/i;

/** Remove list markers like "1.", "2)", "*", "•" at the start of a line. */
function stripMarker(line: string) {
  return line.replace(/^\s*(?:\d{1,2}[.)]\s+|[*•·]\s*|[-–]\s+)/, "");
}

const RANGE_RE =
  /((?:<|>|<=|>=|≤|≥|up\s*to|upto)\s*\d+(?:\.\d+)?|\d+(?:\.\d+)?\s*(?:-|–|to)\s*\d+(?:\.\d+)?)/i;

interface RowParts {
  value: string;
  labFlag: "LOW" | "HIGH" | null;
  unit: string | null;
  refText: string | null;
}

/** Parse what follows a test name: value, optional H/L flag, unit and reference range. */
function parseRow(rest: string, unitRe: RegExp): RowParts | null {
  rest = rest.replace(/^\s*(\([^)]*\)|\[[^\]]*\])\s*/, "").replace(/^[\s:.-]+/, "");
  const valueMatch = /^(\d+(?:[.,]\d+)?)/.exec(rest);
  if (!valueMatch) return null;
  const value = valueMatch[1].replace(",", ".");
  rest = rest.slice(valueMatch[0].length).trim();

  let labFlag: "LOW" | "HIGH" | null = null;
  const flagMatch = /^(H|L|High|Low|\*)\b\s*/i.exec(rest);
  if (flagMatch) {
    const f = flagMatch[1].toLowerCase();
    labFlag = f.startsWith("h") ? "HIGH" : f.startsWith("l") ? "LOW" : null;
    rest = rest.slice(flagMatch[0].length);
  }

  let unit: string | null = null;
  const u = unitRe.exec(rest);
  if (u) {
    unit = normaliseUnit(u[1]);
    rest = rest.slice(u[0].length).trim();
  }

  const refMatch = RANGE_RE.exec(rest);
  const refText = refMatch ? refMatch[1].replace(/\s+/g, " ").trim() : null;
  if (!unit) {
    // Some reports print the unit after the range.
    const tail = rest.slice(refMatch ? (refMatch.index ?? 0) + refMatch[0].length : 0).trim();
    const u2 = unitRe.exec(tail);
    if (u2) unit = normaliseUnit(u2[1]);
  }
  return { value, labFlag, unit, refText };
}

/** Title for a report from the kinds of tests found on it. */
export function reportNameFor(candidates: { biomarkerCode: string | null }[]): string {
  const counts = new Map<BiomarkerCategory, number>();
  for (const c of candidates) {
    const def = c.biomarkerCode ? BIOMARKERS.find((b) => b.code === c.biomarkerCode) : undefined;
    if (def && def.category !== "OTHER")
      counts.set(def.category, (counts.get(def.category) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => CATEGORY_LABELS[c]);
  if (!top.length) return "Lab report";
  if (top.length === 1) return top[0];
  if (top.length === 2) return `${top[0]} & ${top[1].toLowerCase()}`;
  return "Lab report";
}

export function parseLabText(text: string, opts: { source?: "text" | "ocr" } = {}): ParsedReport {
  const candidates: LabCandidate[] = [];
  const seen = new Set<string>();
  const unitRe = new RegExp(`^${UNIT_PATTERN}(?![a-z])`, "i");
  const fromPhoto = opts.source === "ocr";
  const lines = text.split(/\r?\n/).map((l) => stripMarker(l.replace(/\s+/g, " ").trim()));

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length < 3 || line.length > 200) continue;
    const hit = ALIASES.find((a) => a.re.test(line));

    if (hit) {
      const afterName = line.replace(hit.re, "");
      // Tables sometimes put the value on the next line.
      let row = parseRow(afterName, unitRe);
      let sourceLine = line;
      if (!row && i + 1 < lines.length && /^\d/.test(lines[i + 1])) {
        row = parseRow(lines[i + 1], unitRe);
        sourceLine = `${line} ${lines[i + 1]}`;
      }
      if (!row) continue;
      const key = hit.def.code;
      if (seen.has(key)) continue;
      seen.add(key);
      const { low, high } = parseReferenceRange(row.refText);
      let confidence = 0.5;
      if (row.unit) confidence += 0.25;
      if (row.refText) confidence += 0.2;
      if (row.unit && !hit.def.units.some((x) => x.toLowerCase() === row.unit!.toLowerCase()))
        confidence -= 0.2;
      candidates.push({
        testName: hit.def.name,
        biomarkerCode: hit.def.code,
        value: row.value,
        unit: row.unit ?? hit.def.units[0] ?? null,
        refText: row.refText,
        refLow: low,
        refHigh: high,
        labFlag: row.labFlag,
        confidence: Math.max(0.1, Math.min(fromPhoto ? 0.6 : 0.95, Number(confidence.toFixed(2)))),
        sourceLine: sourceLine.slice(0, 160),
        ...candidateWarnings(row.value, low, high, row.refText, hit.def.decimals, fromPhoto),
      });
      continue;
    }

    // Tests that aren't in the built-in catalogue: "<name> <value> <unit and/or range>".
    const generic = /^([A-Za-z][A-Za-z0-9 ()/%,.'+-]{1,58}?)\s*[:-]?\s+(?=[<>]?\d)(.*)$/.exec(line);
    if (!generic) continue;
    const name = generic[1].replace(/[\s:.-]+$/, "").trim();
    if (name.replace(/[^A-Za-z]/g, "").length < 2 || NOT_A_TEST.test(name)) continue;
    const row = parseRow(generic[2], unitRe);
    // Without a unit or a range, a number next to a word is too often not a result.
    if (!row || (!row.unit && !row.refText)) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const { low, high } = parseReferenceRange(row.refText);
    candidates.push({
      testName: name.slice(0, 120),
      biomarkerCode: null,
      value: row.value,
      unit: row.unit,
      refText: row.refText,
      refLow: low,
      refHigh: high,
      labFlag: row.labFlag,
      confidence: row.unit && row.refText ? 0.6 : 0.45,
      sourceLine: line.slice(0, 160),
      ...candidateWarnings(row.value, low, high, row.refText, 0, false),
    });
  }

  return {
    candidates,
    collectedAt: findReportDate(text),
    labName: findLabName(text),
    reportName: reportNameFor(candidates),
  };
}

/**
 * Turn results read by an AI model into candidates, linking them to the catalogue and
 * re-checking ranges and decimal points locally (never trusting the model's numbers blindly).
 */
export function candidatesFromResults(
  results: {
    testName: string;
    value: string;
    unit: string | null;
    refText: string | null;
    flag: "LOW" | "HIGH" | "NORMAL" | null;
  }[],
): LabCandidate[] {
  const out: LabCandidate[] = [];
  const seen = new Set<string>();
  for (const r of results.slice(0, 100)) {
    const testName = r.testName.replace(/\s+/g, " ").trim().slice(0, 120);
    const value = r.value.replace(/\s+/g, " ").trim().slice(0, 40);
    if (!testName || !value) continue;
    const def = matchBiomarker(testName) ?? ALIASES.find((a) => a.re.test(testName))?.def;
    const key = def?.code ?? testName.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const refText = r.refText?.replace(/\s+/g, " ").trim().slice(0, 120) || null;
    const { low, high } = parseReferenceRange(refText);
    const numeric = /^[<>]?\s*\d+(?:[.,]\d+)?$/.test(value) ? value.replace(",", ".") : null;
    out.push({
      testName: def?.name ?? testName,
      biomarkerCode: def?.code ?? null,
      value,
      unit: normaliseUnit(r.unit?.trim().slice(0, 30) || null) ?? def?.units[0] ?? null,
      refText,
      refLow: low,
      refHigh: high,
      labFlag: r.flag === "LOW" || r.flag === "HIGH" ? r.flag : null,
      confidence: 0.9,
      sourceLine: `${testName} ${value} ${r.unit ?? ""} ${refText ?? ""}`.trim().slice(0, 160),
      ...(numeric
        ? candidateWarnings(numeric.replace(/^[<>]\s*/, ""), low, high, refText, 0, false)
        : {}),
    });
  }
  return out;
}
