/**
 * Built-in health-tracking metrics. These are seeded into the HealthMetric
 * table (userId = NULL). Users may also define their own custom metrics, so
 * nothing in the app may assume this list is exhaustive.
 *
 * min/max are *plausibility* bounds for catching typos — they are not
 * clinical ranges and are never shown as "normal".
 */
export interface MetricDef {
  key: string;
  name: string;
  shortName?: string;
  unit: string;
  valueType: "SINGLE" | "DUAL";
  primaryLabel?: string;
  secondaryLabel?: string;
  decimals: number;
  min: number;
  max: number;
  contexts: string[];
  category: "vitals" | "body" | "lifestyle" | "custom";
  sortOrder: number;
}

export const GLUCOSE_CONTEXTS = [
  "FASTING",
  "BEFORE_MEAL",
  "AFTER_MEAL",
  "RANDOM",
  "BEDTIME",
  "CUSTOM",
] as const;

export const CONTEXT_LABELS: Record<string, string> = {
  FASTING: "Fasting",
  BEFORE_MEAL: "Before meal",
  AFTER_MEAL: "After meal",
  RANDOM: "Random",
  BEDTIME: "Bedtime",
  CUSTOM: "Custom",
  RESTING: "Resting",
  AFTER_EXERCISE: "After exercise",
  MORNING: "Morning",
  EVENING: "Evening",
};

export const SYSTEM_METRICS: MetricDef[] = [
  {
    key: "blood_glucose",
    name: "Blood glucose",
    shortName: "Glucose",
    unit: "mg/dL",
    valueType: "SINGLE",
    decimals: 0,
    min: 20,
    max: 700,
    contexts: [...GLUCOSE_CONTEXTS],
    category: "vitals",
    sortOrder: 10,
  },
  {
    key: "blood_pressure",
    name: "Blood pressure",
    shortName: "BP",
    unit: "mmHg",
    valueType: "DUAL",
    primaryLabel: "Systolic",
    secondaryLabel: "Diastolic",
    decimals: 0,
    min: 40,
    max: 300,
    contexts: ["RESTING", "MORNING", "EVENING", "AFTER_EXERCISE", "CUSTOM"],
    category: "vitals",
    sortOrder: 20,
  },
  {
    key: "heart_rate",
    name: "Heart rate",
    shortName: "Pulse",
    unit: "bpm",
    valueType: "SINGLE",
    decimals: 0,
    min: 20,
    max: 250,
    contexts: ["RESTING", "AFTER_EXERCISE", "CUSTOM"],
    category: "vitals",
    sortOrder: 30,
  },
  {
    key: "spo2",
    name: "SpO₂",
    shortName: "SpO₂",
    unit: "%",
    valueType: "SINGLE",
    decimals: 0,
    min: 50,
    max: 100,
    contexts: ["RESTING", "AFTER_EXERCISE", "CUSTOM"],
    category: "vitals",
    sortOrder: 40,
  },
  {
    key: "temperature",
    name: "Body temperature",
    shortName: "Temp",
    unit: "°F",
    valueType: "SINGLE",
    decimals: 1,
    min: 86,
    max: 113,
    contexts: [],
    category: "vitals",
    sortOrder: 50,
  },
  {
    key: "weight",
    name: "Weight",
    unit: "kg",
    valueType: "SINGLE",
    decimals: 1,
    min: 1,
    max: 400,
    contexts: [],
    category: "body",
    sortOrder: 60,
  },
  {
    key: "height",
    name: "Height",
    unit: "cm",
    valueType: "SINGLE",
    decimals: 1,
    min: 30,
    max: 260,
    contexts: [],
    category: "body",
    sortOrder: 70,
  },
  {
    key: "sleep",
    name: "Sleep",
    unit: "hours",
    valueType: "SINGLE",
    decimals: 1,
    min: 0,
    max: 24,
    contexts: [],
    category: "lifestyle",
    sortOrder: 80,
  },
  {
    key: "exercise",
    name: "Exercise",
    unit: "minutes",
    valueType: "SINGLE",
    decimals: 0,
    min: 0,
    max: 1440,
    contexts: [],
    category: "lifestyle",
    sortOrder: 90,
  },
];

export function getSystemMetric(key: string) {
  return SYSTEM_METRICS.find((m) => m.key === key);
}

// ── Unit conversion (stored values are always in the metric's canonical unit) ──

export const GLUCOSE_MGDL_PER_MMOL = 18.0182;

export interface UnitPrefs {
  glucoseUnit: "MG_DL" | "MMOL_L";
  weightUnit: "KG" | "LB";
  temperatureUnit: "C" | "F";
}

export const DEFAULT_PREFS: UnitPrefs = {
  glucoseUnit: "MG_DL",
  weightUnit: "KG",
  temperatureUnit: "F",
};

/** Units a user may enter for a metric, first = canonical. */
export function inputUnitsFor(metricKey: string, canonical: string): string[] {
  switch (metricKey) {
    case "blood_glucose":
      return ["mg/dL", "mmol/L"];
    case "weight":
      return ["kg", "lb"];
    case "temperature":
      return ["°F", "°C"];
    default:
      return [canonical];
  }
}

export function toCanonical(metricKey: string, value: number, unit: string): number {
  if (metricKey === "blood_glucose" && unit === "mmol/L") return value * GLUCOSE_MGDL_PER_MMOL;
  if (metricKey === "weight" && unit === "lb") return value / 2.20462;
  if (metricKey === "temperature" && unit === "°C") return (value * 9) / 5 + 32;
  return value;
}

/** Display unit and converter for a metric given user preferences. */
export function displayUnit(
  metricKey: string,
  canonical: string,
  prefs: UnitPrefs = DEFAULT_PREFS,
) {
  if (metricKey === "blood_glucose" && prefs.glucoseUnit === "MMOL_L")
    return { unit: "mmol/L", decimals: 1, convert: (v: number) => v / GLUCOSE_MGDL_PER_MMOL };
  if (metricKey === "weight" && prefs.weightUnit === "LB")
    return { unit: "lb", decimals: 1, convert: (v: number) => v * 2.20462 };
  if (metricKey === "temperature" && prefs.temperatureUnit === "C")
    return { unit: "°C", decimals: 1, convert: (v: number) => ((v - 32) * 5) / 9 };
  return { unit: canonical, decimals: undefined as number | undefined, convert: (v: number) => v };
}
