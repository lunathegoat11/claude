import type { HealthMetric } from "@prisma/client";
import type { MetricOption } from "@/components/tracking/measurement-dialog";
import type { UnitPrefs } from "@/lib/catalog/metrics";

export function toMetricOption(m: HealthMetric): MetricOption {
  return {
    id: m.id,
    key: m.key,
    name: m.name,
    unit: m.unit,
    valueType: m.valueType,
    primaryLabel: m.primaryLabel,
    secondaryLabel: m.secondaryLabel,
    decimals: m.decimals,
    contexts: m.contexts,
  };
}

export function preferredInputUnits(prefs: UnitPrefs): Record<string, string> {
  return {
    blood_glucose: prefs.glucoseUnit === "MMOL_L" ? "mmol/L" : "mg/dL",
    weight: prefs.weightUnit === "LB" ? "lb" : "kg",
    temperature: prefs.temperatureUnit === "C" ? "°C" : "°F",
  };
}
