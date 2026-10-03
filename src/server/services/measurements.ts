import "server-only";
import { Prisma, type HealthMetric } from "@prisma/client";
import { db } from "@/server/db";
import { AppError, notFound } from "@/server/errors";
import { parseZonedInput } from "@/lib/format";
import { customMetricSchema, measurementSchema } from "@/lib/validation/health";
import { inputUnitsFor, toCanonical } from "@/lib/catalog/metrics";
import { toNum } from "@/lib/utils";
import { removeTimelineEvent, syncMeasurementEvent } from "./timeline";
import { parseCsv } from "@/server/extraction/csv";
import { ensureSystemMetrics } from "./system-metrics";

export const RANGE_DAYS = {
  "7d": 7,
  "30d": 30,
  "3m": 91,
  "6m": 182,
  "1y": 365,
  all: null,
} as const;
export type RangeKey = keyof typeof RANGE_DAYS;

export function isRangeKey(v: unknown): v is RangeKey {
  return typeof v === "string" && v in RANGE_DAYS;
}

/** System metrics plus the user's own custom metrics. */
export async function listMetrics(userId: string) {
  await ensureSystemMetrics();
  return db.healthMetric.findMany({
    where: { OR: [{ userId: null }, { userId }] },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getMetricByKey(userId: string, key: string) {
  await ensureSystemMetrics();
  const metric = await db.healthMetric.findFirst({
    where: { key, OR: [{ userId: null }, { userId }] },
  });
  if (!metric) throw notFound("Measurement type");
  return metric;
}

async function getAccessibleMetric(userId: string, metricId: string) {
  const metric = await db.healthMetric.findFirst({
    where: { id: metricId, OR: [{ userId: null }, { userId }] },
  });
  if (!metric) throw notFound("Measurement type");
  return metric;
}

export async function createCustomMetric(userId: string, raw: unknown) {
  const input = customMetricSchema.parse(raw);
  const base =
    input.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 40) || "metric";
  const key = `custom_${base}`;
  const exists = await db.healthMetric.findFirst({
    where: {
      OR: [
        { userId, key },
        { userId: null, name: { equals: input.name, mode: "insensitive" } },
      ],
    },
  });
  if (exists)
    throw new AppError("CONFLICT", "A measurement with this name already exists.", {
      name: ["Already exists"],
    });
  return db.healthMetric.create({
    data: {
      userId,
      key,
      name: input.name,
      unit: input.unit,
      decimals: input.decimals,
      category: "custom",
      sortOrder: 500,
      minValue: input.minValue !== undefined ? new Prisma.Decimal(input.minValue) : null,
      maxValue: input.maxValue !== undefined ? new Prisma.Decimal(input.maxValue) : null,
    },
  });
}

/** Validate and convert a measurement to the metric's canonical unit. */
export function prepareMeasurement(
  metric: Pick<
    HealthMetric,
    | "key"
    | "name"
    | "unit"
    | "valueType"
    | "minValue"
    | "maxValue"
    | "contexts"
    | "decimals"
    | "secondaryLabel"
  >,
  input: { value: number; value2?: number; unit: string; context?: string },
) {
  const units = inputUnitsFor(metric.key, metric.unit);
  if (!units.includes(input.unit)) {
    throw new AppError("VALIDATION", `Unit must be one of: ${units.join(", ")}.`, {
      unit: ["Unsupported unit"],
    });
  }
  const value = toCanonical(metric.key, input.value, input.unit);
  const min = toNum(metric.minValue);
  const max = toNum(metric.maxValue);
  const outOfBounds = (x: number) => (min !== null && x < min) || (max !== null && x > max);
  if (outOfBounds(value)) {
    throw new AppError(
      "VALIDATION",
      `That ${metric.name.toLowerCase()} value doesn't look right. Please check it and try again.`,
      { value: ["Please double-check this value"] },
    );
  }
  let value2: number | null = null;
  if (metric.valueType === "DUAL") {
    if (input.value2 === undefined)
      throw new AppError("VALIDATION", `${metric.secondaryLabel ?? "Second value"} is required.`, {
        value2: ["Required"],
      });
    value2 = input.value2;
    if (outOfBounds(value2))
      throw new AppError(
        "VALIDATION",
        `${metric.secondaryLabel ?? "Second value"} doesn't look right.`,
        { value2: ["Please double-check this value"] },
      );
    if (metric.key === "blood_pressure" && value2 >= value) {
      throw new AppError(
        "VALIDATION",
        "Systolic (top number) should be higher than diastolic (bottom number).",
        { value2: ["Should be lower than systolic"] },
      );
    }
  }
  if (input.context && metric.contexts.length && !metric.contexts.includes(input.context)) {
    throw new AppError("VALIDATION", "Choose a valid context.", { context: ["Invalid context"] });
  }
  const round = (x: number) => Number(x.toFixed(Math.max(metric.decimals, 1) + 1));
  return { value: round(value), value2: value2 !== null ? round(value2) : null, unit: metric.unit };
}

export async function createMeasurement(userId: string, raw: unknown, tz: string) {
  const input = measurementSchema.parse(raw);
  const metric = await getAccessibleMetric(userId, input.metricId);
  const prepared = prepareMeasurement(metric, input);
  const measuredAt = parseZonedInput(input.measuredAt, tz);
  if (!measuredAt)
    throw new AppError("VALIDATION", "Date and time is not valid.", {
      measuredAt: ["Invalid date"],
    });
  if (measuredAt.getTime() > Date.now() + 5 * 60_000)
    throw new AppError("VALIDATION", "Readings cannot be in the future.", {
      measuredAt: ["Cannot be in the future"],
    });

  return db.$transaction(async (tx) => {
    const m = await tx.healthMeasurement.create({
      data: {
        userId,
        metricId: metric.id,
        value: new Prisma.Decimal(prepared.value),
        value2: prepared.value2 !== null ? new Prisma.Decimal(prepared.value2) : null,
        unit: prepared.unit,
        measuredAt,
        context: input.context ?? null,
        contextNote: input.contextNote ?? null,
        notes: input.notes ?? null,
      },
    });
    await syncMeasurementEvent(tx, m, metric);
    return m;
  });
}

export async function updateMeasurement(userId: string, id: string, raw: unknown, tz: string) {
  const input = measurementSchema.parse(raw);
  const existing = await db.healthMeasurement.findFirst({ where: { id, userId, deletedAt: null } });
  if (!existing) throw notFound("Reading");
  const metric = await getAccessibleMetric(userId, existing.metricId);
  const prepared = prepareMeasurement(metric, input);
  const measuredAt = parseZonedInput(input.measuredAt, tz);
  if (!measuredAt)
    throw new AppError("VALIDATION", "Date and time is not valid.", {
      measuredAt: ["Invalid date"],
    });
  return db.$transaction(async (tx) => {
    const m = await tx.healthMeasurement.update({
      where: { id },
      data: {
        value: new Prisma.Decimal(prepared.value),
        value2: prepared.value2 !== null ? new Prisma.Decimal(prepared.value2) : null,
        unit: prepared.unit,
        measuredAt,
        context: input.context ?? null,
        contextNote: input.contextNote ?? null,
        notes: input.notes ?? null,
      },
    });
    await syncMeasurementEvent(tx, m, metric);
    return m;
  });
}

export async function deleteMeasurement(userId: string, id: string) {
  await db.$transaction(async (tx) => {
    const res = await tx.healthMeasurement.updateMany({
      where: { id, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (!res.count) throw notFound("Reading");
    await removeTimelineEvent(tx, "MEASUREMENT", id);
  });
}

export async function getMeasurement(userId: string, id: string) {
  const m = await db.healthMeasurement.findFirst({
    where: { id, userId, deletedAt: null },
    include: { metric: true },
  });
  if (!m) throw notFound("Reading");
  return m;
}

/** Time series for charts. Caps points to keep payloads small. */
export async function getSeries(
  userId: string,
  metricId: string,
  range: RangeKey,
  now = new Date(),
) {
  const days = RANGE_DAYS[range];
  const from = days ? new Date(now.getTime() - days * 86_400_000) : undefined;
  const rows = await db.healthMeasurement.findMany({
    where: { userId, metricId, deletedAt: null, ...(from ? { measuredAt: { gte: from } } : {}) },
    orderBy: { measuredAt: "asc" },
    take: 2000,
    select: {
      id: true,
      value: true,
      value2: true,
      measuredAt: true,
      context: true,
      notes: true,
      unit: true,
    },
  });
  return rows.map((r) => ({
    id: r.id,
    value: toNum(r.value)!,
    value2: toNum(r.value2),
    at: r.measuredAt.toISOString(),
    context: r.context,
    notes: r.notes,
    unit: r.unit,
  }));
}

export async function listMeasurements(
  userId: string,
  metricId: string,
  opts: { page?: number; pageSize?: number } = {},
) {
  const pageSize = Math.min(opts.pageSize ?? 15, 100);
  const page = Math.max(opts.page ?? 1, 1);
  const where = { userId, metricId, deletedAt: null };
  const [items, total] = await Promise.all([
    db.healthMeasurement.findMany({
      where,
      orderBy: { measuredAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.healthMeasurement.count({ where }),
  ]);
  return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

/** Summary for the tracking overview: each metric that has data, with latest value and count. */
export async function metricOverview(userId: string) {
  const metrics = await listMetrics(userId);
  const counts = await db.healthMeasurement.groupBy({
    by: ["metricId"],
    where: { userId, deletedAt: null },
    _count: true,
    _max: { measuredAt: true },
  });
  const countMap = new Map(counts.map((c) => [c.metricId, c]));
  const withData = metrics.filter((m) => countMap.has(m.id));
  const latest = await Promise.all(
    withData.map((m) =>
      db.healthMeasurement.findMany({
        where: { userId, metricId: m.id, deletedAt: null },
        orderBy: { measuredAt: "desc" },
        take: 20,
        select: { value: true, value2: true, measuredAt: true, context: true },
      }),
    ),
  );
  return {
    metrics,
    tracked: withData.map((m, i) => ({
      metric: m,
      count: countMap.get(m.id)!._count,
      points: latest[i]
        .map((r) => ({
          value: toNum(r.value)!,
          value2: toNum(r.value2),
          at: r.measuredAt.toISOString(),
          context: r.context,
        }))
        .reverse(),
    })),
  };
}

// ── CSV import ──────────────────────────────────────────────

export interface CsvRowResult {
  line: number;
  ok: boolean;
  error?: string;
  metricKey?: string;
  metricName?: string;
  value?: number;
  value2?: number | null;
  unit?: string;
  measuredAt?: string;
  context?: string | null;
  notes?: string | null;
}

/**
 * Parse a CSV of measurements and validate every row. Nothing is written:
 * the user reviews the preview and confirms before `importCsv` saves rows.
 */
export async function previewCsv(
  userId: string,
  text: string,
  tz: string,
): Promise<CsvRowResult[]> {
  if (text.length > 1_000_000)
    throw new AppError("PAYLOAD_TOO_LARGE", "CSV file is too large (max 1 MB).");
  const rows = parseCsv(text);
  if (rows.length < 2) throw new AppError("VALIDATION", "The CSV file has no data rows.");
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (n: string) => header.indexOf(n);
  for (const col of ["metric", "value", "unit", "measured_at"]) {
    if (idx(col) < 0)
      throw new AppError(
        "VALIDATION",
        `Missing required column "${col}". Download the template to see the expected format.`,
      );
  }
  if (rows.length > 2001)
    throw new AppError("VALIDATION", "Please import at most 2,000 rows at a time.");
  const metrics = await listMetrics(userId);
  const byKey = new Map(
    metrics.flatMap(
      (m) =>
        [
          [m.key, m],
          [m.name.toLowerCase(), m],
        ] as const,
    ),
  );

  return rows.slice(1).map((r, i) => {
    const line = i + 2;
    const get = (n: string) => (idx(n) >= 0 ? (r[idx(n)] ?? "").trim() : "");
    const metric = byKey.get(get("metric").toLowerCase());
    if (!metric) return { line, ok: false, error: `Unknown metric "${get("metric")}"` };
    const value = Number(get("value").replace(",", "."));
    if (!Number.isFinite(value)) return { line, ok: false, error: "Value is not a number" };
    const v2raw = get("value2");
    const value2 = v2raw ? Number(v2raw.replace(",", ".")) : undefined;
    if (v2raw && !Number.isFinite(value2))
      return { line, ok: false, error: "Second value is not a number" };
    const at = parseZonedInput(get("measured_at").replace(" ", "T").slice(0, 16), tz);
    if (!at) return { line, ok: false, error: "Date must be YYYY-MM-DD HH:mm" };
    if (at.getTime() > Date.now() + 5 * 60_000)
      return { line, ok: false, error: "Date is in the future" };
    const context = get("context").toUpperCase() || undefined;
    try {
      const p = prepareMeasurement(metric, {
        value,
        value2,
        unit: get("unit") || metric.unit,
        context,
      });
      return {
        line,
        ok: true,
        metricKey: metric.key,
        metricName: metric.name,
        value: p.value,
        value2: p.value2,
        unit: p.unit,
        measuredAt: at.toISOString(),
        context: context ?? null,
        notes: get("notes").slice(0, 1000) || null,
      };
    } catch (e) {
      return { line, ok: false, error: e instanceof AppError ? e.message : "Invalid row" };
    }
  });
}

export async function importCsv(userId: string, text: string, tz: string) {
  const preview = await previewCsv(userId, text, tz);
  const valid = preview.filter((r) => r.ok);
  if (!valid.length) throw new AppError("VALIDATION", "There are no valid rows to import.");
  const metrics = await listMetrics(userId);
  const byKey = new Map(metrics.map((m) => [m.key, m]));
  let imported = 0;
  for (let i = 0; i < valid.length; i += 200) {
    const chunk = valid.slice(i, i + 200);
    await db.$transaction(async (tx) => {
      for (const r of chunk) {
        const metric = byKey.get(r.metricKey!)!;
        const m = await tx.healthMeasurement.create({
          data: {
            userId,
            metricId: metric.id,
            value: new Prisma.Decimal(r.value!),
            value2: r.value2 != null ? new Prisma.Decimal(r.value2) : null,
            unit: r.unit!,
            measuredAt: new Date(r.measuredAt!),
            context: r.context,
            notes: r.notes,
            source: "CSV_IMPORT",
          },
        });
        await syncMeasurementEvent(tx, m, metric);
        imported++;
      }
    });
  }
  return { imported, skipped: preview.length - valid.length };
}
