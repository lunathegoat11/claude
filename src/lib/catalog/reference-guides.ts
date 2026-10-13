/**
 * General reference ranges published by public-health bodies in India and the US.
 *
 * These are shown as optional, labelled guides on trend charts. High/Low itself comes
 * from the standard ranges in standard-ranges.ts (or the report's range when there is none).
 * Every entry names its source and links to it.
 */
import { GUIDE_DATA } from "./reference-guides-data";

export type GuideTone = "low" | "normal" | "borderline" | "high";
export interface GuideBand {
  label: string;
  low: number | null;
  high: number | null;
  tone: GuideTone;
}
export interface GuideDef {
  source: string;
  url: string;
  unit: string;
  bands?: GuideBand[];
  male?: GuideBand[];
  female?: GuideBand[];
  /** Draw these values as lines instead of shading bands (e.g. blood pressure thresholds). */
  lines?: number[];
  /** Plain-language summary used instead of listing the bands. */
  summary?: string;
  note?: string;
}
export interface GuideEntry {
  india?: GuideDef;
  us?: GuideDef;
  /** Other units the same values can be shown in: value_in_unit = value * factor (+ offset). */
  convert?: { unit: string; factor: number; offset?: number }[];
}
export interface ResolvedGuide {
  source: string;
  url: string;
  unit: string;
  bands: GuideBand[];
  lines?: number[];
  summary?: string;
  note?: string;
  /** Why no bands are drawn (e.g. the profile has no sex set, or the unit differs). */
  unavailable?: string;
}

/** Lower-case, µ → u, and treat equivalent spellings as one unit. */
export function normUnit(u: string | null | undefined) {
  const n = (u ?? "")
    .trim()
    .toLowerCase()
    .replace(/µ|μ/g, "u")
    .replace(/\s+/g, "")
    .replace(/^meq\/l$/, "mmol/l")
    .replace(/^miu\/l$/, "uiu/ml")
    .replace(/^uu\/ml$/, "uiu/ml")
    .replace(/^iu\/l$/, "u/l")
    .replace(/^(secs?|seconds?|s)$/, "sec")
    .replace(/^(million|mill)\/(cumm|cmm)$/, "million/ul")
    .replace(/^lakhs?\/(cumm|cmm)$/, "lakh/ul")
    .replace(/^°?f$/, "f")
    .replace(/^°?c$/, "c")
    .replace(/^cells\/cumm$|^\/cumm$/, "/ul")
    .replace(/^10\^3\/ul$|^thou\/ul$/, "10^3/ul")
    .replace(/^bpm$|^beats\/min$/, "bpm");
  return n;
}

function scaleBand(b: GuideBand, f: (v: number) => number): GuideBand {
  return { ...b, low: b.low == null ? null : f(b.low), high: b.high == null ? null : f(b.high) };
}

function resolveOne(
  def: GuideDef,
  entry: GuideEntry,
  unit: string,
  sex: string | null | undefined,
): ResolvedGuide {
  const base = { source: def.source, url: def.url, unit, note: def.note, summary: def.summary };
  if (def.lines) {
    // Line guides (blood pressure, thresholds) are published in the chart's own unit.
    return { ...base, bands: def.bands ?? [], lines: def.lines };
  }
  let bands = def.bands;
  if (!bands) {
    bands = sex === "MALE" ? def.male : sex === "FEMALE" ? def.female : undefined;
    if (!bands)
      return {
        ...base,
        unit: def.unit,
        bands: [],
        unavailable:
          "This range differs for men and women. Add your sex in Settings, Profile to see it",
      };
  }
  if (normUnit(unit) === normUnit(def.unit)) return { ...base, bands };
  const c = entry.convert?.find((x) => normUnit(x.unit) === normUnit(unit));
  if (!c)
    return {
      ...base,
      unit: def.unit,
      bands: [],
      unavailable: `Published in ${def.unit}, but these results are in ${unit || "another unit"}`,
    };
  const f = (v: number) => Number((v * c.factor + (c.offset ?? 0)).toFixed(2));
  return { ...base, bands: bands.map((b) => scaleBand(b, f)) };
}

/**
 * The India and US guides for a test or reading, in the chart's unit and for the user's sex.
 * `key` is a biomarker code (e.g. "HBA1C") or a reading key, with the context for blood
 * sugar (e.g. "blood_glucose:FASTING").
 */
/** Shown when an Indian national body has not published a range for this test. */
export const NO_INDIAN_RANGE =
  "No Indian national range has been published for this test yet. ICMR's study to set Indian reference ranges is still under way, so use the range printed on your report";

export function resolveGuides(
  key: string,
  unit: string | null | undefined,
  sex?: string | null,
): Partial<Record<"india" | "us", ResolvedGuide>> {
  const entry = GUIDE_DATA[key];
  if (!entry) return {};
  const out: Partial<Record<"india" | "us", ResolvedGuide>> = {};
  if (entry.india) out.india = resolveOne(entry.india, entry, unit ?? "", sex);
  else
    out.india = {
      source: "Indian Council of Medical Research",
      url: "https://www.icmr.gov.in/",
      unit: unit ?? "",
      bands: [],
      unavailable: NO_INDIAN_RANGE,
    };
  if (entry.us) out.us = resolveOne(entry.us, entry, unit ?? "", sex);
  return out;
}
