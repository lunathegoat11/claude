import "server-only";
import { db } from "@/server/db";
import { getBiomarker } from "@/lib/catalog/biomarkers";
import { toNum } from "@/lib/utils";

/** Lab-derived metrics shown on the dashboard when data exists. */
const DASHBOARD_LAB_CODES = ["HBA1C", "CHOL", "HGB", "LDL", "TSH"] as const;

export interface DashboardCard {
  key: string;
  kind: "measurement" | "lab";
  name: string;
  unit: string;
  valueType: "SINGLE" | "DUAL";
  decimals: number;
  latest: { value: number; value2: number | null; at: string; context: string | null };
  previous: { value: number; value2: number | null; at: string } | null;
  spark: number[];
  href: string;
}

/**
 * Dashboard data. Only fetches what's needed: the last 20 points per tracked
 * metric and the last 10 per selected lab test — never the full history.
 */
export async function getDashboard(userId: string) {
  const counts = await db.healthMeasurement.groupBy({
    by: ["metricId"],
    where: { userId, deletedAt: null },
    _count: true,
  });
  const metricIds = counts.map((c) => c.metricId);
  const metrics = metricIds.length
    ? await db.healthMetric.findMany({
        where: { id: { in: metricIds } },
        orderBy: [{ sortOrder: "asc" }],
      })
    : [];

  const measurementCards: DashboardCard[] = await Promise.all(
    metrics.map(async (m) => {
      const rows = await db.healthMeasurement.findMany({
        where: { userId, metricId: m.id, deletedAt: null },
        orderBy: { measuredAt: "desc" },
        take: 20,
        select: { value: true, value2: true, measuredAt: true, context: true },
      });
      const [l, p] = rows;
      return {
        key: m.key,
        kind: "measurement" as const,
        name: m.name,
        unit: m.unit,
        valueType: m.valueType,
        decimals: m.decimals,
        latest: {
          value: toNum(l.value)!,
          value2: toNum(l.value2),
          at: l.measuredAt.toISOString(),
          context: l.context,
        },
        previous: p
          ? { value: toNum(p.value)!, value2: toNum(p.value2), at: p.measuredAt.toISOString() }
          : null,
        spark: rows.map((r) => toNum(r.value)!).reverse(),
        href: `/tracking/${m.key}`,
      };
    }),
  );

  const labRows = await Promise.all(
    DASHBOARD_LAB_CODES.map((code) =>
      db.labResult.findMany({
        where: { userId, biomarkerCode: code, deletedAt: null, valueNumeric: { not: null } },
        orderBy: { observedAt: "desc" },
        take: 10,
        select: { valueNumeric: true, observedAt: true, unit: true },
      }),
    ),
  );
  const labCards: DashboardCard[] = DASHBOARD_LAB_CODES.flatMap((code, i) => {
    const rows = labRows[i];
    if (!rows.length) return [];
    const def = getBiomarker(code)!;
    const [l, p] = rows;
    return [
      {
        key: code,
        kind: "lab" as const,
        name: def.name,
        unit: l.unit ?? def.units[0],
        valueType: "SINGLE" as const,
        decimals: def.decimals,
        latest: {
          value: toNum(l.valueNumeric)!,
          value2: null,
          at: l.observedAt.toISOString(),
          context: null,
        },
        previous:
          p && p.unit === l.unit
            ? { value: toNum(p.valueNumeric)!, value2: null, at: p.observedAt.toISOString() }
            : null,
        spark: rows
          .filter((r) => r.unit === l.unit)
          .map((r) => toNum(r.valueNumeric)!)
          .reverse(),
        href: `/labs/tests/${code}`,
      },
    ];
  });

  const [
    recentDocuments,
    recentPanels,
    recentMeasurements,
    recentConversations,
    timeline,
    counts2,
  ] = await Promise.all([
    db.medicalDocument.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: { id: true, name: true, type: true, createdAt: true, mimeType: true },
    }),
    db.labPanel.findMany({
      where: { userId, deletedAt: null },
      orderBy: { collectedAt: "desc" },
      take: 3,
      select: {
        id: true,
        name: true,
        collectedAt: true,
        labName: true,
        results: { where: { deletedAt: null }, select: { flag: true } },
      },
    }),
    db.healthMeasurement.findMany({
      where: { userId, deletedAt: null },
      orderBy: { measuredAt: "desc" },
      take: 5,
      select: {
        id: true,
        value: true,
        value2: true,
        unit: true,
        measuredAt: true,
        context: true,
        metric: { select: { name: true, key: true, valueType: true, decimals: true } },
      },
    }),
    db.aIConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 3,
      select: {
        id: true,
        title: true,
        updatedAt: true,
        messages: {
          where: { role: "ASSISTANT" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true },
        },
      },
    }),
    db.timelineEvent.findMany({
      where: { userId, importance: { gte: 2 } },
      orderBy: { occurredAt: "desc" },
      take: 6,
    }),
    Promise.all([
      db.medicalRecord.count({ where: { userId, deletedAt: null } }),
      db.medicalDocument.count({ where: { userId, deletedAt: null } }),
      db.labPanel.count({ where: { userId, deletedAt: null } }),
    ]),
  ]);

  return {
    cards: [...measurementCards, ...labCards],
    recentDocuments,
    recentPanels: recentPanels.map((p) => ({
      ...p,
      flagged: p.results.filter(
        (r) => r.flag === "HIGH" || r.flag === "LOW" || r.flag === "ABNORMAL",
      ).length,
      total: p.results.length,
    })),
    recentMeasurements: recentMeasurements.map((m) => ({
      ...m,
      value: toNum(m.value)!,
      value2: toNum(m.value2),
    })),
    recentConversations,
    timeline,
    totals: { records: counts2[0], documents: counts2[1], labReports: counts2[2] },
  };
}
