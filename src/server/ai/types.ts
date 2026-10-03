/**
 * Shared AI types. The rest of the app depends only on these, never on a
 * specific provider SDK.
 */

export type RefType = "record" | "lab" | "measurement" | "document" | "panel";

export interface Citation {
  ref: string; // e.g. "L3"
  type: RefType;
  id: string;
  label: string;
  href: string;
  date: string; // ISO
}

export interface MeasurementPoint {
  ref: string;
  id: string;
  value: number;
  value2: number | null;
  at: string;
  context: string | null;
  notes: string | null;
}
export interface MeasurementSeries {
  metricKey: string;
  metricName: string;
  unit: string;
  valueType: "SINGLE" | "DUAL";
  decimals: number;
  points: MeasurementPoint[]; // newest first
  totalInRange: number;
  stats: {
    count: number;
    min: number;
    max: number;
    mean: number;
    first: number;
    last: number;
    mean2?: number;
  } | null;
}

export interface LabPoint {
  ref: string;
  id: string;
  panelId: string | null;
  value: number | null;
  valueText: string | null;
  at: string;
  refLow: number | null;
  refHigh: number | null;
  refText: string | null;
  flag: string;
  labName: string | null;
}
export interface LabSeries {
  key: string;
  testName: string;
  biomarkerCode: string | null;
  unit: string | null;
  description: string | null;
  points: LabPoint[];
}

export interface PanelSummary {
  ref: string;
  id: string;
  name: string;
  at: string;
  labName: string | null;
  results: {
    testName: string;
    biomarkerCode: string | null;
    value: number | null;
    valueText: string | null;
    unit: string | null;
    flag: string;
    refLow: number | null;
    refHigh: number | null;
    refText: string | null;
  }[];
}

export interface DocumentHit {
  ref: string;
  id: string;
  name: string;
  type: string;
  at: string;
  providerName: string | null;
  snippet: string | null;
}
export interface RecordHit {
  ref: string;
  id: string;
  title: string;
  type: string;
  at: string;
  doctorName: string | null;
  facilityName: string | null;
  specialty: string | null;
  notes: string | null;
}

export interface HealthSummary {
  conditions: { name: string; status: string }[];
  medications: { name: string; dosage: string | null; frequency: string | null; active: boolean }[];
  allergies: { allergen: string; reaction: string | null; severity: string }[];
}

export type Intent =
  | "MEASUREMENT_TREND"
  | "LAB_SUMMARY"
  | "LAB_COMPARE"
  | "LAB_TREND"
  | "DOCUMENT_SEARCH"
  | "VISIT_SUMMARY"
  | "HEALTH_SUMMARY"
  | "EXPLAIN_TERM"
  | "DOCTOR_QUESTIONS"
  | "GENERAL";

export interface QuestionAnalysis {
  intents: Intent[];
  metricKeys: string[];
  biomarkerCodes: string[];
  range: { from: Date | null; to: Date; label: string };
  keywords: string[];
}

export interface ContextBundle {
  analysis: QuestionAnalysis;
  generatedAt: string;
  timezone: string;
  measurements: MeasurementSeries[];
  labs: LabSeries[];
  panels: PanelSummary[];
  documents: DocumentHit[];
  records: RecordHit[];
  summary: HealthSummary | null;
  citations: Citation[];
  /** Plain-language descriptions of tests mentioned (catalogue text, not patient data). */
  explanations: { term: string; description: string }[];
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface GenerateInput {
  bundle: ContextBundle;
  system: string;
  context: string;
  history: ChatTurn[];
  question: string;
}

export interface AIProvider {
  readonly name: string;
  readonly model: string;
  readonly supportsVision: boolean;
  generate(input: GenerateInput): Promise<string>;
  /** Transcribe the text of a lab report image (no interpretation). */
  transcribeImage?(image: Buffer, mimeType: string): Promise<string>;
}
