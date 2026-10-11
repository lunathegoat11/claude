import type { GuideBand, GuideEntry } from "./reference-guides";

/*
 * Sources: US figures from NIH (MedlinePlus, NIDDK, NHLBI, Office of Dietary Supplements),
 * CDC and the AHA/ACC; Indian figures from ICMR Standard Treatment Workflows, MoHFW
 * programmes (Anemia Mukt Bharat, CNNS, IDSP) and the Indian Guidelines on Hypertension.
 * Gathered October 2026. Where India has published no range, the entry has no `india`.
 */

const MEDLINE = "MedlinePlus (US National Library of Medicine, NIH)";
const ICMR_T2DM = {
  source: "ICMR Standard Treatment Workflow: Type 2 diabetes",
  url: "https://www.icmr.gov.in/icmrobject/uploads/STWs/1726567245_diabetes_mellitus_type_2.pdf",
};
const NIDDK = {
  source: "NIDDK (NIH), using American Diabetes Association criteria",
  url: "https://www.niddk.nih.gov/health-information/professionals/clinical-tools-patient-management/diabetes/diabetes-prediabetes",
};
const NCEP = {
  source: "NHLBI (NIH) National Cholesterol Education Program, ATP III",
  url: "https://www.nhlbi.nih.gov/files/docs/guidelines/atp3xsum.pdf",
};
const ICMR_INDIAB = {
  source: "ICMR-INDIAB national study (uses NCEP ATP III cut-offs)",
  url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4016101/",
};

const range = (low: number | null, high: number | null, label = "Typical range"): GuideBand[] => [
  { label, low, high, tone: "normal" },
];

const FASTING: GuideBand[] = [
  { label: "Normal", low: null, high: 99, tone: "normal" },
  { label: "Prediabetes", low: 100, high: 125, tone: "borderline" },
  { label: "Diabetes", low: 126, high: null, tone: "high" },
];
const OGTT: GuideBand[] = [
  { label: "Normal", low: null, high: 139, tone: "normal" },
  { label: "Prediabetes", low: 140, high: 199, tone: "borderline" },
  { label: "Diabetes", low: 200, high: null, tone: "high" },
];
const A1C: GuideBand[] = [
  { label: "Normal", low: null, high: 5.6, tone: "normal" },
  { label: "Prediabetes", low: 5.7, high: 6.4, tone: "borderline" },
  { label: "Diabetes", low: 6.5, high: null, tone: "high" },
];
const GLUCOSE_MMOL = [{ unit: "mmol/L", factor: 0.0555 }];
const CHOL_MMOL = [{ unit: "mmol/L", factor: 0.02586 }];

export const GUIDE_DATA: Record<string, GuideEntry> = {
  // ── Blood count ──
  HGB: {
    us: {
      source: MEDLINE,
      url: "https://medlineplus.gov/ency/article/003645.htm",
      unit: "g/dL",
      male: range(13.8, 17.2),
      female: range(12.1, 15.1),
    },
    india: {
      source: "Anemia Mukt Bharat (Ministry of Health), using WHO cut-offs",
      url: "https://en.vikaspedia.in/health/health-campaigns/anemia-mukt-bharat",
      unit: "g/dL",
      male: [{ label: "Anaemia", low: null, high: 13, tone: "low" }],
      female: [{ label: "Anaemia", low: null, high: 12, tone: "low" }],
      note: "An anaemia cut-off, not a full range (for pregnancy it is 11)",
    },
    convert: [{ unit: "g/L", factor: 10 }],
  },
  HCT: {
    us: {
      source: MEDLINE,
      url: "https://medlineplus.gov/ency/article/003646.htm",
      unit: "%",
      male: range(40.7, 50.3),
      female: range(36.1, 44.3),
    },
  },
  RBC: {
    us: {
      source: MEDLINE,
      url: "https://medlineplus.gov/ency/article/003644.htm",
      unit: "million/µL",
      male: range(4.2, 5.7),
      female: range(3.8, 5.1),
    },
    convert: [{ unit: "10^6/µL", factor: 1 }],
  },
  WBC: {
    us: {
      source: MEDLINE,
      url: "https://medlineplus.gov/ency/article/003643.htm",
      unit: "/µL",
      bands: range(4500, 11000),
    },
    convert: [{ unit: "10^3/µL", factor: 0.001 }],
  },
  PLT: {
    us: {
      source: MEDLINE,
      url: "https://medlineplus.gov/ency/article/003647.htm",
      unit: "lakh/µL",
      bands: range(1.5, 4.0),
    },
    convert: [
      { unit: "10^3/µL", factor: 100 },
      { unit: "/µL", factor: 100000 },
    ],
  },

  // ── Blood sugar ──
  GLU_FASTING: {
    us: { ...NIDDK, unit: "mg/dL", bands: FASTING },
    india: { ...ICMR_T2DM, unit: "mg/dL", bands: FASTING, note: "Same thresholds as the US" },
    convert: GLUCOSE_MMOL,
  },
  GLU_PP: {
    us: { ...NIDDK, unit: "mg/dL", bands: OGTT, note: "For the 2-hour glucose tolerance test" },
    india: {
      ...ICMR_T2DM,
      unit: "mg/dL",
      bands: OGTT,
      note: "For the 2-hour glucose tolerance test; a post-meal check is not quite the same test",
    },
    convert: GLUCOSE_MMOL,
  },
  GLU_RANDOM: {
    us: {
      source: "American Diabetes Association Standards of Care 2025",
      url: "https://diabetesjournals.org/care/article/48/Supplement_1/S27/157566/2-Diagnosis-and-Classification-of-Diabetes",
      unit: "mg/dL",
      bands: [{ label: "Diabetes, with symptoms", low: 200, high: null, tone: "high" }],
    },
    india: {
      source: "ICMR Standard Treatment Workflows: Endocrinology",
      url: "https://www.icmr.gov.in/icmrobject/uploads/STWs/1726567249_endocrinology_all.pdf",
      unit: "mg/dL",
      bands: [{ label: "Diabetes, with symptoms", low: 200, high: null, tone: "high" }],
    },
    convert: GLUCOSE_MMOL,
  },
  HBA1C: {
    us: { ...NIDDK, unit: "%", bands: A1C },
    india: { ...ICMR_T2DM, unit: "%", bands: A1C, note: "Same thresholds as the US" },
    convert: [{ unit: "mmol/mol", factor: 10.929, offset: -23.5 }],
  },

  // ── Kidney, salts ──
  CREAT: {
    us: {
      source: MEDLINE,
      url: "https://medlineplus.gov/ency/article/003475.htm",
      unit: "mg/dL",
      male: range(0.7, 1.3),
      female: range(0.5, 0.95),
    },
    convert: [{ unit: "µmol/L", factor: 88.4 }],
  },
  UREA: {
    us: {
      source: MEDLINE,
      url: "https://medlineplus.gov/ency/article/003474.htm",
      unit: "mg/dL",
      bands: range(12.8, 42.8),
      note: "The US publishes BUN (6 – 20 mg/dL); shown here converted to urea",
    },
  },
  NA: {
    us: {
      source: MEDLINE,
      url: "https://medlineplus.gov/ency/article/003481.htm",
      unit: "mmol/L",
      bands: range(135, 145),
    },
    india: {
      source: "ICMR Standard Treatment Workflow: Hyponatraemia",
      url: "https://www.icmr.gov.in/icmrobject/uploads/STWs/1726567243_approach_to_hyponatremia.pdf",
      unit: "mmol/L",
      bands: [{ label: "Severely low", low: null, high: 124, tone: "low" }],
      note: "Only a 'severely low' threshold is published",
    },
  },
  K: {
    us: {
      source: MEDLINE,
      url: "https://medlineplus.gov/ency/article/003484.htm",
      unit: "mmol/L",
      bands: range(3.7, 5.2),
    },
  },

  // ── Lipids ──
  CHOL: {
    us: {
      ...NCEP,
      unit: "mg/dL",
      bands: [
        { label: "Desirable", low: null, high: 199, tone: "normal" },
        { label: "Borderline high", low: 200, high: 239, tone: "borderline" },
        { label: "High", low: 240, high: null, tone: "high" },
      ],
    },
    india: {
      ...ICMR_INDIAB,
      unit: "mg/dL",
      bands: [
        { label: "Normal", low: null, high: 199, tone: "normal" },
        { label: "High", low: 200, high: null, tone: "high" },
      ],
    },
    convert: CHOL_MMOL,
  },
  LDL: {
    us: {
      ...NCEP,
      unit: "mg/dL",
      bands: [
        { label: "Optimal", low: null, high: 99, tone: "normal" },
        { label: "Near optimal", low: 100, high: 129, tone: "normal" },
        { label: "Borderline high", low: 130, high: 159, tone: "borderline" },
        { label: "High", low: 160, high: 189, tone: "high" },
        { label: "Very high", low: 190, high: null, tone: "high" },
      ],
    },
    india: {
      ...ICMR_T2DM,
      unit: "mg/dL",
      bands: [{ label: "Target", low: null, high: 99, tone: "normal" }],
      note: "A treatment target (below 70 with heart disease), not a population range",
    },
    convert: CHOL_MMOL,
  },
  HDL: {
    us: {
      source: "NHLBI (NIH): metabolic syndrome criteria",
      url: "https://www.nhlbi.nih.gov/health/metabolic-syndrome/diagnosis",
      unit: "mg/dL",
      male: [{ label: "Low", low: null, high: 40, tone: "low" }],
      female: [{ label: "Low", low: null, high: 50, tone: "low" }],
      note: "60 or more is considered protective",
    },
    india: {
      ...ICMR_T2DM,
      unit: "mg/dL",
      male: [{ label: "Low", low: null, high: 40, tone: "low" }],
      female: [{ label: "Low", low: null, high: 50, tone: "low" }],
    },
    convert: CHOL_MMOL,
  },
  TRIG: {
    us: {
      ...NCEP,
      unit: "mg/dL",
      bands: [
        { label: "Normal", low: null, high: 149, tone: "normal" },
        { label: "Borderline high", low: 150, high: 199, tone: "borderline" },
        { label: "High", low: 200, high: 499, tone: "high" },
        { label: "Very high", low: 500, high: null, tone: "high" },
      ],
    },
    india: {
      ...ICMR_INDIAB,
      unit: "mg/dL",
      bands: [
        { label: "Normal", low: null, high: 149, tone: "normal" },
        { label: "High", low: 150, high: null, tone: "high" },
      ],
    },
    convert: [{ unit: "mmol/L", factor: 0.01129 }],
  },

  // ── Liver ──
  ALT: {
    us: {
      source: MEDLINE,
      url: "https://medlineplus.gov/ency/article/003473.htm",
      unit: "U/L",
      bands: range(4, 36),
    },
    convert: [{ unit: "IU/L", factor: 1 }],
  },
  AST: {
    us: {
      source: MEDLINE,
      url: "https://medlineplus.gov/ency/article/003472.htm",
      unit: "U/L",
      bands: range(8, 33),
    },
    convert: [{ unit: "IU/L", factor: 1 }],
  },
  BILI_T: {
    us: {
      source: MEDLINE,
      url: "https://medlineplus.gov/ency/article/003479.htm",
      unit: "mg/dL",
      bands: range(0.1, 1.2),
    },
    india: {
      source: "ICMR Standard Treatment Workflow: Jaundice",
      url: "https://www.icmr.gov.in/icmrobject/uploads/STWs/1726567564_jaundice.pdf",
      unit: "mg/dL",
      bands: [{ label: "Jaundice work-up above", low: 1.5, high: null, tone: "high" }],
      note: "A threshold for further tests, not a full range",
    },
    convert: [{ unit: "µmol/L", factor: 17.1 }],
  },
  ALB: {
    us: {
      source: MEDLINE,
      url: "https://medlineplus.gov/ency/article/003480.htm",
      unit: "g/dL",
      bands: range(3.4, 5.4),
    },
    convert: [{ unit: "g/L", factor: 10 }],
  },

  // ── Thyroid ──
  TSH: {
    us: {
      source: MEDLINE,
      url: "https://medlineplus.gov/ency/article/003684.htm",
      unit: "µIU/mL",
      bands: range(0.4, 4.8),
      note: "Older adults can be a little higher",
    },
  },
  T3: {
    us: {
      source: MEDLINE,
      url: "https://medlineplus.gov/ency/article/003687.htm",
      unit: "ng/dL",
      bands: range(78, 158),
    },
    convert: [{ unit: "nmol/L", factor: 0.01536 }],
  },

  // ── Vitamins ──
  VITD: {
    us: {
      source: "NIH Office of Dietary Supplements",
      url: "https://ods.od.nih.gov/factsheets/VitaminD-HealthProfessional/",
      unit: "ng/mL",
      bands: [
        { label: "Deficient", low: null, high: 11.9, tone: "low" },
        { label: "Inadequate for some", low: 12, high: 19.9, tone: "borderline" },
        { label: "Sufficient", low: 20, high: 50, tone: "normal" },
        { label: "Possibly too high", low: 50.1, high: null, tone: "high" },
      ],
    },
    india: {
      source: "Comprehensive National Nutrition Survey 2016–18 (Ministry of Health)",
      url: "https://bmcpediatr.biomedcentral.com/counter/pdf/10.1186/s12887-021-02803-z.pdf",
      unit: "ng/mL",
      bands: [
        { label: "Deficient", low: null, high: 11.9, tone: "low" },
        { label: "Insufficient", low: 12, high: 19.9, tone: "borderline" },
        { label: "Adequate", low: 20, high: null, tone: "normal" },
      ],
      note: "Cut-offs from a national survey of children and adolescents",
    },
    convert: [{ unit: "nmol/L", factor: 2.496 }],
  },
  B12: {
    india: {
      source: "Comprehensive National Nutrition Survey 2016–18, using WHO cut-offs",
      url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10346745/",
      unit: "pg/mL",
      bands: [{ label: "Deficient", low: null, high: 203, tone: "low" }],
      note: "A deficiency cut-off (150 pmol/L), not a full range",
    },
    convert: [{ unit: "pmol/L", factor: 0.738 }],
  },

  // ── Readings you take at home ──
  "blood_glucose:FASTING": {
    us: { ...NIDDK, unit: "mg/dL", bands: FASTING, note: "Diagnosis needs a lab test" },
    india: { ...ICMR_T2DM, unit: "mg/dL", bands: FASTING, note: "Diagnosis needs a lab test" },
    convert: GLUCOSE_MMOL,
  },
  "blood_glucose:BEFORE_MEAL": {
    us: {
      source: "NIDDK (NIH): know your blood sugar numbers",
      url: "https://www.niddk.nih.gov/health-information/diabetes/overview/managing-diabetes/know-blood-sugar-numbers",
      unit: "mg/dL",
      bands: [{ label: "Target for people with diabetes", low: 80, high: 130, tone: "normal" }],
    },
    india: {
      ...ICMR_T2DM,
      unit: "mg/dL",
      bands: [{ label: "Target for people with diabetes", low: 80, high: 130, tone: "normal" }],
    },
    convert: GLUCOSE_MMOL,
  },
  "blood_glucose:AFTER_MEAL": {
    us: {
      source: "NIDDK (NIH): know your blood sugar numbers",
      url: "https://www.niddk.nih.gov/health-information/diabetes/overview/managing-diabetes/know-blood-sugar-numbers",
      unit: "mg/dL",
      bands: [
        {
          label: "Target for people with diabetes (2 hours after eating)",
          low: null,
          high: 179,
          tone: "normal",
        },
      ],
    },
    india: {
      ...ICMR_T2DM,
      unit: "mg/dL",
      bands: [
        {
          label: "Target for people with diabetes (2 hours after eating)",
          low: null,
          high: 179,
          tone: "normal",
        },
      ],
    },
    convert: GLUCOSE_MMOL,
  },
  "blood_glucose:RANDOM": {
    us: {
      source: "American Diabetes Association Standards of Care 2025",
      url: "https://diabetesjournals.org/care/article/48/Supplement_1/S27/157566/2-Diagnosis-and-Classification-of-Diabetes",
      unit: "mg/dL",
      bands: [{ label: "Diabetes, with symptoms", low: 200, high: null, tone: "high" }],
    },
    india: {
      source: "ICMR Standard Treatment Workflows: Endocrinology",
      url: "https://www.icmr.gov.in/icmrobject/uploads/STWs/1726567249_endocrinology_all.pdf",
      unit: "mg/dL",
      bands: [{ label: "Diabetes, with symptoms", low: 200, high: null, tone: "high" }],
    },
    convert: GLUCOSE_MMOL,
  },
  blood_pressure: {
    us: {
      source: "American Heart Association / ACC guideline",
      url: "https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings",
      unit: "mmHg",
      lines: [130, 80],
      summary:
        "Normal below 120/80; elevated 120–129 and below 80; high blood pressure from 130/80 (stage 2 from 140/90); seek care at once above 180/120",
    },
    india: {
      source: "Indian Guidelines on Hypertension-IV (2019)",
      url: "https://www.nature.com/articles/s41371-020-0349-x",
      unit: "mmHg",
      lines: [140, 90],
      summary:
        "Optimal below 120/80; normal 120–129/80–84; high normal 130–139/85–89; hypertension from 140/90 (stage 2 from 160/100, stage 3 from 180/110)",
      note: "India diagnoses high blood pressure at 140/90; the US at 130/80",
    },
  },
  heart_rate: {
    us: {
      source: "NHLBI (NIH)",
      url: "https://www.nhlbi.nih.gov/health/arrhythmias/types",
      unit: "bpm",
      bands: range(60, 100, "Typical resting range"),
      note: "Fit people can be lower, around 40–60",
    },
  },
  spo2: {
    us: {
      source: "MedlinePlus (NIH): pulse oximetry",
      url: "https://medlineplus.gov/lab-tests/pulse-oximetry/",
      unit: "%",
      bands: range(95, 100, "Typical range"),
      note: "Contact a doctor at 92% or less; get emergency care at 88% or less",
    },
    india: {
      source: "Ministry of Health clinical management protocol (COVID-19)",
      url: "https://covid19dashboard.mohfw.gov.in/pdf/ClinicalManagementProtocolforCOVID19dated27062020.pdf",
      unit: "%",
      lines: [94],
      summary: "Below 94% on room air needs medical attention",
      note: "Set for COVID-19 care, not a general normal range",
    },
  },
  temperature: {
    us: {
      source: "MedlinePlus (NIH): body temperature",
      url: "https://medlineplus.gov/ency/article/001982.htm",
      unit: "°F",
      bands: range(97, 99, "Typical range"),
      note: "Fever is above 100.4 °F (38 °C)",
    },
    india: {
      source: "Integrated Disease Surveillance Programme (Ministry of Health)",
      url: "https://idsp.mohfw.gov.in/WriteReadData/OldSite/Case_Def_P_Form.pdf",
      unit: "°F",
      bands: [{ label: "Fever", low: 100.4, high: null, tone: "high" }],
      note: "A fever threshold (38 °C); no Indian normal range is published",
    },
    convert: [{ unit: "°C", factor: 5 / 9, offset: -32 * (5 / 9) }],
  },
  sleep: {
    us: {
      source: "CDC",
      url: "https://cdc.gov/heart-disease/about/sleep-and-heart-health.html",
      unit: "hours",
      bands: [{ label: "Recommended for adults", low: 7, high: null, tone: "normal" }],
    },
  },
};
