import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { findBiomarkersInText, getBiomarker } from "@/lib/catalog/biomarkers";
import { RECORD_TYPE_LABELS } from "@/lib/catalog/labels";
import { toNum } from "@/lib/utils";

export const SEARCH_TYPES = ["records", "documents", "labs", "measurements", "providers"] as const;
export type SearchType = (typeof SEARCH_TYPES)[number];

const SYNONYMS: Record<string, string[]> = {
  sugar: ["glucose"],
  "blood sugar": ["glucose"],
  bp: ["blood pressure"],
  pressure: ["blood pressure"],
  pulse: ["heart rate"],
  oxygen: ["spo2", "spo₂"],
  spo2: ["spo₂"],
  fever: ["temperature"],
  cbc: ["complete blood count", "hemoglobin"],
  lipid: ["cholesterol", "lipid profile"],
  thyroid: ["tsh"],
  lft: ["liver function"],
  kft: ["kidney function", "creatinine"],
  a1c: ["hba1c"],
  sgpt: ["alt"],
  sgot: ["ast"],
  haemoglobin: ["hemoglobin"],
  vaccine: ["vaccination"],
  xray: ["x-ray"],
};

export function expandTerms(q: string): string[] {
  const base = q.trim().toLowerCase();
  const out = new Set<string>([base]);
  for (const [k, vals] of Object.entries(SYNONYMS))
    if (base === k || base.includes(k)) vals.forEach((v) => out.add(v));
  return [...out].filter((t) => t.length >= 2).slice(0, 6);
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Recognise "12/09/2026", "2026-09-12", "12 Sep 2026", "Sep 2026", "September 2026". */
export function parseDateQuery(q: string): { from: Date; to: Date } | null {
  const t = q.trim().toLowerCase();
  let m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t);
  if (m) return day(+m[3], +m[2] - 1, +m[1]);
  m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (m) return day(+m[1], +m[2] - 1, +m[3]);
  m = /^(\d{4})-(\d{2})$/.exec(t);
  if (m) return month(+m[1], +m[2] - 1);
  m = /^(\d{1,2})\s+([a-z]{3,9})\s+(\d{4})$/.exec(t);
  if (m && MONTHS.includes(m[2].slice(0, 3)))
    return day(+m[3], MONTHS.indexOf(m[2].slice(0, 3)), +m[1]);
  m = /^([a-z]{3,9})\s+(\d{4})$/.exec(t);
  if (m && MONTHS.includes(m[1].slice(0, 3))) return month(+m[2], MONTHS.indexOf(m[1].slice(0, 3)));
  return null;

  function day(y: number, mo: number, d: number) {
    const from = new Date(Date.UTC(y, mo, d) - 330 * 60_000); // IST midnight
    if (Number.isNaN(from.getTime())) return null;
    return { from, to: new Date(from.getTime() + 86_400_000) };
  }
  function month(y: number, mo: number) {
    const from = new Date(Date.UTC(y, mo, 1) - 330 * 60_000);
    const to = new Date(Date.UTC(y, mo + 1, 1) - 330 * 60_000);
    return { from, to };
  }
}

export interface SearchOptions {
  types?: SearchType[];
  from?: Date;
  to?: Date;
  limit?: number;
}

export async function searchAll(userId: string, rawQuery: string, opts: SearchOptions = {}) {
  const q = rawQuery.trim().slice(0, 100);
  const types = new Set(opts.types?.length ? opts.types : SEARCH_TYPES);
  const limit = Math.min(opts.limit ?? 8, 25);
  const empty = {
    query: q,
    records: [],
    documents: [],
    labs: [],
    measurements: [],
    providers: [],
    total: 0,
  };
  if (q.length < 2 && !opts.from) return empty;

  const dateQ = parseDateQuery(q);
  const terms = dateQ ? [] : expandTerms(q);
  const numeric = /^\d+(\.\d+)?$/.test(q) ? Number(q) : null;
  const range =
    dateQ ??
    (opts.from || opts.to
      ? { from: opts.from ?? new Date(0), to: opts.to ?? new Date(8.64e15) }
      : null);
  const between = (field: string) => (range ? { [field]: { gte: range.from, lt: range.to } } : {});
  const textOr = <T>(fields: string[]): T[] =>
    terms.flatMap((t) => fields.map((f) => ({ [f]: { contains: t, mode: "insensitive" } }) as T));

  const biomarkerCodes = [
    ...new Set(terms.flatMap((t) => findBiomarkersInText(t).map((b) => b.code))),
  ];

  const [records, documents, labs, measurements, providers] = await Promise.all([
    types.has("records")
      ? db.medicalRecord.findMany({
          where: {
            userId,
            deletedAt: null,
            ...between("date"),
            ...(terms.length
              ? {
                  OR: [
                    ...textOr<Prisma.MedicalRecordWhereInput>([
                      "title",
                      "notes",
                      "doctorName",
                      "facilityName",
                      "specialty",
                    ]),
                    { tags: { hasSome: terms } },
                  ],
                }
              : {}),
          },
          orderBy: { date: "desc" },
          take: limit,
          select: {
            id: true,
            title: true,
            type: true,
            date: true,
            doctorName: true,
            facilityName: true,
            tags: true,
          },
        })
      : [],
    types.has("documents")
      ? db.medicalDocument.findMany({
          where: {
            userId,
            deletedAt: null,
            ...(range
              ? {
                  OR: [
                    { documentDate: { gte: range.from, lt: range.to } },
                    { documentDate: null, createdAt: { gte: range.from, lt: range.to } },
                  ],
                }
              : {}),
            ...(terms.length
              ? {
                  AND: [
                    {
                      OR: [
                        ...textOr<Prisma.MedicalDocumentWhereInput>([
                          "name",
                          "providerName",
                          "notes",
                          "extractedText",
                        ]),
                        { tags: { hasSome: terms } },
                      ],
                    },
                  ],
                }
              : {}),
          },
          orderBy: { createdAt: "desc" },
          take: limit,
          select: {
            id: true,
            name: true,
            type: true,
            documentDate: true,
            createdAt: true,
            providerName: true,
            extractedText: true,
          },
        })
      : [],
    types.has("labs")
      ? db.labResult.findMany({
          where: {
            userId,
            deletedAt: null,
            ...between("observedAt"),
            ...(numeric !== null
              ? { valueNumeric: numeric }
              : terms.length
                ? {
                    OR: [
                      ...textOr<Prisma.LabResultWhereInput>(["testName", "labName", "notes"]),
                      ...(biomarkerCodes.length ? [{ biomarkerCode: { in: biomarkerCodes } }] : []),
                    ],
                  }
                : {}),
          },
          orderBy: { observedAt: "desc" },
          take: limit * 2,
          select: {
            id: true,
            testName: true,
            biomarkerCode: true,
            valueNumeric: true,
            valueText: true,
            unit: true,
            observedAt: true,
            labName: true,
            flag: true,
            panelId: true,
          },
        })
      : [],
    types.has("measurements")
      ? (async () => {
          const metricWhere: Prisma.HealthMetricWhereInput = { OR: [{ userId: null }, { userId }] };
          const metrics = await db.healthMetric.findMany({
            where: metricWhere,
            select: { id: true, key: true, name: true, shortName: true, valueType: true },
          });
          const matched =
            numeric !== null || range
              ? metrics
              : metrics.filter((m) =>
                  terms.some(
                    (t) =>
                      m.name.toLowerCase().includes(t) ||
                      m.key.replace(/_/g, " ").includes(t) ||
                      (m.shortName ?? "").toLowerCase() === t,
                  ),
                );
          if (!matched.length) return [];
          return db.healthMeasurement.findMany({
            where: {
              userId,
              deletedAt: null,
              metricId: { in: matched.map((m) => m.id) },
              ...between("measuredAt"),
              ...(numeric !== null ? { OR: [{ value: numeric }, { value2: numeric }] } : {}),
            },
            orderBy: { measuredAt: "desc" },
            take: limit,
            select: {
              id: true,
              value: true,
              value2: true,
              unit: true,
              measuredAt: true,
              context: true,
              metric: { select: { key: true, name: true, valueType: true, decimals: true } },
            },
          });
        })()
      : [],
    types.has("providers") && terms.length
      ? db.provider.findMany({
          where: { userId, OR: textOr<Prisma.ProviderWhereInput>(["name", "specialty", "city"]) },
          take: limit,
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            type: true,
            city: true,
            _count: { select: { records: true, documents: true, labPanels: true } },
          },
        })
      : [],
  ]);

  const snippet = (text: string | null) => {
    if (!text || !terms.length) return null;
    const lower = text.toLowerCase();
    for (const t of terms) {
      const i = lower.indexOf(t);
      if (i >= 0)
        return `${i > 60 ? "…" : ""}${text
          .slice(Math.max(0, i - 60), i + t.length + 80)
          .replace(/\s+/g, " ")
          .trim()}…`;
    }
    return null;
  };

  const result = {
    query: q,
    records: records.map((r) => ({ ...r, typeLabel: RECORD_TYPE_LABELS[r.type] })),
    documents: documents.map(({ extractedText, ...d }) => ({
      ...d,
      snippet: snippet(extractedText),
    })),
    labs: labs.slice(0, limit).map((r) => ({
      ...r,
      valueNumeric: toNum(r.valueNumeric),
      testKey: r.biomarkerCode ?? `name:${r.testName.toLowerCase()}`,
      displayName: getBiomarker(r.biomarkerCode)?.name ?? r.testName,
    })),
    measurements: measurements.map((m) => ({
      ...m,
      value: toNum(m.value)!,
      value2: toNum(m.value2),
    })),
    providers,
  };
  return {
    ...result,
    total:
      result.records.length +
      result.documents.length +
      result.labs.length +
      result.measurements.length +
      result.providers.length,
  };
}
