import "server-only";
import { Prisma, type DataSource, type LabFlag } from "@prisma/client";
import { db, type Tx } from "@/server/db";
import { AppError, notFound } from "@/server/errors";
import { parseZonedInput } from "@/lib/format";
import { computeLabFlag, parseReferenceRange } from "@/lib/lab-range";
import { getBiomarker, matchBiomarker } from "@/lib/catalog/biomarkers";
import { labPanelSchema, type LabPanelInput } from "@/lib/validation/health";
import { toNum } from "@/lib/utils";
import { ensureProvider } from "./providers";
import { removeTimelineEvent, syncLabPanelEvent } from "./timeline";

export function normaliseResult(r: LabPanelInput["results"][number]) {
  const numeric = Number(r.value.replace(",", "."));
  const isNumeric =
    Number.isFinite(numeric) && /^\s*[<>]?\s*\d/.test(r.value) && !/[a-z]/i.test(r.value);
  const valueNumeric = isNumeric ? Number(r.value.replace(/[<>\s]/g, "").replace(",", ".")) : null;
  let refLow = r.refLow ?? null;
  let refHigh = r.refHigh ?? null;
  if (refLow === null && refHigh === null && r.refText) {
    const parsed = parseReferenceRange(r.refText);
    refLow = parsed.low;
    refHigh = parsed.high;
  }
  const def = r.biomarkerCode ? getBiomarker(r.biomarkerCode) : matchBiomarker(r.testName);
  const flag: LabFlag = computeLabFlag(valueNumeric, refLow, refHigh, r.labFlag ?? null);
  return {
    testName: r.testName,
    biomarkerCode: def?.code ?? null,
    valueNumeric: valueNumeric !== null ? new Prisma.Decimal(valueNumeric) : null,
    valueText: valueNumeric === null ? r.value : null,
    unit: r.unit ?? def?.units[0] ?? null,
    refLow: refLow !== null ? new Prisma.Decimal(refLow) : null,
    refHigh: refHigh !== null ? new Prisma.Decimal(refHigh) : null,
    refText: r.refText ?? null,
    flag,
    notes: r.notes ?? null,
  };
}

async function writePanel(
  tx: Tx,
  userId: string,
  input: LabPanelInput,
  collectedAt: Date,
  source: DataSource,
  panelId?: string,
) {
  if (input.documentId) {
    const doc = await tx.medicalDocument.findFirst({
      where: { id: input.documentId, userId, deletedAt: null },
      select: { id: true },
    });
    if (!doc) throw notFound("Document");
  }
  const providerId = await ensureProvider(tx, userId, input.labName, "LABORATORY");
  const data = {
    name: input.name,
    category: input.category ?? null,
    collectedAt,
    labName: input.labName ?? null,
    notes: input.notes ?? null,
    documentId: input.documentId ?? null,
    providerId,
  };
  const panel = panelId
    ? await tx.labPanel.update({ where: { id: panelId }, data })
    : await tx.labPanel.create({ data: { ...data, userId, source } });

  if (panelId) {
    await tx.labResult.updateMany({
      where: { panelId, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
  const results = input.results.map((r) => ({
    ...normaliseResult(r),
    userId,
    panelId: panel.id,
    observedAt: collectedAt,
    labName: input.labName ?? null,
    source: panelId ? panel.source : source,
  }));
  await tx.labResult.createMany({ data: results });
  await syncLabPanelEvent(tx, panel, results);
  return panel;
}

export async function createLabPanel(
  userId: string,
  raw: unknown,
  tz: string,
  source: DataSource = "MANUAL",
) {
  const input = labPanelSchema.parse(raw);
  const collectedAt = parseZonedInput(input.collectedAt, tz);
  if (!collectedAt)
    throw new AppError("VALIDATION", "Sample date is not valid.", {
      collectedAt: ["Sample date is not valid"],
    });
  if (collectedAt.getTime() > Date.now() + 86_400_000) {
    throw new AppError("VALIDATION", "Sample date cannot be in the future.", {
      collectedAt: ["Sample date cannot be in the future"],
    });
  }
  return db.$transaction((tx) => writePanel(tx, userId, input, collectedAt, source));
}

export async function updateLabPanel(userId: string, panelId: string, raw: unknown, tz: string) {
  const input = labPanelSchema.parse(raw);
  const collectedAt = parseZonedInput(input.collectedAt, tz);
  if (!collectedAt)
    throw new AppError("VALIDATION", "Sample date is not valid.", {
      collectedAt: ["Sample date is not valid"],
    });
  return db.$transaction(async (tx) => {
    const existing = await tx.labPanel.findFirst({
      where: { id: panelId, userId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw notFound("Lab report");
    return writePanel(tx, userId, input, collectedAt, "MANUAL", panelId);
  });
}

export async function deleteLabPanel(userId: string, panelId: string) {
  await db.$transaction(async (tx) => {
    const now = new Date();
    const res = await tx.labPanel.updateMany({
      where: { id: panelId, userId, deletedAt: null },
      data: { deletedAt: now },
    });
    if (!res.count) throw notFound("Lab report");
    await tx.labResult.updateMany({
      where: { panelId, userId, deletedAt: null },
      data: { deletedAt: now },
    });
    await removeTimelineEvent(tx, "LAB_PANEL", panelId);
  });
}

export async function getLabPanel(userId: string, panelId: string) {
  const panel = await db.labPanel.findFirst({
    where: { id: panelId, userId, deletedAt: null },
    include: {
      results: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
      document: { select: { id: true, name: true, deletedAt: true } },
    },
  });
  if (!panel) throw notFound("Lab report");
  return panel;
}

export async function listLabPanels(
  userId: string,
  opts: { page?: number; pageSize?: number } = {},
) {
  const pageSize = Math.min(opts.pageSize ?? 20, 100);
  const page = Math.max(opts.page ?? 1, 1);
  const where = { userId, deletedAt: null };
  const [items, total] = await Promise.all([
    db.labPanel.findMany({
      where,
      orderBy: { collectedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        results: { where: { deletedAt: null }, select: { flag: true } },
      },
    }),
    db.labPanel.count({ where }),
  ]);
  return {
    items: items.map((p) => ({
      ...p,
      resultCount: p.results.length,
      flaggedCount: p.results.filter(
        (r) => r.flag === "HIGH" || r.flag === "LOW" || r.flag === "ABNORMAL",
      ).length,
    })),
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Key identifying a test across reports: catalogue code, or "name:<lowercase name>". */
export function seriesKey(r: { biomarkerCode: string | null; testName: string }) {
  return r.biomarkerCode ?? `name:${r.testName.trim().toLowerCase()}`;
}

/** One row per distinct test with its latest and previous values. */
export async function listTestSeries(userId: string) {
  const rows = await db.labResult.findMany({
    where: { userId, deletedAt: null },
    orderBy: { observedAt: "desc" },
    select: {
      id: true,
      biomarkerCode: true,
      testName: true,
      valueNumeric: true,
      valueText: true,
      unit: true,
      observedAt: true,
      flag: true,
      refLow: true,
      refHigh: true,
      refText: true,
    },
    take: 2000,
  });
  const map = new Map<
    string,
    {
      key: string;
      testName: string;
      biomarkerCode: string | null;
      unit: string | null;
      count: number;
      latest: (typeof rows)[number];
      previous: (typeof rows)[number] | null;
      values: number[];
    }
  >();
  for (const r of rows) {
    const key = seriesKey(r);
    const e = map.get(key);
    if (!e) {
      map.set(key, {
        key,
        testName: getBiomarker(r.biomarkerCode)?.name ?? r.testName,
        biomarkerCode: r.biomarkerCode,
        unit: r.unit,
        count: 1,
        latest: r,
        previous: null,
        values: r.valueNumeric ? [toNum(r.valueNumeric)!] : [],
      });
    } else {
      e.count++;
      if (!e.previous) e.previous = r;
      if (r.valueNumeric && e.values.length < 12) e.values.push(toNum(r.valueNumeric)!);
    }
  }
  return [...map.values()].map((e) => ({
    ...e,
    values: e.values.reverse(),
    category: getBiomarker(e.biomarkerCode)?.category ?? "OTHER",
  }));
}

export async function getTestHistory(userId: string, key: string) {
  const where: Prisma.LabResultWhereInput = key.startsWith("name:")
    ? {
        userId,
        deletedAt: null,
        biomarkerCode: null,
        testName: { equals: key.slice(5), mode: "insensitive" },
      }
    : { userId, deletedAt: null, biomarkerCode: key };
  const results = await db.labResult.findMany({
    where,
    orderBy: { observedAt: "asc" },
    take: 500,
    include: { panel: { select: { id: true, name: true } } },
  });
  if (!results.length) throw notFound("Lab test");
  const def = key.startsWith("name:") ? undefined : getBiomarker(key);
  return {
    key,
    testName: def?.name ?? results[results.length - 1].testName,
    description: def?.description ?? null,
    results,
  };
}

export async function deleteLabResult(userId: string, resultId: string) {
  const res = await db.labResult.updateMany({
    where: { id: resultId, userId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  if (!res.count) throw notFound("Lab result");
}

/** For each result in a panel, the most recent earlier result of the same test (for comparison). */
export async function getPreviousResults(
  userId: string,
  panel: {
    id: string;
    collectedAt: Date;
    results: { biomarkerCode: string | null; testName: string }[];
  },
) {
  const codes = panel.results.map((r) => r.biomarkerCode).filter((c): c is string => !!c);
  const names = panel.results.filter((r) => !r.biomarkerCode).map((r) => r.testName);
  const earlier = await db.labResult.findMany({
    where: {
      userId,
      deletedAt: null,
      observedAt: { lt: panel.collectedAt },
      NOT: { panelId: panel.id },
      OR: [
        { biomarkerCode: { in: codes } },
        ...(names.length
          ? [{ biomarkerCode: null, testName: { in: names, mode: "insensitive" as const } }]
          : []),
      ],
    },
    orderBy: { observedAt: "desc" },
    take: 200,
    select: {
      biomarkerCode: true,
      testName: true,
      valueNumeric: true,
      valueText: true,
      unit: true,
      observedAt: true,
    },
  });
  const map = new Map<string, (typeof earlier)[number]>();
  for (const r of earlier) {
    const k = seriesKey(r);
    if (!map.has(k)) map.set(k, r);
  }
  return map;
}
