import "server-only";
import type { MedicalRecord, RecordType, TimelineCategory, TimelineSource } from "@prisma/client";
import { db, type Tx } from "@/server/db";
import { RECORD_TYPE_LABELS, DOCUMENT_TYPE_LABELS } from "@/lib/catalog/labels";
import { CONTEXT_LABELS } from "@/lib/catalog/metrics";
import { formatNumber } from "@/lib/format";
import { toNum } from "@/lib/utils";

const RECORD_CATEGORY: Record<RecordType, TimelineCategory> = {
  DOCTOR_VISIT: "VISIT",
  DIAGNOSIS: "DIAGNOSIS",
  PROCEDURE: "PROCEDURE",
  HOSPITALIZATION: "HOSPITALIZATION",
  PRESCRIPTION: "PRESCRIPTION",
  VACCINATION: "VACCINATION",
  ALLERGY: "DIAGNOSIS",
  CONDITION: "DIAGNOSIS",
  FAMILY_HISTORY: "OTHER",
  OTHER: "OTHER",
};

async function upsert(
  tx: Tx,
  data: {
    userId: string;
    sourceType: TimelineSource;
    sourceId: string;
    category: TimelineCategory;
    title: string;
    summary?: string | null;
    occurredAt: Date;
    importance: number;
  },
) {
  await tx.timelineEvent.upsert({
    where: { sourceType_sourceId: { sourceType: data.sourceType, sourceId: data.sourceId } },
    create: data,
    update: {
      title: data.title,
      summary: data.summary,
      occurredAt: data.occurredAt,
      category: data.category,
      importance: data.importance,
    },
  });
}

export async function removeTimelineEvent(tx: Tx, sourceType: TimelineSource, sourceId: string) {
  await tx.timelineEvent.deleteMany({ where: { sourceType, sourceId } });
}

export async function syncRecordEvent(
  tx: Tx,
  r: Pick<
    MedicalRecord,
    "id" | "userId" | "type" | "title" | "date" | "doctorName" | "facilityName" | "specialty"
  >,
) {
  const who = [r.doctorName, r.facilityName].filter(Boolean).join(" · ");
  await upsert(tx, {
    userId: r.userId,
    sourceType: "MEDICAL_RECORD",
    sourceId: r.id,
    category: RECORD_CATEGORY[r.type],
    title: r.title,
    summary: [RECORD_TYPE_LABELS[r.type], who || r.specialty].filter(Boolean).join(" — "),
    occurredAt: r.date,
    importance:
      r.type === "HOSPITALIZATION" || r.type === "PROCEDURE" || r.type === "DIAGNOSIS" ? 3 : 2,
  });
}

export async function syncDocumentEvent(
  tx: Tx,
  d: {
    id: string;
    userId: string;
    name: string;
    type: keyof typeof DOCUMENT_TYPE_LABELS;
    documentDate: Date | null;
    createdAt: Date;
    providerName: string | null;
  },
) {
  await upsert(tx, {
    userId: d.userId,
    sourceType: "DOCUMENT",
    sourceId: d.id,
    category: "DOCUMENT",
    title: `Uploaded ${DOCUMENT_TYPE_LABELS[d.type].toLowerCase()}`,
    summary: [d.name, d.providerName].filter(Boolean).join(" · "),
    occurredAt: d.documentDate ?? d.createdAt,
    importance: 2,
  });
}

export async function syncLabPanelEvent(
  tx: Tx,
  p: { id: string; userId: string; name: string; collectedAt: Date; labName: string | null },
  results: {
    testName: string;
    valueNumeric: unknown;
    valueText: string | null;
    unit: string | null;
  }[],
) {
  const highlight =
    results.length === 1
      ? `${results[0].testName}: ${results[0].valueNumeric != null ? formatNumber(toNum(results[0].valueNumeric)!, 2) : results[0].valueText}${results[0].unit ? ` ${results[0].unit}` : ""}`
      : `${results.length} results`;
  await upsert(tx, {
    userId: p.userId,
    sourceType: "LAB_PANEL",
    sourceId: p.id,
    category: "LAB",
    title: p.name,
    summary: [highlight, p.labName].filter(Boolean).join(" · "),
    occurredAt: p.collectedAt,
    importance: 2,
  });
}

export async function syncMeasurementEvent(
  tx: Tx,
  m: {
    id: string;
    userId: string;
    value: unknown;
    value2: unknown;
    unit: string;
    measuredAt: Date;
    context: string | null;
  },
  metric: { name: string; valueType: "SINGLE" | "DUAL"; decimals: number },
) {
  const v = toNum(m.value)!;
  const v2 = toNum(m.value2);
  const valueText =
    metric.valueType === "DUAL" && v2 !== null
      ? `${formatNumber(v, 0)}/${formatNumber(v2, 0)}`
      : formatNumber(v, metric.decimals);
  await upsert(tx, {
    userId: m.userId,
    sourceType: "MEASUREMENT",
    sourceId: m.id,
    category: "MEASUREMENT",
    title: `${metric.name} recorded`,
    summary: [`${valueText} ${m.unit}`, m.context ? (CONTEXT_LABELS[m.context] ?? m.context) : null]
      .filter(Boolean)
      .join(" · "),
    occurredAt: m.measuredAt,
    importance: 1,
  });
}

export interface TimelineQuery {
  category?: TimelineCategory;
  includeRoutine?: boolean;
  before?: Date;
  limit?: number;
}

/** Cursor-paginated timeline (by occurredAt). */
export async function listTimeline(userId: string, q: TimelineQuery = {}) {
  const limit = Math.min(q.limit ?? 40, 100);
  const items = await db.timelineEvent.findMany({
    where: {
      userId,
      ...(q.category ? { category: q.category } : {}),
      ...(q.includeRoutine === false ? { importance: { gte: 2 } } : {}),
      ...(q.before ? { occurredAt: { lt: q.before } } : {}),
    },
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    take: limit + 1,
  });
  const hasMore = items.length > limit;
  return {
    items: items.slice(0, limit),
    hasMore,
    nextCursor: hasMore ? items[limit - 1].occurredAt : null,
  };
}

export function timelineHref(e: { sourceType: TimelineSource; sourceId: string }) {
  switch (e.sourceType) {
    case "MEDICAL_RECORD":
      return `/records/${e.sourceId}`;
    case "DOCUMENT":
      return `/documents/${e.sourceId}`;
    case "LAB_PANEL":
      return `/labs/reports/${e.sourceId}`;
    case "MEASUREMENT":
      return `/tracking/entry/${e.sourceId}`;
    default:
      return "/timeline";
  }
}
