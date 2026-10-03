import "server-only";
import { db } from "@/server/db";
import { getBiomarker, matchBiomarker } from "@/lib/catalog/biomarkers";
import { CONTEXT_LABELS } from "@/lib/catalog/metrics";
import { DOCUMENT_TYPE_LABELS, RECORD_TYPE_LABELS } from "@/lib/catalog/labels";
import { formatDate, formatDateTime } from "@/lib/format";
import { formatRange } from "@/lib/lab-range";
import { toNum } from "@/lib/utils";
import { isEmptyBundle } from "./bundle-utils";
import type {
  Citation,
  ContextBundle,
  DocumentHit,
  LabSeries,
  MeasurementSeries,
  PanelSummary,
  QuestionAnalysis,
  RecordHit,
} from "./types";

/**
 * Retrieval: select only the slices of a user's data that are relevant to the
 * question, with hard caps, and assign stable citation refs. Every query is
 * scoped by userId.
 */

const LIMITS = { pointsPerSeries: 30, labPointsPerSeries: 12, panels: 3, documents: 6, records: 8 };
const DEFAULT_MEASUREMENT_WINDOW_DAYS = 90;

class RefCounter {
  private n: Record<string, number> = {};
  citations: Citation[] = [];
  next(prefix: string, c: Omit<Citation, "ref">): string {
    this.n[prefix] = (this.n[prefix] ?? 0) + 1;
    const ref = `${prefix}${this.n[prefix]}`;
    this.citations.push({ ref, ...c });
    return ref;
  }
}

function snippet(text: string, terms: string[], radius = 110): string | null {
  const lower = text.toLowerCase();
  for (const t of terms) {
    const i = lower.indexOf(t.toLowerCase());
    if (i >= 0) {
      const start = Math.max(0, i - radius);
      const end = Math.min(text.length, i + t.length + radius);
      return `${start > 0 ? "…" : ""}${text.slice(start, end).replace(/\s+/g, " ").trim()}${end < text.length ? "…" : ""}`;
    }
  }
  return null;
}

async function loadMeasurements(
  userId: string,
  a: QuestionAnalysis,
  refs: RefCounter,
  all: boolean,
): Promise<MeasurementSeries[]> {
  const metrics = await db.healthMetric.findMany({
    where: { OR: [{ userId: null }, { userId }] },
    select: { id: true, key: true, name: true, unit: true, valueType: true, decimals: true },
  });
  const keyWords = a.keywords.map((k) => k.toLowerCase());
  const selected = metrics.filter(
    (m) =>
      all ||
      a.metricKeys.includes(m.key) ||
      keyWords.some((k) => m.name.toLowerCase().includes(k) && k.length >= 4),
  );
  if (!selected.length) return [];

  const from =
    a.range.from ??
    (all ? null : new Date(Date.now() - DEFAULT_MEASUREMENT_WINDOW_DAYS * 86_400_000));
  const out: MeasurementSeries[] = [];
  for (const m of selected) {
    const where = {
      userId,
      metricId: m.id,
      deletedAt: null,
      measuredAt: { ...(from ? { gte: from } : {}), lte: a.range.to },
    };
    const [agg, rows] = await Promise.all([
      db.healthMeasurement.aggregate({
        where,
        _count: true,
        _min: { value: true },
        _max: { value: true },
        _avg: { value: true, value2: true },
      }),
      db.healthMeasurement.findMany({
        where,
        orderBy: { measuredAt: "desc" },
        take: all ? 3 : LIMITS.pointsPerSeries,
      }),
    ]);
    if (!agg._count) continue;
    const [oldest] = await db.healthMeasurement.findMany({
      where,
      orderBy: { measuredAt: "asc" },
      take: 1,
      select: { value: true },
    });
    const points = rows.map((r) => ({
      ref: refs.next("M", {
        type: "measurement",
        id: r.id,
        label: `${m.name} · ${formatDate(r.measuredAt)}`,
        href: `/tracking/${m.key}`,
        date: r.measuredAt.toISOString(),
      }),
      id: r.id,
      value: toNum(r.value)!,
      value2: toNum(r.value2),
      at: r.measuredAt.toISOString(),
      context: r.context,
      notes: r.notes,
    }));
    out.push({
      metricKey: m.key,
      metricName: m.name,
      unit: m.unit,
      valueType: m.valueType,
      decimals: m.decimals,
      points,
      totalInRange: agg._count,
      stats: {
        count: agg._count,
        min: toNum(agg._min.value)!,
        max: toNum(agg._max.value)!,
        mean: Number(toNum(agg._avg.value)!.toFixed(m.decimals || 1)),
        mean2: agg._avg.value2 != null ? Number(toNum(agg._avg.value2)!.toFixed(0)) : undefined,
        first: toNum(oldest?.value) ?? points[points.length - 1]?.value ?? 0,
        last: points[0]?.value ?? 0,
      },
    });
  }
  return out;
}

async function loadLabSeries(
  userId: string,
  a: QuestionAnalysis,
  refs: RefCounter,
): Promise<LabSeries[]> {
  if (!a.biomarkerCodes.length) return [];
  const rows = await db.labResult.findMany({
    where: {
      userId,
      deletedAt: null,
      biomarkerCode: { in: a.biomarkerCodes },
      ...(a.range.from ? { observedAt: { gte: a.range.from, lte: a.range.to } } : {}),
    },
    orderBy: { observedAt: "desc" },
    take: 200,
  });
  const byKey = new Map<string, LabSeries>();
  for (const r of rows) {
    const key = r.biomarkerCode!;
    let s = byKey.get(key);
    if (!s) {
      const def = getBiomarker(key);
      s = {
        key,
        testName: def?.name ?? r.testName,
        biomarkerCode: key,
        unit: r.unit,
        description: def?.description ?? null,
        points: [],
      };
      byKey.set(key, s);
    }
    if (s.points.length >= LIMITS.labPointsPerSeries) continue;
    s.points.push({
      ref: refs.next("L", {
        type: "lab",
        id: r.id,
        label: `${r.testName} · ${formatDate(r.observedAt)}`,
        href: r.panelId ? `/labs/reports/${r.panelId}` : `/labs/tests/${encodeURIComponent(key)}`,
        date: r.observedAt.toISOString(),
      }),
      id: r.id,
      panelId: r.panelId,
      value: toNum(r.valueNumeric),
      valueText: r.valueText,
      at: r.observedAt.toISOString(),
      refLow: toNum(r.refLow),
      refHigh: toNum(r.refHigh),
      refText: r.refText,
      flag: r.flag,
      labName: r.labName,
    });
  }
  return [...byKey.values()];
}

async function loadPanels(
  userId: string,
  a: QuestionAnalysis,
  refs: RefCounter,
  take: number,
): Promise<PanelSummary[]> {
  const panels = await db.labPanel.findMany({
    where: {
      userId,
      deletedAt: null,
      ...(a.range.from ? { collectedAt: { gte: a.range.from, lte: a.range.to } } : {}),
      ...(a.biomarkerCodes.length
        ? { results: { some: { biomarkerCode: { in: a.biomarkerCodes }, deletedAt: null } } }
        : {}),
    },
    orderBy: { collectedAt: "desc" },
    take,
    include: { results: { where: { deletedAt: null }, orderBy: { testName: "asc" } } },
  });
  return panels.map((p) => ({
    ref: refs.next("P", {
      type: "panel",
      id: p.id,
      label: `${p.name} · ${formatDate(p.collectedAt)}`,
      href: `/labs/reports/${p.id}`,
      date: p.collectedAt.toISOString(),
    }),
    id: p.id,
    name: p.name,
    at: p.collectedAt.toISOString(),
    labName: p.labName,
    results: p.results.map((r) => ({
      testName: r.testName,
      biomarkerCode: r.biomarkerCode,
      value: toNum(r.valueNumeric),
      valueText: r.valueText,
      unit: r.unit,
      flag: r.flag,
      refLow: toNum(r.refLow),
      refHigh: toNum(r.refHigh),
      refText: r.refText,
    })),
  }));
}

async function loadDocuments(
  userId: string,
  a: QuestionAnalysis,
  refs: RefCounter,
): Promise<DocumentHit[]> {
  const terms = a.keywords.filter((k) => k.length >= 3).slice(0, 8);
  if (!terms.length) return [];
  const docs = await db.medicalDocument.findMany({
    where: {
      userId,
      deletedAt: null,
      OR: terms.flatMap((t) => [
        { name: { contains: t, mode: "insensitive" as const } },
        { extractedText: { contains: t, mode: "insensitive" as const } },
        { notes: { contains: t, mode: "insensitive" as const } },
        { tags: { has: t.toLowerCase() } },
      ]),
    },
    orderBy: [{ documentDate: "desc" }, { createdAt: "desc" }],
    take: LIMITS.documents,
    select: {
      id: true,
      name: true,
      type: true,
      documentDate: true,
      createdAt: true,
      providerName: true,
      extractedText: true,
      notes: true,
    },
  });
  return docs.map((d) => {
    const at = (d.documentDate ?? d.createdAt).toISOString();
    return {
      ref: refs.next("D", {
        type: "document",
        id: d.id,
        label: d.name,
        href: `/documents/${d.id}`,
        date: at,
      }),
      id: d.id,
      name: d.name,
      type: DOCUMENT_TYPE_LABELS[d.type],
      at,
      providerName: d.providerName,
      snippet: snippet(d.extractedText ?? "", terms) ?? snippet(d.notes ?? "", terms),
    };
  });
}

async function loadRecords(
  userId: string,
  a: QuestionAnalysis,
  refs: RefCounter,
  onlyVisits: boolean,
): Promise<RecordHit[]> {
  const terms = a.keywords.filter((k) => k.length >= 4).slice(0, 6);
  const rows = await db.medicalRecord.findMany({
    where: {
      userId,
      deletedAt: null,
      ...(a.range.from ? { date: { gte: a.range.from, lte: a.range.to } } : {}),
      ...(onlyVisits
        ? {
            type: {
              in: [
                "DOCTOR_VISIT",
                "HOSPITALIZATION",
                "PROCEDURE",
                "DIAGNOSIS",
                "PRESCRIPTION",
                "VACCINATION",
              ],
            },
          }
        : terms.length
          ? {
              OR: terms.flatMap((t) => [
                { title: { contains: t, mode: "insensitive" as const } },
                { notes: { contains: t, mode: "insensitive" as const } },
              ]),
            }
          : {}),
    },
    orderBy: { date: "desc" },
    take: LIMITS.records,
  });
  return rows.map((r) => ({
    ref: refs.next("R", {
      type: "record",
      id: r.id,
      label: `${r.title} · ${formatDate(r.date)}`,
      href: `/records/${r.id}`,
      date: r.date.toISOString(),
    }),
    id: r.id,
    title: r.title,
    type: RECORD_TYPE_LABELS[r.type],
    at: r.date.toISOString(),
    doctorName: r.doctorName,
    facilityName: r.facilityName,
    specialty: r.specialty,
    notes: r.notes ? r.notes.slice(0, 600) : null,
  }));
}

async function loadSummary(userId: string) {
  const [conditions, medications, allergies] = await Promise.all([
    db.condition.findMany({ where: { userId }, select: { name: true, status: true }, take: 20 }),
    db.medication.findMany({
      where: { userId },
      select: { name: true, dosage: true, frequency: true, active: true },
      orderBy: { active: "desc" },
      take: 20,
    }),
    db.allergy.findMany({
      where: { userId },
      select: { allergen: true, reaction: true, severity: true },
      take: 20,
    }),
  ]);
  return { conditions, medications, allergies };
}

export async function buildContext(
  userId: string,
  a: QuestionAnalysis,
  timezone: string,
): Promise<ContextBundle> {
  const refs = new RefCounter();
  const i = new Set(a.intents);
  const general = i.has("GENERAL") || i.has("DOCTOR_QUESTIONS");

  const measurements = await loadMeasurements(userId, a, refs, general && !a.metricKeys.length);
  const labs = await loadLabSeries(userId, a, refs);
  const panelCount = i.has("LAB_COMPARE")
    ? 2
    : i.has("LAB_SUMMARY") || general
      ? LIMITS.panels - (general ? 1 : 0)
      : 0;
  const panels = panelCount ? await loadPanels(userId, a, refs, panelCount) : [];
  const documents =
    i.has("DOCUMENT_SEARCH") || (i.has("GENERAL") && a.keywords.length)
      ? await loadDocuments(userId, a, refs)
      : [];
  const records = i.has("VISIT_SUMMARY") || general ? await loadRecords(userId, a, refs, true) : [];
  const summary =
    i.has("HEALTH_SUMMARY") || i.has("DOCTOR_QUESTIONS") || i.has("GENERAL")
      ? await loadSummary(userId)
      : null;

  const explanations = new Map<string, string>();
  for (const code of a.biomarkerCodes) {
    const def = getBiomarker(code);
    if (def && (i.has("EXPLAIN_TERM") || labs.some((l) => l.biomarkerCode === code)))
      explanations.set(def.name, def.description);
  }
  for (const p of panels)
    for (const r of p.results) {
      const def = r.biomarkerCode ? getBiomarker(r.biomarkerCode) : matchBiomarker(r.testName);
      if (def && i.has("EXPLAIN_TERM")) explanations.set(def.name, def.description);
    }

  return {
    analysis: a,
    generatedAt: new Date().toISOString(),
    timezone,
    measurements,
    labs,
    panels,
    documents,
    records,
    summary,
    citations: refs.citations,
    explanations: [...explanations].map(([term, description]) => ({ term, description })),
  };
}

function fmtVal(v: number | null, text: string | null) {
  return v !== null ? String(v) : (text ?? "—");
}

/** Serialise the bundle as compact text for an LLM. */
export function renderContext(b: ContextBundle): string {
  const tz = b.timezone;
  const L: string[] = [];
  L.push(
    `Today: ${formatDate(b.generatedAt, tz)}. Time zone: ${tz}. Period considered: ${b.analysis.range.label}.`,
  );

  for (const s of b.measurements) {
    L.push(`\n## Recorded ${s.metricName} (${s.unit}) — ${s.totalInRange} reading(s) in period`);
    if (s.stats) {
      L.push(
        `Calculated: min ${s.stats.min}, max ${s.stats.max}, average ${s.stats.mean}${s.stats.mean2 !== undefined ? ` (diastolic average ${s.stats.mean2})` : ""}, earliest ${s.stats.first}, latest ${s.stats.last}.`,
      );
    }
    if (s.totalInRange > s.points.length) L.push(`Showing the most recent ${s.points.length}:`);
    for (const p of s.points) {
      const val =
        s.valueType === "DUAL" && p.value2 !== null ? `${p.value}/${p.value2}` : `${p.value}`;
      L.push(
        `[${p.ref}] ${formatDateTime(p.at, tz)} — ${val} ${s.unit}${p.context ? ` (${CONTEXT_LABELS[p.context] ?? p.context})` : ""}${p.notes ? ` — note: ${p.notes}` : ""}`,
      );
    }
  }

  for (const s of b.labs) {
    L.push(`\n## Lab test history: ${s.testName}`);
    for (const p of s.points) {
      const range = formatRange(p.refLow, p.refHigh, p.refText);
      L.push(
        `[${p.ref}] ${formatDate(p.at, tz)} — ${fmtVal(p.value, p.valueText)} ${s.unit ?? ""}${range ? ` (report reference range: ${range})` : " (no reference range on report)"}${p.flag !== "UNKNOWN" ? ` [report-range flag: ${p.flag}]` : ""}${p.labName ? ` — ${p.labName}` : ""}`,
      );
    }
  }

  for (const p of b.panels) {
    L.push(
      `\n## Lab report [${p.ref}] ${p.name} — ${formatDate(p.at, tz)}${p.labName ? ` — ${p.labName}` : ""}`,
    );
    for (const r of p.results) {
      const range = formatRange(r.refLow, r.refHigh, r.refText);
      L.push(
        `- ${r.testName}: ${fmtVal(r.value, r.valueText)} ${r.unit ?? ""}${range ? ` (range on report: ${range})` : ""}${r.flag !== "UNKNOWN" && r.flag !== "NORMAL" ? ` [${r.flag}]` : ""}`,
      );
    }
  }

  for (const r of b.records) {
    L.push(`\n## Medical record [${r.ref}] ${r.type}: ${r.title} — ${formatDate(r.at, tz)}`);
    const who = [r.doctorName, r.specialty, r.facilityName].filter(Boolean).join(", ");
    if (who) L.push(who);
    if (r.notes) L.push(`Notes: ${r.notes}`);
  }

  for (const d of b.documents) {
    L.push(
      `\n## Document [${d.ref}] ${d.name} (${d.type}) — ${formatDate(d.at, tz)}${d.providerName ? ` — ${d.providerName}` : ""}`,
    );
    if (d.snippet) L.push(`Excerpt: "${d.snippet}"`);
  }

  if (b.summary) {
    const s = b.summary;
    if (s.conditions.length)
      L.push(
        `\n## Conditions the user recorded\n${s.conditions.map((c) => `- ${c.name} (${c.status.toLowerCase()})`).join("\n")}`,
      );
    if (s.medications.length)
      L.push(
        `\n## Medications the user recorded (as written on prescriptions)\n${s.medications.map((m) => `- ${m.name}${m.dosage ? ` ${m.dosage}` : ""}${m.frequency ? `, ${m.frequency}` : ""}${m.active ? "" : " (stopped)"}`).join("\n")}`,
      );
    if (s.allergies.length)
      L.push(
        `\n## Allergies the user recorded\n${s.allergies.map((x) => `- ${x.allergen}${x.reaction ? ` — ${x.reaction}` : ""}`).join("\n")}`,
      );
  }

  if (b.explanations.length) {
    L.push(`\n## General reference descriptions (not patient data)`);
    for (const e of b.explanations) L.push(`- ${e.term}: ${e.description}`);
  }
  if (isEmptyBundle(b))
    L.push("\n(No matching records were found in the user's data for this question.)");
  return L.join("\n");
}
