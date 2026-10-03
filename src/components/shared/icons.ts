import {
  Activity,
  Ambulance,
  Bed,
  ClipboardList,
  Droplet,
  FileImage,
  FileText,
  FlaskConical,
  Footprints,
  HeartPulse,
  Moon,
  Pill,
  Ruler,
  ScanLine,
  Scale,
  ShieldPlus,
  Stethoscope,
  Syringe,
  Thermometer,
  Users,
  Wind,
  type LucideIcon,
  AlertTriangle,
  Scissors,
  Receipt,
  Gauge,
} from "lucide-react";
import type { DocumentType, RecordType, TimelineCategory } from "@prisma/client";

export const METRIC_ICONS: Record<string, LucideIcon> = {
  blood_glucose: Droplet,
  blood_pressure: Gauge,
  heart_rate: HeartPulse,
  spo2: Wind,
  temperature: Thermometer,
  weight: Scale,
  height: Ruler,
  sleep: Moon,
  exercise: Footprints,
  HBA1C: Droplet,
  CHOL: FlaskConical,
  LDL: FlaskConical,
  HGB: Droplet,
  TSH: FlaskConical,
};
export const metricIcon = (key: string): LucideIcon => METRIC_ICONS[key] ?? Activity;

export const RECORD_ICONS: Record<RecordType, LucideIcon> = {
  DOCTOR_VISIT: Stethoscope,
  DIAGNOSIS: ClipboardList,
  PROCEDURE: Scissors,
  HOSPITALIZATION: Bed,
  PRESCRIPTION: Pill,
  VACCINATION: Syringe,
  ALLERGY: AlertTriangle,
  CONDITION: ShieldPlus,
  FAMILY_HISTORY: Users,
  OTHER: ClipboardList,
};

export const DOCUMENT_ICONS: Record<DocumentType, LucideIcon> = {
  LAB_REPORT: FlaskConical,
  PRESCRIPTION: Pill,
  DOCTOR_NOTE: Stethoscope,
  DISCHARGE_SUMMARY: Ambulance,
  IMAGING_REPORT: ScanLine,
  VACCINATION_RECORD: Syringe,
  INSURANCE: Receipt,
  OTHER: FileText,
};

export const TIMELINE_ICONS: Record<TimelineCategory, LucideIcon> = {
  VISIT: Stethoscope,
  DIAGNOSIS: ClipboardList,
  PROCEDURE: Scissors,
  HOSPITALIZATION: Bed,
  PRESCRIPTION: Pill,
  VACCINATION: Syringe,
  LAB: FlaskConical,
  MEASUREMENT: Activity,
  DOCUMENT: FileText,
  OTHER: ClipboardList,
};

export { FileImage };
