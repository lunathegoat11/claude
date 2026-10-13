import "server-only";
import { learnFromCorrection } from "./reading-patterns";
import { Prisma, type DataSource, type LabFlag } from "@prisma/client";
import { db, type Tx } from "@/server/db";
import { AppError, notFound } from "@/server/errors";
import { parseZonedInput } from "@/lib/format";
import { computeLabFlag, parseReferenceRange } from "@/lib/lab-range";
import { getBiomarker, matchBiomarker } from "@/lib/catalog/biomarkers";
import { formatTestName } from "@/lib/test-name";
import { RANGE_VERSION, flagAgainst, standardRangeFor } from "@/lib/catalog/standard-ranges";
import { labPanelSchema, type LabPanelInput } from "@/lib/validation/health";
import { toNum } from "@/lib/utils";
import { ensureProvider } from "./providers";
import { removeTimelineEvent, syncLabPanelEvent } from "./timeline";

/** Who the results belong to, for ranges that differ by sex or age. */
export type RangeFor = { sex?: string | null; dateOfBirth?: Date | null; on?: Date };

export function rangeForUser(tx: Tx, userId: string) {
  return tx.profile.findUnique({ where: { userId }, select: { sex: true, dateOfBirth: true } });
}

/** The standard range for a result, and the flag it gives (or the report's, if there is none). */
export function applyStandardRange(
  code: string | null,
  unit: string | null,
  value: number | null,
  reportFlag: LabFlag,
  who: RangeFor,
) {
  const std = standardRangeFor(code, unit, who);
  return {
    stdLow: std?.low != null ? new Prisma.Decimal(std.low) : null,
    stdHigh: std?.high != null ? new Prisma.Decimal(std.high) : null,
    stdText: std?.text ?? null,
    stdSource: std?.source ?? null,
    rangeVersion: RANGE_VERSION,
    flag: std ? flagAgainst(value, std) : reportFlag,
  };
}

/** rangeVersion of a result that isn't judged until the person checks its value. */
const UNCHECKED = -1;
const UNJUDGED = {
  stdLow: null,
  stdHigh: null,
  stdText: null,
  stdSource: null,
  flag: "UNKNOWN" as LabFlag,
};

export function normaliseResult(r: LabPanelInput["results"][number], who: RangeFor = {}) {
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
  const unit = r.unit ?? def?.units[0] ?? null;
  const reportFlag: LabFlag = computeLabFlag(valueNumeric, refLow, refHigh, r.labFlag ?? null);
  return {
    testName: def?.name ?? formatTestName(r.testName),
    biomarkerCode: def?.code ?? null,
    valueNumeric: valueNumeric !== null ? new Prisma.Decimal(valueNumeric) : null,
    valueText: valueNumeric === null ? r.value : null,
    unit,
    refLow: refLow !== null ? new Prisma.Decimal(refLow) : null,
    refHigh: refHigh !== null ? new Prisma.Decimal(refHigh) : null,
    refText: r.refText ?? null,
    // A value that may have been misread isn't judged until the person checks it (by
    // editing and saving the report).
    ...(r.unchecked
      ? { ...UNJUDGED, rangeVersion: UNCHECKED }
      : applyStandardRange(def?.code ?? null, unit, valueNumeric, reportFlag, who)),
    notes: r.notes ?? null,
  };
}

export async function writePanel(
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
    // The old values are replaced, not kept: nothing needs them once the edit is saved.
    await tx.labResult.deleteMany({ where: { panelId, userId, deletedAt: null } });
  }
  const who = { ...(await rangeForUser(tx, userId)), on: collectedAt };
  const results = input.results.map((r) => ({
    ...normaliseResult(r, who),
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
  const result = await db.$transaction(async (tx) => {
    const existing = await tx.labPanel.findFirst({
      where: { id: panelId, userId, deletedAt: null },
      select: {
        id: true,
        source: true,
        editedAt: true,
        results: {
          where: { deletedAt: null },
          select: { testName: true, biomarkerCode: true, valueNumeric: true, valueText: true },
        },
      },
    });
    if (!existing) throw notFound("Lab report");
    const panel = await writePanel(tx, userId, input, collectedAt, "MANUAL", panelId);
    await tx.labPanel.update({ where: { id: panelId }, data: { editedAt: new Date() } });
    // Only the first correction of values read automatically says anything about reading.
    const learnable =
      !existing.editedAt && ["IMAGE_IMPORT", "PDF_IMPORT"].includes(existing.source);
    return { panel, learnable, before: existing.results };
  });
  if (result.learnable) {
    const row = (r: {
      testName: string;
      biomarkerCode?: string | null;
      valueNumeric?: unknown;
      valueText?: string | null;
      value?: string | null;
    }) => ({
      testName: r.testName,
      biomarkerCode: r.biomarkerCode ?? null,
      value:
        r.value ??
        (r.valueNumeric != null ? String(Number(r.valueNumeric)) : (r.valueText ?? null)),
    });
    // Compared in memory, then dropped: only anonymous patterns are kept (if allowed).
    await learnFromCorrection(userId, result.before.map(row), input.results.map(row));
  }
  return result.panel;
}

export async function deleteLabPanel(userId: string, panelId: string) {
  await db.$transaction(async (tx) => {
    // Removed for good straight away: there's no reason to keep what someone deleted.
    await removeTimelineEvent(tx, "LAB_PANEL", panelId);
    await tx.labResult.deleteMany({ where: { panelId, userId } });
    const res = await tx.labPanel.deleteMany({ where: { id: panelId, userId, deletedAt: null } });
    if (!res.count) throw notFound("Lab report");
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
      stdLow: true,
      stdHigh: true,
      stdText: true,
      stdSource: true,
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
        testName: getBiomarker(r.biomarkerCode)?.name ?? formatTestName(r.testName),
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
    include: {
      panel: {
        select: {
          id: true,
          name: true,
          document: { select: { id: true, name: true, deletedAt: true } },
        },
      },
    },
  });
  if (!results.length) throw notFound("Lab test");
  const def = key.startsWith("name:") ? undefined : getBiomarker(key);
  return {
    key,
    testName: def?.name ?? formatTestName(results[results.length - 1].testName),
    description: def?.description ?? null,
    results,
  };
}

export async function deleteLabResult(userId: string, resultId: string) {
  const res = await db.labResult.deleteMany({ where: { id: resultId, userId, deletedAt: null } });
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

/**
 * Re-check saved results against the standard ranges: those saved before the current
 * ranges (at server start), or all of one person's results after they change their sex or
 * date of birth. Also links results to newly known tests and tidies their names.
 */
export async function reapplyRanges(opts: { userId?: string } = {}) {
  let cursor: string | undefined;
  let updated = 0;
  for (;;) {
    const rows = await db.labResult.findMany({
      where: {
        ...(opts.userId ? { userId: opts.userId } : {}),
        rangeVersion: opts.userId ? { not: UNCHECKED } : { gte: 0, lt: RANGE_VERSION },
      },
      orderBy: { id: "asc" },
      take: 200,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        biomarkerCode: true,
        testName: true,
        unit: true,
        valueNumeric: true,
        refLow: true,
        refHigh: true,
        flag: true,
        stdText: true,
        observedAt: true,
        user: { select: { profile: { select: { sex: true, dateOfBirth: true } } } },
      },
    });
    if (!rows.length) break;
    cursor = rows[rows.length - 1].id;
    for (const r of rows) {
      const def = getBiomarker(r.biomarkerCode) ?? matchBiomarker(r.testName);
      const value = toNum(r.valueNumeric);
      // Without a standard range, the report's range decides (as when it was saved).
      const reportFlag: LabFlag = r.stdText
        ? computeLabFlag(value, toNum(r.refLow), toNum(r.refHigh), null)
        : r.flag;
      await db.labResult.update({
        where: { id: r.id },
        data: {
          biomarkerCode: def?.code ?? null,
          testName: def?.name ?? formatTestName(r.testName),
          ...applyStandardRange(def?.code ?? null, r.unit, value, reportFlag, {
            ...r.user.profile,
            on: r.observedAt,
          }),
        },
      });
      updated++;
    }
  }
  return updated;
}
