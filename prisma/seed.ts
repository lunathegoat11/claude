/**
 * Seed script.
 *
 * 1. Always: creates the built-in health-tracking metric definitions.
 * 2. Unless SEED_DEMO=false: creates a shared DEMO account for a clearly
 *    FICTIONAL patient ("Ananya Sharma") with ~18 months of sample records.
 *
 * All demo names, clinics, laboratories and values are invented. Any
 * resemblance to real people or organisations is coincidental.
 *
 * Run with: npm run db:seed   (uses `tsx --conditions=react-server`)
 */
import { db } from "@/server/db";
import { hashPassword } from "@/server/auth/password";
import { ensureSystemMetrics } from "@/server/services/system-metrics";
import { createRecord } from "@/server/services/records";
import { createLabPanel } from "@/server/services/labs";
import { createMeasurement, listMetrics } from "@/server/services/measurements";
import { uploadDocument } from "@/server/services/documents";
import { upsertAllergy, upsertCondition, upsertMedication } from "@/server/services/profile";
import { ask } from "@/server/services/assistant";
import { parseZonedInput, toDateInputValue, toDateTimeInputValue } from "@/lib/format";
import { buildPdf, labReportPdf } from "./fixtures/simple-pdf";

const TZ = "Asia/Kolkata";
export const DEMO_EMAIL = "demo@kosha.example";
const DEMO_PASSWORD = "demo-password-123";
const PATIENT = "Ananya Sharma (fictional demo patient)";

// Deterministic PRNG so the demo looks the same on every seed.
let seed = 20260903;
function rand() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}
const between = (a: number, b: number) => a + (b - a) * rand();
const round = (n: number, d = 0) => Number(n.toFixed(d));

const now = new Date();
const daysAgo = (d: number, hour = 9, minute = 0) => {
  const base = new Date(now.getTime() - d * 86_400_000);
  const ymd = toDateInputValue(base, TZ);
  return `${ymd}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};
const dateOnly = (d: number) => toDateInputValue(new Date(now.getTime() - d * 86_400_000), TZ);
const ddmmyyyy = (d: number) => dateOnly(d).split("-").reverse().join("/");

async function resetDemoUser() {
  const existing = await db.user.findUnique({ where: { email: DEMO_EMAIL }, select: { id: true } });
  if (existing) {
    const docs = await db.medicalDocument.findMany({
      where: { userId: existing.id },
      select: { storageKey: true },
    });
    const { storage } = await import("@/server/storage");
    for (const d of docs)
      await storage()
        .delete(d.storageKey)
        .catch(() => undefined);
    await db.user.delete({ where: { id: existing.id } });
  }
  return db.user.create({
    data: {
      email: DEMO_EMAIL,
      passwordHash: await hashPassword(DEMO_PASSWORD),
      isDemo: true,
      emailVerified: new Date(),
      profile: {
        create: {
          fullName: "Ananya Sharma",
          dateOfBirth: new Date("1985-07-14T06:30:00.000Z"),
          sex: "FEMALE",
          phone: "+919800000001",
          city: "Pune",
          state: "Maharashtra",
          bloodGroup: "B_POS",
          heightCm: 162,
          emergencyContactName: "Rahul Sharma",
          emergencyContactPhone: "+919800000002",
          emergencyContactRelation: "Spouse",
          glucoseUnit: "MG_DL",
          weightUnit: "KG",
          temperatureUnit: "F",
        },
      },
    },
  });
}

async function seedDemo() {
  const user = await resetDemoUser();
  const uid = user.id;
  console.log(`  demo user ${DEMO_EMAIL}`);

  // ── Health summary ────────────────────────────────────────
  await upsertCondition(
    uid,
    null,
    {
      name: "Hypothyroidism",
      status: "MANAGED",
      diagnosedOn: dateOnly(700),
      notes: "On thyroid replacement since diagnosis.",
    },
    TZ,
  );
  await upsertCondition(
    uid,
    null,
    {
      name: "Prediabetes",
      status: "ACTIVE",
      diagnosedOn: dateOnly(560),
      notes: "Lifestyle changes advised by endocrinologist.",
    },
    TZ,
  );
  await upsertCondition(
    uid,
    null,
    { name: "Dengue fever", status: "RESOLVED", diagnosedOn: dateOnly(395) },
    TZ,
  );
  await upsertMedication(
    uid,
    null,
    {
      name: "Levothyroxine",
      dosage: "50 mcg",
      frequency: "Once daily, before breakfast",
      startDate: dateOnly(700),
      prescribedBy: "Dr. Kavya Iyer",
      active: "on",
    },
    TZ,
  );
  await upsertMedication(
    uid,
    null,
    {
      name: "Cholecalciferol (Vitamin D3)",
      dosage: "60,000 IU",
      frequency: "Once a week for 8 weeks",
      startDate: dateOnly(560),
      endDate: dateOnly(504),
      prescribedBy: "Dr. Rohan Mehta",
      active: "",
    },
    TZ,
  );
  await upsertAllergy(uid, null, {
    allergen: "Penicillin",
    reaction: "Skin rash and itching",
    severity: "MODERATE",
  });
  await upsertAllergy(uid, null, {
    allergen: "House dust mites",
    reaction: "Sneezing, blocked nose",
    severity: "MILD",
  });

  // ── Medical records ───────────────────────────────────────
  const rec = async (d: Record<string, string | string[] | undefined>) => createRecord(uid, d, TZ);
  await rec({
    type: "PRESCRIPTION",
    title: "Thyroid medication started",
    date: dateOnly(700),
    doctorName: "Dr. Kavya Iyer",
    facilityName: "Riverside Family Clinic, Pune",
    specialty: "Endocrinology",
    notes: "Levothyroxine 50 mcg once daily on an empty stomach. Repeat TSH after 6–8 weeks.",
    tags: ["thyroid"],
  });
  await rec({
    type: "FAMILY_HISTORY",
    title: "Family history of diabetes and thyroid disease",
    date: dateOnly(690),
    notes: "Father: type 2 diabetes (diagnosed at 52). Mother: hypothyroidism.",
    tags: ["family", "diabetes"],
  });
  await rec({
    type: "ALLERGY",
    title: "Penicillin allergy",
    date: dateOnly(680),
    doctorName: "Dr. Rohan Mehta",
    notes: "Developed a rash after amoxicillin in 2019. Avoid penicillin-group antibiotics.",
    tags: ["allergy"],
  });
  const checkup = await rec({
    type: "DOCTOR_VISIT",
    title: "Annual health check-up",
    date: dateOnly(574),
    doctorName: "Dr. Rohan Mehta",
    facilityName: "Riverside Family Clinic, Pune",
    specialty: "General Medicine",
    notes:
      "Routine yearly check-up. Blood tests ordered: CBC, sugar profile, lipid profile, thyroid, LFT, KFT and vitamin D. Blood pressure 128/84 mmHg in clinic.",
    tags: ["check-up", "annual"],
  });
  await rec({
    type: "DIAGNOSIS",
    title: "Prediabetes noted",
    date: dateOnly(560),
    doctorName: "Dr. Kavya Iyer",
    facilityName: "Riverside Family Clinic, Pune",
    specialty: "Endocrinology",
    notes:
      "Fasting glucose and HbA1c reviewed. Advised 150 minutes of exercise a week, reduce refined carbohydrates, recheck HbA1c in 6 months. Home glucose monitoring suggested.",
    tags: ["diabetes", "glucose"],
  });
  await rec({
    type: "PROCEDURE",
    title: "Dental filling (lower molar)",
    date: dateOnly(440),
    doctorName: "Dr. Neha Joshi",
    facilityName: "Smile Studio Dental Care",
    specialty: "Dentistry",
    notes: "Composite filling, no complications.",
    tags: ["dental"],
  });
  const dengue = await rec({
    type: "HOSPITALIZATION",
    title: "Admitted with dengue fever",
    date: dateOnly(397),
    endDate: dateOnly(393),
    doctorName: "Dr. Arjun Rao",
    facilityName: "Greenfield Multispeciality Hospital, Pune",
    specialty: "Internal Medicine",
    notes:
      "High fever for 3 days, body ache. NS1 antigen positive. Platelet count monitored daily; lowest 0.9 lakh/µL. IV fluids given. Discharged after 4 days in stable condition.",
    tags: ["dengue", "fever", "hospital"],
  });
  await rec({
    type: "VACCINATION",
    title: "Influenza vaccine (annual)",
    date: dateOnly(360),
    facilityName: "Riverside Family Clinic, Pune",
    notes: "Quadrivalent influenza vaccine, left arm. No reaction.",
    tags: ["vaccine", "flu"],
  });
  await rec({
    type: "DOCTOR_VISIT",
    title: "Endocrinology follow-up",
    date: dateOnly(208),
    doctorName: "Dr. Kavya Iyer",
    facilityName: "Riverside Family Clinic, Pune",
    specialty: "Endocrinology",
    notes:
      "HbA1c 5.5%. TSH within range on current dose. Lipids improved. Continue current plan, walking 30 minutes daily. Review in 6 months with HbA1c, lipid profile and TSH.",
    tags: ["diabetes", "thyroid", "follow-up"],
  });
  await rec({
    type: "DOCTOR_VISIT",
    title: "Eye check-up",
    date: dateOnly(140),
    doctorName: "Dr. S. Banerjee",
    facilityName: "ClearSight Eye Centre",
    specialty: "Ophthalmology",
    notes: "Mild myopia, power unchanged. No signs of retinal changes. Annual review.",
    tags: ["eyes"],
  });
  const followup = await rec({
    type: "DOCTOR_VISIT",
    title: "Endocrinology follow-up",
    date: dateOnly(15),
    doctorName: "Dr. Kavya Iyer",
    facilityName: "Riverside Family Clinic, Pune",
    specialty: "Endocrinology",
    notes:
      "HbA1c 5.7% and fasting glucose 109 mg/dL on latest report. Home readings reviewed. Discussed diet and activity. Repeat HbA1c in 3 months. Blood pressure 126/82 mmHg in clinic.",
    tags: ["diabetes", "follow-up", "blood-pressure"],
  });
  await rec({
    type: "VACCINATION",
    title: "Influenza vaccine (annual)",
    date: dateOnly(6),
    facilityName: "Riverside Family Clinic, Pune",
    notes: "Annual flu shot.",
    tags: ["vaccine", "flu"],
  });

  // ── Lab reports (+ PDF documents) ─────────────────────────
  type Row = {
    test: string;
    code?: string;
    value: string;
    unit: string;
    low?: number;
    high?: number;
    refText?: string;
    flag?: "H" | "L";
  };
  async function panel(opts: {
    name: string;
    category: string;
    daysAgo: number;
    lab: string;
    rows: Row[];
    pdf?: { title: string; docName: string; recordId?: string };
  }) {
    let documentId: string | undefined;
    if (opts.pdf) {
      const buffer = labReportPdf({
        lab: opts.lab,
        address: "Fictional address, Pune, Maharashtra",
        patient: PATIENT,
        collected: ddmmyyyy(opts.daysAgo),
        title: opts.pdf.title,
        rows: opts.rows.map((r) => ({
          test: r.test,
          value: r.value,
          unit: r.unit,
          range:
            r.refText ??
            (r.low !== undefined && r.high !== undefined
              ? `${r.low} - ${r.high}`
              : r.high !== undefined
                ? `< ${r.high}`
                : r.low !== undefined
                  ? `> ${r.low}`
                  : ""),
          flag: r.flag,
        })),
      });
      const up = await uploadDocument(
        uid,
        {
          buffer,
          filename: `${opts.pdf.docName.replace(/\W+/g, "-").toLowerCase()}.pdf`,
          declaredMime: "application/pdf",
        },
        {
          name: opts.pdf.docName,
          type: "LAB_REPORT",
          documentDate: dateOnly(opts.daysAgo),
          providerName: opts.lab,
          tags: ["lab", opts.category.toLowerCase()],
          recordId: opts.pdf.recordId,
        },
        TZ,
      );
      documentId = up.document.id;
      if (up.importJobId)
        await db.importJob.update({
          where: { id: up.importJobId },
          data: { status: "CONFIRMED", confirmedAt: new Date() },
        });
    }
    return createLabPanel(
      uid,
      {
        name: opts.name,
        category: opts.category,
        collectedAt: daysAgo(opts.daysAgo, 8, 15),
        labName: opts.lab,
        documentId,
        results: opts.rows.map((r) => ({
          testName: r.test,
          biomarkerCode: r.code,
          value: r.value,
          unit: r.unit,
          refLow: r.low !== undefined ? String(r.low) : "",
          refHigh: r.high !== undefined ? String(r.high) : "",
          refText: r.refText,
          labFlag: r.flag === "H" ? "HIGH" : r.flag === "L" ? "LOW" : undefined,
        })),
      },
      TZ,
      "DEMO",
    );
  }

  const LAB_A = "Kamala Diagnostics, Pune";
  const LAB_B = "Greenfield Hospital Laboratory";

  // ~19 months ago — annual check-up
  await panel({
    name: "Complete Blood Count (CBC)",
    category: "CBC",
    daysAgo: 574,
    lab: LAB_A,
    rows: [
      { test: "Hemoglobin", value: "12.6", unit: "g/dL", low: 12.0, high: 15.5 },
      { test: "Hematocrit", value: "38.4", unit: "%", low: 36, high: 46 },
      { test: "RBC count", value: "4.32", unit: "million/µL", low: 3.9, high: 5.0 },
      { test: "WBC count", value: "6800", unit: "/µL", low: 4000, high: 11000 },
      { test: "Platelet count", value: "2.45", unit: "lakh/µL", low: 1.5, high: 4.1 },
    ],
  });
  await panel({
    name: "Blood Sugar Profile",
    category: "DIABETES",
    daysAgo: 574,
    lab: LAB_A,
    pdf: {
      title: "BLOOD SUGAR PROFILE",
      docName: "Blood sugar & HbA1c report",
      recordId: checkup.id,
    },
    rows: [
      { test: "Glucose, fasting", value: "104", unit: "mg/dL", low: 70, high: 100, flag: "H" },
      { test: "Glucose, post-prandial", value: "138", unit: "mg/dL", low: 70, high: 140 },
      { test: "HbA1c", value: "5.4", unit: "%", low: 4.0, high: 5.6 },
    ],
  });
  await panel({
    name: "Lipid Profile",
    category: "LIPID",
    daysAgo: 574,
    lab: LAB_A,
    pdf: { title: "LIPID PROFILE", docName: "Lipid profile report", recordId: checkup.id },
    rows: [
      { test: "Total cholesterol", value: "212", unit: "mg/dL", high: 200, flag: "H" },
      { test: "LDL cholesterol", value: "138", unit: "mg/dL", high: 100, flag: "H" },
      { test: "HDL cholesterol", value: "46", unit: "mg/dL", low: 40 },
      { test: "Triglycerides", value: "160", unit: "mg/dL", high: 150, flag: "H" },
    ],
  });
  await panel({
    name: "Thyroid Profile",
    category: "THYROID",
    daysAgo: 574,
    lab: LAB_A,
    rows: [
      { test: "TSH", value: "5.8", unit: "µIU/mL", low: 0.4, high: 4.5, flag: "H" },
      { test: "T3, total", value: "102", unit: "ng/dL", low: 80, high: 200 },
      { test: "T4, total", value: "6.9", unit: "µg/dL", low: 5.1, high: 14.1 },
    ],
  });
  await panel({
    name: "Liver & Kidney Function",
    category: "LIVER",
    daysAgo: 574,
    lab: LAB_A,
    rows: [
      { test: "ALT (SGPT)", value: "28", unit: "U/L", high: 35 },
      { test: "AST (SGOT)", value: "24", unit: "U/L", high: 35 },
      { test: "Bilirubin, total", value: "0.6", unit: "mg/dL", low: 0.2, high: 1.2 },
      { test: "Albumin", value: "4.3", unit: "g/dL", low: 3.5, high: 5.2 },
      { test: "Creatinine", value: "0.78", unit: "mg/dL", low: 0.55, high: 1.02 },
      { test: "Urea", value: "24", unit: "mg/dL", low: 15, high: 40 },
      { test: "Sodium", value: "139", unit: "mmol/L", low: 136, high: 145 },
      { test: "Potassium", value: "4.2", unit: "mmol/L", low: 3.5, high: 5.1 },
    ],
  });
  await panel({
    name: "Vitamin D (25-OH)",
    category: "VITAMINS",
    daysAgo: 574,
    lab: LAB_A,
    rows: [
      { test: "Vitamin D (25-OH)", value: "18.2", unit: "ng/mL", low: 30, high: 100, flag: "L" },
    ],
  });

  // ~13 months ago — dengue admission
  await panel({
    name: "CBC during admission",
    category: "CBC",
    daysAgo: 396,
    lab: LAB_B,
    pdf: {
      title: "HAEMATOLOGY - COMPLETE BLOOD COUNT",
      docName: "CBC report (hospital)",
      recordId: dengue.id,
    },
    rows: [
      { test: "Hemoglobin", value: "12.4", unit: "g/dL", low: 12.0, high: 15.0 },
      { test: "Hematocrit", value: "41.2", unit: "%", low: 36, high: 46 },
      { test: "WBC count", value: "3200", unit: "/µL", low: 4000, high: 10000, flag: "L" },
      { test: "Platelet count", value: "0.9", unit: "lakh/µL", low: 1.5, high: 4.0, flag: "L" },
    ],
  });
  await panel({
    name: "Blood Sugar Profile",
    category: "DIABETES",
    daysAgo: 386,
    lab: LAB_A,
    rows: [
      { test: "Glucose, fasting", value: "108", unit: "mg/dL", low: 70, high: 100, flag: "H" },
      { test: "HbA1c", value: "5.6", unit: "%", low: 4.0, high: 5.6 },
    ],
  });

  // ~7 months ago — follow-up
  await panel({
    name: "Follow-up Panel",
    category: "DIABETES",
    daysAgo: 212,
    lab: LAB_A,
    pdf: { title: "FOLLOW-UP PANEL", docName: "Follow-up blood test report" },
    rows: [
      { test: "Glucose, fasting", value: "99", unit: "mg/dL", low: 70, high: 100 },
      { test: "HbA1c", value: "5.5", unit: "%", low: 4.0, high: 5.6 },
      { test: "Total cholesterol", value: "196", unit: "mg/dL", high: 200 },
      { test: "LDL cholesterol", value: "122", unit: "mg/dL", high: 100, flag: "H" },
      { test: "HDL cholesterol", value: "50", unit: "mg/dL", low: 40 },
      { test: "Triglycerides", value: "140", unit: "mg/dL", high: 150 },
      { test: "TSH", value: "2.9", unit: "µIU/mL", low: 0.4, high: 4.5 },
      { test: "Hemoglobin", value: "13.1", unit: "g/dL", low: 12.0, high: 15.5 },
      { test: "Vitamin D (25-OH)", value: "32.5", unit: "ng/mL", low: 30, high: 100 },
    ],
  });

  // ~3 weeks ago — latest
  await panel({
    name: "Diabetes & Lipid Review",
    category: "DIABETES",
    daysAgo: 21,
    lab: LAB_A,
    pdf: {
      title: "DIABETES & LIPID REVIEW",
      docName: "Diabetes & lipid review report",
      recordId: followup.id,
    },
    rows: [
      { test: "Glucose, fasting", value: "109", unit: "mg/dL", low: 70, high: 100, flag: "H" },
      {
        test: "Glucose, post-prandial",
        value: "146",
        unit: "mg/dL",
        low: 70,
        high: 140,
        flag: "H",
      },
      { test: "HbA1c", value: "5.7", unit: "%", low: 4.0, high: 5.6, flag: "H" },
      { test: "Total cholesterol", value: "188", unit: "mg/dL", high: 200 },
      { test: "LDL cholesterol", value: "116", unit: "mg/dL", high: 100, flag: "H" },
      { test: "HDL cholesterol", value: "52", unit: "mg/dL", low: 40 },
      { test: "Triglycerides", value: "132", unit: "mg/dL", high: 150 },
      { test: "TSH", value: "3.1", unit: "µIU/mL", low: 0.4, high: 4.5 },
      { test: "Hemoglobin", value: "13.4", unit: "g/dL", low: 12.0, high: 15.5 },
      { test: "Creatinine", value: "0.81", unit: "mg/dL", low: 0.55, high: 1.02 },
    ],
  });

  // A report whose values have NOT been confirmed yet → demonstrates the review step.
  await uploadDocument(
    uid,
    {
      buffer: labReportPdf({
        lab: "Kamala Diagnostics, Pune",
        address: "Fictional address, Pune, Maharashtra",
        patient: PATIENT,
        collected: ddmmyyyy(4),
        title: "VITAMIN PROFILE",
        rows: [
          { test: "Vitamin D (25-OH)", value: "29.1", unit: "ng/mL", range: "30 - 100", flag: "L" },
          { test: "Vitamin B12", value: "312", unit: "pg/mL", range: "211 - 911" },
          { test: "Hemoglobin", value: "13.2", unit: "g/dL", range: "12.0 - 15.5" },
        ],
      }),
      filename: "vitamin-profile.pdf",
      declaredMime: "application/pdf",
    },
    {
      name: "Vitamin profile report",
      type: "LAB_REPORT",
      documentDate: dateOnly(4),
      providerName: "Kamala Diagnostics, Pune",
      tags: ["lab", "vitamins"],
    },
    TZ,
  );

  // Non-lab documents
  const doc = async (
    name: string,
    type: string,
    d: number,
    provider: string,
    lines: string[],
    tags: string[],
    recordId?: string,
  ) =>
    uploadDocument(
      uid,
      {
        buffer: buildPdf([
          { text: provider, size: 15, bold: true },
          { text: "SAMPLE DOCUMENT - FICTIONAL DEMO DATA", size: 8, bold: true, gap: 4 },
          { text: name.toUpperCase(), size: 12.5, bold: true, gap: 14 },
          { text: `Patient: ${PATIENT}`, gap: 6 },
          { text: `Date: ${ddmmyyyy(d)}` },
          ...lines.map((t, i) => ({ text: t, gap: i === 0 ? 10 : 0 })),
        ]),
        filename: `${name.replace(/\W+/g, "-").toLowerCase()}.pdf`,
        declaredMime: "application/pdf",
      },
      { name, type, documentDate: dateOnly(d), providerName: provider, tags, recordId },
      TZ,
    );

  await doc(
    "Discharge summary - dengue fever",
    "DISCHARGE_SUMMARY",
    393,
    "Greenfield Multispeciality Hospital, Pune",
    [
      "Diagnosis: Dengue fever (NS1 antigen positive), without warning signs.",
      "Admitted with fever for 3 days, myalgia and headache.",
      "Course: managed with IV fluids and paracetamol. Platelet count lowest 0.9 lakh/uL, recovered to 1.6 lakh/uL at discharge.",
      "Blood pressure at discharge 118/76 mmHg. Pulse 82/min. Afebrile for 48 hours.",
      "Advice at discharge: oral fluids, rest, repeat CBC after 5 days. Review with physician.",
    ],
    ["dengue", "hospital"],
    dengue.id,
  );
  await doc(
    "Prescription - endocrinology follow-up",
    "PRESCRIPTION",
    15,
    "Riverside Family Clinic, Pune",
    [
      "Dr. Kavya Iyer, MD (Endocrinology) - Reg. no. DEMO-0000",
      "Rx: Tab. Levothyroxine 50 mcg - once daily before breakfast - continue.",
      "Advice: 30-45 minutes brisk walk daily, limit sugary drinks and refined flour.",
      "Home monitoring: fasting blood glucose 3 times a week; blood pressure twice a week.",
      "Review after 3 months with HbA1c.",
    ],
    ["prescription", "diabetes", "thyroid", "blood-pressure"],
    followup.id,
  );
  await doc(
    "Influenza vaccination certificate",
    "VACCINATION_RECORD",
    6,
    "Riverside Family Clinic, Pune",
    [
      "Vaccine: Influenza (quadrivalent), 0.5 mL intramuscular, left deltoid.",
      "Batch: DEMO-FLU-001. Next dose due: next season.",
    ],
    ["vaccine", "flu"],
  );
  await doc(
    "Health insurance policy summary",
    "INSURANCE",
    300,
    "Example Health Insurance Co. (fictional)",
    [
      "Policy type: Individual health insurance (sample). Policy no. DEMO-123456.",
      "Sum insured: Rs. 5,00,000 per policy year. Room rent limit: 1% of sum insured per day.",
      "Pre-existing disease waiting period: 3 years. Annual health check-up included.",
    ],
    ["insurance"],
  );

  // ── Home measurements ─────────────────────────────────────
  const metrics = await listMetrics(uid);
  const M = Object.fromEntries(metrics.map((m) => [m.key, m.id]));
  const add = async (
    metric: string,
    d: number,
    h: number,
    mi: number,
    value: number,
    extra: Record<string, string> = {},
    clampToNow = false,
  ) => {
    let measuredAt = daysAgo(d, h, mi);
    if (parseZonedInput(measuredAt, TZ)!.getTime() > Date.now()) {
      if (!clampToNow) return;
      measuredAt = toDateTimeInputValue(new Date(Date.now() - 10 * 60_000), TZ);
    }
    return createMeasurement(
      uid,
      {
        metricId: M[metric],
        value: String(value),
        unit: extra.unit ?? metrics.find((m) => m.id === M[metric])!.unit,
        measuredAt,
        ...extra,
      },
      TZ,
    );
  };

  let count = 0;
  for (let d = 120; d >= 0; d--) {
    const drift = (120 - d) / 120; // slow upward drift in fasting glucose
    if (d % 2 === 0 || d < 10) {
      await add(
        "blood_glucose",
        d,
        7,
        30 + Math.floor(rand() * 25),
        round(between(94, 108) + drift * 5),
        { context: "FASTING" },
      );
      count++;
    }
    if (d % 3 === 0) {
      await add("blood_glucose", d, 14, Math.floor(rand() * 50), round(between(122, 158)), {
        context: "AFTER_MEAL",
        notes: rand() > 0.7 ? "Lunch with rice and dal" : "",
      });
      count++;
    }
    if (d % 3 === 1) {
      const sys = round(between(116, 132)),
        dia = round(between(74, 86));
      await add("blood_pressure", d, 8, 5 + Math.floor(rand() * 20), sys, {
        value2: String(dia),
        context: "MORNING",
      });
      count++;
    }
    if (d % 2 === 1 || d < 7) {
      await add("heart_rate", d, 8, 10, round(between(66, 82)), { context: "RESTING" });
      count++;
    }
    if (d % 7 === 0) {
      await add("weight", d, 7, 0, round(69.4 - (120 - d) * 0.011 + between(-0.3, 0.3), 1));
      count++;
    }
    if (d % 10 === 0) {
      await add("spo2", d, 8, 20, round(between(97, 99.4)), { context: "RESTING" });
      count++;
    }
    if (d <= 30) {
      await add("sleep", d, 6, 45, round(between(5.8, 8.1), 1));
      count++;
    }
    if (d <= 30 && d % 2 === 0) {
      await add("exercise", d, 19, 0, round(between(20, 50)), { notes: "Brisk walk" });
      count++;
    }
  }
  // Today's reading → dashboard shows "Today, 8:32 AM"
  await add(
    "blood_glucose",
    0,
    8,
    32,
    108,
    { context: "FASTING", notes: "Before breakfast" },
    true,
  );
  // Temperature during the dengue admission
  for (const [d, h, v] of [
    [399, 20, 101.8],
    [398, 8, 102.4],
    [398, 20, 101.2],
    [397, 9, 100.6],
    [395, 9, 99.2],
    [393, 9, 98.4],
  ] as const) {
    await add("temperature", d, h, 0, v, { notes: d >= 397 ? "Fever with body ache" : "" });
    count++;
  }
  await add("temperature", 30, 9, 0, 98.2);
  console.log(`  ${count + 2} measurements`);

  // ── An example assistant conversation (generated by the grounded demo provider) ──
  await ask(uid, { message: "Show me my HbA1c trend" }, TZ);

  // Mark everything as demo data.
  await Promise.all([
    db.medicalRecord.updateMany({ where: { userId: uid }, data: { isDemo: true } }),
    db.medicalDocument.updateMany({ where: { userId: uid }, data: { isDemo: true } }),
    db.labPanel.updateMany({ where: { userId: uid }, data: { isDemo: true } }),
    db.labResult.updateMany({ where: { userId: uid }, data: { isDemo: true } }),
    db.healthMeasurement.updateMany({ where: { userId: uid }, data: { isDemo: true } }),
  ]);
}

async function main() {
  console.log("Seeding…");
  await ensureSystemMetrics(true);
  console.log("  system metrics ready");
  if (process.env.SEED_DEMO !== "false") await seedDemo();
  console.log(
    `Done.${process.env.SEED_DEMO !== "false" ? ` Demo login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}` : ""}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
