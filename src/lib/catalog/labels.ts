import type {
  AllergySeverity,
  BloodGroup,
  ConditionStatus,
  DataSource,
  DocumentType,
  LabFlag,
  ProviderType,
  RecordType,
  Sex,
} from "@prisma/client";

export const RECORD_TYPE_LABELS: Record<RecordType, string> = {
  DOCTOR_VISIT: "Doctor visit",
  DIAGNOSIS: "Diagnosis",
  PROCEDURE: "Procedure",
  HOSPITALIZATION: "Hospitalisation",
  PRESCRIPTION: "Prescription",
  VACCINATION: "Vaccination",
  ALLERGY: "Allergy",
  CONDITION: "Medical condition",
  FAMILY_HISTORY: "Family history",
  OTHER: "Other",
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  LAB_REPORT: "Lab report",
  PRESCRIPTION: "Prescription",
  DOCTOR_NOTE: "Doctor's note",
  DISCHARGE_SUMMARY: "Discharge summary",
  IMAGING_REPORT: "Imaging report",
  VACCINATION_RECORD: "Vaccination record",
  INSURANCE: "Insurance document",
  OTHER: "Other",
};

export const PROVIDER_TYPE_LABELS: Record<ProviderType, string> = {
  DOCTOR: "Doctor",
  HOSPITAL: "Hospital",
  CLINIC: "Clinic",
  LABORATORY: "Laboratory",
  PHARMACY: "Pharmacy",
  DIAGNOSTIC_CENTRE: "Diagnostic centre",
  OTHER: "Other",
};

export const LAB_FLAG_LABELS: Record<LabFlag, string> = {
  LOW: "Below report range",
  NORMAL: "Within report range",
  HIGH: "Above report range",
  ABNORMAL: "Flagged by lab",
  UNKNOWN: "No range on report",
};

export const SOURCE_LABELS: Record<DataSource, string> = {
  MANUAL: "Entered manually",
  PDF_IMPORT: "Imported from PDF",
  IMAGE_IMPORT: "Imported from image",
  CSV_IMPORT: "Imported from CSV",
  DEVICE: "Device",
  DEMO: "Demo data",
};

export const SEX_LABELS: Record<Sex, string> = {
  FEMALE: "Female",
  MALE: "Male",
  INTERSEX: "Intersex",
  PREFER_NOT_TO_SAY: "Prefer not to say",
};

export const BLOOD_GROUP_LABELS: Record<BloodGroup, string> = {
  A_POS: "A+",
  A_NEG: "A−",
  B_POS: "B+",
  B_NEG: "B−",
  AB_POS: "AB+",
  AB_NEG: "AB−",
  O_POS: "O+",
  O_NEG: "O−",
  UNKNOWN: "Don't know",
};

export const SEVERITY_LABELS: Record<AllergySeverity, string> = {
  MILD: "Mild",
  MODERATE: "Moderate",
  SEVERE: "Severe",
  UNKNOWN: "Not sure",
};

export const CONDITION_STATUS_LABELS: Record<ConditionStatus, string> = {
  ACTIVE: "Active",
  MANAGED: "Managed",
  RESOLVED: "Resolved",
};
