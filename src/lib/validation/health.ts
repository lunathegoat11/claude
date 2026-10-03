import { z } from "zod";
import {
  dateInput,
  numberInput,
  optionalDateInput,
  optionalNumberInput,
  optionalString,
  requiredString,
  tagsInput,
  uuid,
} from "./common";
import { isValidIndianPhone } from "@/lib/india";

export const RECORD_TYPES = [
  "DOCTOR_VISIT",
  "DIAGNOSIS",
  "PROCEDURE",
  "HOSPITALIZATION",
  "PRESCRIPTION",
  "VACCINATION",
  "ALLERGY",
  "CONDITION",
  "FAMILY_HISTORY",
  "OTHER",
] as const;

export const DOCUMENT_TYPES = [
  "LAB_REPORT",
  "PRESCRIPTION",
  "DOCTOR_NOTE",
  "DISCHARGE_SUMMARY",
  "IMAGING_REPORT",
  "VACCINATION_RECORD",
  "INSURANCE",
  "OTHER",
] as const;

export const recordSchema = z
  .object({
    type: z.enum(RECORD_TYPES, { errorMap: () => ({ message: "Choose a record type" }) }),
    title: requiredString("Title", 200),
    date: dateInput("Date"),
    endDate: optionalDateInput("End date"),
    doctorName: optionalString(120),
    facilityName: optionalString(160),
    specialty: optionalString(120),
    notes: optionalString(5000),
    tags: tagsInput,
  })
  .refine((v) => !v.endDate || v.endDate >= v.date, {
    message: "End date must be on or after the start date",
    path: ["endDate"],
  });
export type RecordInput = z.infer<typeof recordSchema>;

export const documentMetaSchema = z.object({
  name: requiredString("Document name", 200),
  type: z.enum(DOCUMENT_TYPES, { errorMap: () => ({ message: "Choose a document type" }) }),
  documentDate: optionalDateInput("Document date"),
  providerName: optionalString(160),
  notes: optionalString(2000),
  tags: tagsInput,
  recordId: z.preprocess((v) => (v === "" || v === "none" ? undefined : v), uuid.optional()),
});
export type DocumentMetaInput = z.infer<typeof documentMetaSchema>;

export const LAB_FLAGS = ["LOW", "NORMAL", "HIGH", "ABNORMAL", "UNKNOWN"] as const;

export const labResultInputSchema = z
  .object({
    testName: requiredString("Test name", 120),
    biomarkerCode: optionalString(40),
    value: requiredString("Value", 40),
    unit: optionalString(30),
    refLow: optionalNumberInput("Range low"),
    refHigh: optionalNumberInput("Range high"),
    refText: optionalString(120),
    labFlag: z.enum(LAB_FLAGS).optional(),
    notes: optionalString(1000),
  })
  .refine((v) => v.refLow === undefined || v.refHigh === undefined || v.refLow <= v.refHigh, {
    message: "Range low must not be greater than range high",
    path: ["refHigh"],
  })
  .refine(
    (v) => {
      const n = Number(v.value.replace(",", "."));
      return !Number.isFinite(n) || n >= 0;
    },
    { message: "Lab values cannot be negative", path: ["value"] },
  );
export type LabResultInput = z.infer<typeof labResultInputSchema>;

export const labPanelSchema = z.object({
  name: requiredString("Report name", 160),
  category: optionalString(40),
  collectedAt: dateInput("Sample date"),
  labName: optionalString(160),
  notes: optionalString(2000),
  documentId: z.preprocess((v) => (v === "" || v === "none" ? undefined : v), uuid.optional()),
  results: z
    .array(labResultInputSchema)
    .min(1, "Add at least one test result")
    .max(100, "A report can have at most 100 results"),
});
export type LabPanelInput = z.infer<typeof labPanelSchema>;

export const measurementSchema = z.object({
  metricId: uuid,
  value: numberInput("Value"),
  value2: optionalNumberInput("Second value"),
  unit: requiredString("Unit", 20),
  measuredAt: dateInput("Date and time"),
  context: optionalString(30),
  contextNote: optionalString(120),
  notes: optionalString(1000),
});
export type MeasurementInput = z.infer<typeof measurementSchema>;

export const customMetricSchema = z
  .object({
    name: requiredString("Name", 60),
    unit: requiredString("Unit", 20),
    decimals: z.coerce.number().int().min(0).max(3).default(1),
    minValue: optionalNumberInput("Minimum"),
    maxValue: optionalNumberInput("Maximum"),
  })
  .refine((v) => v.minValue === undefined || v.maxValue === undefined || v.minValue < v.maxValue, {
    message: "Minimum must be less than maximum",
    path: ["maxValue"],
  });

const phone = (label: string) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z
      .string()
      .refine(
        isValidIndianPhone,
        `${label} must be a valid Indian phone number (e.g. +91 98765 43210)`,
      )
      .optional(),
  );

export const profileSchema = z.object({
  fullName: requiredString("Name", 120),
  dateOfBirth: optionalDateInput("Date of birth"),
  sex: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.enum(["FEMALE", "MALE", "INTERSEX", "PREFER_NOT_TO_SAY"]).optional(),
  ),
  phone: phone("Phone"),
  city: optionalString(80),
  state: optionalString(80),
  bloodGroup: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z
      .enum(["A_POS", "A_NEG", "B_POS", "B_NEG", "AB_POS", "AB_NEG", "O_POS", "O_NEG", "UNKNOWN"])
      .optional(),
  ),
  heightCm: z.preprocess(
    (v) => (typeof v === "string" ? (v.trim() === "" ? undefined : Number(v)) : v),
    z.number().min(30, "Height looks too low").max(260, "Height looks too high").optional(),
  ),
  emergencyContactName: optionalString(120),
  emergencyContactPhone: phone("Emergency contact phone"),
  emergencyContactRelation: optionalString(60),
});

export const preferencesSchema = z.object({
  glucoseUnit: z.enum(["MG_DL", "MMOL_L"]),
  weightUnit: z.enum(["KG", "LB"]),
  temperatureUnit: z.enum(["C", "F"]),
});

export const medicationSchema = z.object({
  name: requiredString("Medicine name", 120),
  dosage: optionalString(80),
  frequency: optionalString(80),
  startDate: optionalDateInput("Start date"),
  endDate: optionalDateInput("End date"),
  prescribedBy: optionalString(120),
  active: z.preprocess((v) => v === "on" || v === true || v === "true", z.boolean()),
  notes: optionalString(1000),
});

export const allergySchema = z.object({
  allergen: requiredString("Allergen", 120),
  reaction: optionalString(200),
  severity: z.enum(["MILD", "MODERATE", "SEVERE", "UNKNOWN"]).default("UNKNOWN"),
  notes: optionalString(1000),
});

export const conditionSchema = z.object({
  name: requiredString("Condition", 120),
  status: z.enum(["ACTIVE", "MANAGED", "RESOLVED"]).default("ACTIVE"),
  diagnosedOn: optionalDateInput("Diagnosed on"),
  notes: optionalString(1000),
});

export const assistantQuestionSchema = z.object({
  conversationId: uuid.optional(),
  message: z
    .string()
    .trim()
    .min(1, "Type a question")
    .max(2000, "Please keep questions under 2,000 characters"),
});
