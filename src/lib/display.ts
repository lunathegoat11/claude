import { displayUnit, type UnitPrefs } from "@/lib/catalog/metrics";
import { formatNumber } from "@/lib/format";

/** Convert & format a stored (canonical) measurement for display in the user's preferred unit. */
export function presentMeasurement(
  metric: { key: string; unit: string; decimals: number; valueType: "SINGLE" | "DUAL" },
  value: number,
  value2: number | null | undefined,
  prefs?: UnitPrefs,
) {
  const du = displayUnit(metric.key, metric.unit, prefs);
  const decimals = du.decimals ?? metric.decimals;
  const v = du.convert(value);
  const text =
    metric.valueType === "DUAL" && value2 != null
      ? `${formatNumber(value, 0)}/${formatNumber(value2, 0)}`
      : formatNumber(v, decimals);
  return { text, unit: du.unit, value: v, decimals, convert: du.convert };
}
