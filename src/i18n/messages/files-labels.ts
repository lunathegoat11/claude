/**
 * Message keys for the labels of document, record and provider types (the English
 * labels live in src/lib/catalog/labels.ts). Safe to import from server and client code:
 * it holds only key names, not the text.
 */
import type { DocumentType, ProviderType, RecordType } from "@prisma/client";
import type { MessageKey } from "./index";

export const DOCUMENT_TYPE_KEYS = {
  LAB_REPORT: "files.docType.LAB_REPORT",
  PRESCRIPTION: "files.docType.PRESCRIPTION",
  DOCTOR_NOTE: "files.docType.DOCTOR_NOTE",
  DISCHARGE_SUMMARY: "files.docType.DISCHARGE_SUMMARY",
  IMAGING_REPORT: "files.docType.IMAGING_REPORT",
  VACCINATION_RECORD: "files.docType.VACCINATION_RECORD",
  INSURANCE: "files.docType.INSURANCE",
  OTHER: "files.docType.OTHER",
} as const satisfies Record<DocumentType, MessageKey>;

export const RECORD_TYPE_KEYS = {
  DOCTOR_VISIT: "files.recordType.DOCTOR_VISIT",
  DIAGNOSIS: "files.recordType.DIAGNOSIS",
  PROCEDURE: "files.recordType.PROCEDURE",
  HOSPITALIZATION: "files.recordType.HOSPITALIZATION",
  PRESCRIPTION: "files.recordType.PRESCRIPTION",
  VACCINATION: "files.recordType.VACCINATION",
  ALLERGY: "files.recordType.ALLERGY",
  CONDITION: "files.recordType.CONDITION",
  FAMILY_HISTORY: "files.recordType.FAMILY_HISTORY",
  OTHER: "files.recordType.OTHER",
} as const satisfies Record<RecordType, MessageKey>;

export const PROVIDER_TYPE_KEYS = {
  DOCTOR: "files.providerType.DOCTOR",
  HOSPITAL: "files.providerType.HOSPITAL",
  CLINIC: "files.providerType.CLINIC",
  LABORATORY: "files.providerType.LABORATORY",
  PHARMACY: "files.providerType.PHARMACY",
  DIAGNOSTIC_CENTRE: "files.providerType.DIAGNOSTIC_CENTRE",
  OTHER: "files.providerType.OTHER",
} as const satisfies Record<ProviderType, MessageKey>;

/** Reading contexts (see CONTEXT_LABELS in src/lib/catalog/metrics.ts). */
export const CONTEXT_KEYS: Record<string, MessageKey> = {
  FASTING: "files.context.FASTING",
  BEFORE_MEAL: "files.context.BEFORE_MEAL",
  AFTER_MEAL: "files.context.AFTER_MEAL",
  RANDOM: "files.context.RANDOM",
  BEDTIME: "files.context.BEDTIME",
  CUSTOM: "files.context.CUSTOM",
  RESTING: "files.context.RESTING",
  AFTER_EXERCISE: "files.context.AFTER_EXERCISE",
  MORNING: "files.context.MORNING",
  EVENING: "files.context.EVENING",
};
