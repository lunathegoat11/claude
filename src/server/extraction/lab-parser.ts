import { BIOMARKERS, type BiomarkerDef } from "@/lib/catalog/biomarkers";
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
  sourceLine: string;
}

export interface ParsedReport {
  candidates: LabCandidate[];
  collectedAt: string | null; // YYYY-MM-DD
  labName: string | null;
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

export function parseLabText(text: string): ParsedReport {
  const candidates: LabCandidate[] = [];
  const seen = new Set<string>();
  const unitRe = new RegExp(`^${UNIT_PATTERN}(?![a-z])`, "i");

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+/g, " ").trim();
    if (line.length < 3 || line.length > 200) continue;
    const hit = ALIASES.find((a) => a.re.test(line));
    if (!hit) continue;

    // Remove the matched name and any trailing method/specimen in brackets.
    let rest = line
      .replace(hit.re, "")
      .replace(/^\s*(\([^)]*\)|\[[^\]]*\])\s*/, "")
      .replace(/^[\s:.-]+/, "");
    const valueMatch = /^(\d+(?:[.,]\d+)?)/.exec(rest);
    if (!valueMatch) continue;
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

    const refMatch =
      /((?:<|>|<=|>=|≤|≥|up\s*to|upto)\s*\d+(?:\.\d+)?|\d+(?:\.\d+)?\s*(?:-|–|to)\s*\d+(?:\.\d+)?)/i.exec(
        rest,
      );
    const refText = refMatch ? refMatch[1].replace(/\s+/g, " ").trim() : null;
    const { low, high } = parseReferenceRange(refText);

    if (!unit) {
      // Some reports print the unit after the range.
      const tail = rest.slice(refMatch ? (refMatch.index ?? 0) + refMatch[0].length : 0).trim();
      const u2 = unitRe.exec(tail);
      if (u2) unit = normaliseUnit(u2[1]);
    }

    const key = hit.def.code;
    if (seen.has(key)) continue;
    seen.add(key);

    let confidence = 0.5;
    if (unit) confidence += 0.25;
    if (refText) confidence += 0.2;
    if (unit && !hit.def.units.some((x) => x.toLowerCase() === unit!.toLowerCase()))
      confidence -= 0.2;

    candidates.push({
      testName: hit.def.name,
      biomarkerCode: hit.def.code,
      value,
      unit: unit ?? hit.def.units[0] ?? null,
      refText,
      refLow: low,
      refHigh: high,
      labFlag,
      confidence: Math.max(0.1, Math.min(0.95, Number(confidence.toFixed(2)))),
      sourceLine: line.slice(0, 160),
    });
  }

  return { candidates, collectedAt: findReportDate(text), labName: findLabName(text) };
}
