import type { LabFlag } from "@prisma/client";

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
 * Determine the flag for a result using ONLY the range stored with that
 * result (or the lab's own flag). No universal ranges are ever applied.
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
