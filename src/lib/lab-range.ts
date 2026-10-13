import type { LabFlag } from "@prisma/client";
import { shortSource } from "@/lib/catalog/standard-ranges";
import { toNum } from "@/lib/utils";

/**
 * Parse a reference range as printed on an Indian lab report.
 * Supports "13.0 - 17.0", "13.0–17.0", "4.0 to 5.6", "< 200", "<=200", "> 40",
 * "Up to 40", "Upto 40". Returns nulls when the text cannot be interpreted.
 */
export function parseReferenceRange(text: string | null | undefined): {
  low: number | null;
  high: number | null;
} {
  if (!text) return { low: null, high: null };
  const t = text.replace(/,/g, "").trim().toLowerCase();
  const num = "(\\d+(?:\\.\\d+)?)";
  let m = new RegExp(`^${num}\\s*(?:-|–|—|to)\\s*${num}`).exec(t);
  if (m) return { low: Number(m[1]), high: Number(m[2]) };
  m = new RegExp(`^(?:<|<=|≤|up\\s*to|upto|less than)\\s*${num}`).exec(t);
  if (m) return { low: null, high: Number(m[1]) };
  m = new RegExp(`^(?:>|>=|≥|more than|greater than)\\s*${num}`).exec(t);
  if (m) return { low: Number(m[1]), high: null };
  return { low: null, high: null };
}

/**
 * The flag for a result from the range printed on its report (or the lab's own flag).
 * Used when there is no standard range for the test (see standard-ranges.ts).
 */
export function computeLabFlag(
  value: number | null,
  refLow: number | null,
  refHigh: number | null,
  labFlag?: LabFlag | null,
): LabFlag {
  if (labFlag && labFlag !== "UNKNOWN") return labFlag;
  if (value === null || (refLow === null && refHigh === null)) return "UNKNOWN";
  if (refLow !== null && value < refLow) return "LOW";
  if (refHigh !== null && value > refHigh) return "HIGH";
  return "NORMAL";
}

export function formatRange(
  refLow: number | null,
  refHigh: number | null,
  refText?: string | null,
) {
  if (refLow !== null && refHigh !== null) return `${refLow} – ${refHigh}`;
  if (refHigh !== null) return `< ${refHigh}`;
  if (refLow !== null) return `> ${refLow}`;
  return refText || "";
}

/**
 * The range a result is judged against: the standard (government-source) range when there
 * is one, otherwise the range printed on the report.
 */
export function rangeOf(r: {
  refLow: unknown;
  refHigh: unknown;
  refText: string | null;
  stdLow?: unknown;
  stdHigh?: unknown;
  stdText?: string | null;
  stdSource?: string | null;
}) {
  if (r.stdText) {
    return {
      low: toNum(r.stdLow),
      high: toNum(r.stdHigh),
      text: r.stdText,
      label: `${shortSource(r.stdSource ?? "")} range`,
      source: r.stdSource ?? null,
    };
  }
  const low = toNum(r.refLow);
  const high = toNum(r.refHigh);
  return {
    low,
    high,
    text: formatRange(low, high, r.refText),
    label: "Report range",
    source: null,
  };
}

/** The range fields of a ResultLedger row. */
export function ledgerRange(r: Parameters<typeof rangeOf>[0]) {
  const g = rangeOf(r);
  return { refLow: g.low, refHigh: g.high, refText: g.text, rangeLabel: g.label };
}
