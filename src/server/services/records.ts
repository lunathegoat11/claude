import "server-only";
import type { Prisma, RecordType } from "@prisma/client";
import { db } from "@/server/db";
import { notFound } from "@/server/errors";
import { parseZonedInput } from "@/lib/format";
import { recordSchema, type RecordInput } from "@/lib/validation/health";
import { ensureProvider } from "./providers";
import { removeTimelineEvent, syncRecordEvent } from "./timeline";
import { AppError } from "@/server/errors";

export interface RecordListQuery {
  q?: string;
  type?: RecordType;
  tag?: string;
  sort?: "date_desc" | "date_asc" | "updated";
  page?: number;
  pageSize?: number;
}

const ownedActive = (userId: string) => ({ userId, deletedAt: null });

export async function listRecords(userId: string, query: RecordListQuery = {}) {
  const pageSize = Math.min(query.pageSize ?? 20, 100);
  const page = Math.max(query.page ?? 1, 1);
  const q = query.q?.trim();
  const where: Prisma.MedicalRecordWhereInput = {
    ...ownedActive(userId),
    ...(query.type ? { type: query.type } : {}),
    ...(query.tag ? { tags: { has: query.tag } } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { notes: { contains: q, mode: "insensitive" } },
            { doctorName: { contains: q, mode: "insensitive" } },
            { facilityName: { contains: q, mode: "insensitive" } },
            { specialty: { contains: q, mode: "insensitive" } },
            { tags: { has: q.toLowerCase() } },
          ],
        }
      : {}),
  };
  const orderBy: Prisma.MedicalRecordOrderByWithRelationInput[] =
    query.sort === "date_asc"
      ? [{ date: "asc" }]
      : query.sort === "updated"
        ? [{ updatedAt: "desc" }]
        : [{ date: "desc" }];
  const [items, total] = await Promise.all([
    db.medicalRecord.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { documents: { where: { deletedAt: null } } } } },
    }),
    db.medicalRecord.count({ where }),
  ]);
  return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getRecord(userId: string, id: string) {
  const record = await db.medicalRecord.findFirst({
    where: { id, ...ownedActive(userId) },
    include: {
      documents: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } },
      provider: true,
    },
  });
  if (!record) throw notFound("Medical record");
  return record;
}

function toData(input: RecordInput, tz: string) {
  const date = parseZonedInput(input.date, tz);
  if (!date)
    throw new AppError("VALIDATION", "Date is not valid.", { date: ["Date is not valid"] });
  const endDate = input.endDate ? parseZonedInput(input.endDate, tz) : null;
  return {
    type: input.type,
    title: input.title,
    date,
    endDate,
    doctorName: input.doctorName ?? null,
    facilityName: input.facilityName ?? null,
    specialty: input.specialty ?? null,
    notes: input.notes ?? null,
    tags: input.tags,
  };
}

export async function createRecord(userId: string, raw: unknown, tz: string) {
  const input = recordSchema.parse(raw);
  const data = toData(input, tz);
  return db.$transaction(async (tx) => {
    const providerId = await ensureProvider(
      tx,
      userId,
      data.facilityName,
      input.type === "HOSPITALIZATION" ? "HOSPITAL" : "CLINIC",
    );
    const record = await tx.medicalRecord.create({ data: { ...data, userId, providerId } });
    await syncRecordEvent(tx, record);
    return record;
  });
}

export async function updateRecord(userId: string, id: string, raw: unknown, tz: string) {
  const input = recordSchema.parse(raw);
  const data = toData(input, tz);
  return db.$transaction(async (tx) => {
    const existing = await tx.medicalRecord.findFirst({
      where: { id, ...ownedActive(userId) },
      select: { id: true },
    });
    if (!existing) throw notFound("Medical record");
    const providerId = await ensureProvider(
      tx,
      userId,
      data.facilityName,
      input.type === "HOSPITALIZATION" ? "HOSPITAL" : "CLINIC",
    );
    const record = await tx.medicalRecord.update({ where: { id }, data: { ...data, providerId } });
    await syncRecordEvent(tx, record);
    return record;
  });
}

/** Soft delete; attached documents are kept but unlinked. */
export async function deleteRecord(userId: string, id: string) {
  await db.$transaction(async (tx) => {
    const res = await tx.medicalRecord.updateMany({
      where: { id, ...ownedActive(userId) },
      data: { deletedAt: new Date() },
    });
    if (res.count === 0) throw notFound("Medical record");
    await tx.medicalDocument.updateMany({
      where: { recordId: id, userId },
      data: { recordId: null },
    });
    await removeTimelineEvent(tx, "MEDICAL_RECORD", id);
  });
}

export async function listRecordTags(userId: string) {
  const rows = await db.$queryRaw<{ tag: string; n: bigint }[]>`
    SELECT unnest(tags) AS tag, COUNT(*) AS n FROM "MedicalRecord"
    WHERE "userId" = ${userId}::uuid AND "deletedAt" IS NULL
    GROUP BY tag ORDER BY n DESC, tag ASC LIMIT 50`;
  return rows.map((r) => ({ tag: r.tag, count: Number(r.n) }));
}

export async function listRecordOptions(userId: string) {
  return db.medicalRecord.findMany({
    where: ownedActive(userId),
    select: { id: true, title: true, date: true, type: true },
    orderBy: { date: "desc" },
    take: 100,
  });
}
