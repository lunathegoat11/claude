import type { ContextBundle } from "./types";

export function isEmptyBundle(b: ContextBundle) {
  const s = b.summary;
  return (
    !b.measurements.length &&
    !b.labs.length &&
    !b.panels.length &&
    !b.documents.length &&
    !b.records.length &&
    (!s || (!s.conditions.length && !s.medications.length && !s.allergies.length))
  );
}
