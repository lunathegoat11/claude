import type { MessageKey } from "@/i18n/messages";

/** Anything that turns a message key into text: the result of getT() or useT(). */
type Translate = (key: MessageKey) => string;

/** Built-in readings, by metric key. Custom measurements keep the name the person typed. */
const METRIC_NAMES: Record<string, MessageKey> = {
  blood_glucose: "app.metric.blood_glucose",
  blood_pressure: "app.metric.blood_pressure",
  heart_rate: "app.metric.heart_rate",
  temperature: "app.metric.temperature",
  weight: "app.metric.weight",
  height: "app.metric.height",
  sleep: "app.metric.sleep",
  exercise: "app.metric.exercise",
};

const CONTEXTS: Record<string, MessageKey> = {
  FASTING: "app.context.FASTING",
  BEFORE_MEAL: "app.context.BEFORE_MEAL",
  AFTER_MEAL: "app.context.AFTER_MEAL",
  RANDOM: "app.context.RANDOM",
  BEDTIME: "app.context.BEDTIME",
  CUSTOM: "app.context.CUSTOM",
  RESTING: "app.context.RESTING",
  AFTER_EXERCISE: "app.context.AFTER_EXERCISE",
  MORNING: "app.context.MORNING",
  EVENING: "app.context.EVENING",
};

/** A reading's name in the current language (built-in ones only). */
export function metricName(t: Translate, m: { key: string; name: string }) {
  const k = METRIC_NAMES[m.key];
  return k ? t(k) : m.name;
}

/** "Fasting", "After meal"… in the current language. */
export function contextLabel(t: Translate, context: string) {
  const k = CONTEXTS[context];
  return k ? t(k) : context;
}

/** The two values of a dual reading (blood pressure: systolic and diastolic). */
export function dualLabels(
  t: Translate,
  m: { key: string; primaryLabel: string | null; secondaryLabel: string | null },
): [string, string] {
  if (m.key === "blood_pressure") return [t("app.metric.systolic"), t("app.metric.diastolic")];
  return [m.primaryLabel ?? t("app.reading.value1"), m.secondaryLabel ?? t("app.reading.value2")];
}
