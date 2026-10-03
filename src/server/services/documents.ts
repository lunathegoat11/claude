import "server-only";
import { createHash } from "node:crypto";
import type { DocumentType, Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { AppError, notFound } from "@/server/errors";
import { logger } from "@/server/logger";
import { ALLOWED_MIME, newStorageKey, sniffMime, storage } from "@/server/storage";
import { extractDocument } from "@/server/extraction/pipeline";
import { parseZonedInput } from "@/lib/format";
import { documentMetaSchema } from "@/lib/validation/health";
import { ensureProvider } from "./providers";
import { removeTimelineEvent, syncDocumentEvent } from "./timeline";

export interface UploadInput {
  buffer: Buffer;
  filename: string;
  declaredMime: string;
}

const ownedActive = (userId: string) => ({ userId, deletedAt: null });

export async function uploadDocument(
  userId: string,
  file: UploadInput,
  rawMeta: unknown,
  tz: string,
) {
  const meta = documentMetaSchema.parse(rawMeta);
  const maxBytes = env().MAX_UPLOAD_MB * 1024 * 1024;
  if (file.buffer.length === 0) throw new AppError("VALIDATION", "The file is empty.");
  if (file.buffer.length > maxBytes)
    throw new AppError("PAYLOAD_TOO_LARGE", `Files must be ${env().MAX_UPLOAD_MB} MB or smaller.`);
  const sniffed = sniffMime(file.buffer);
  if (!sniffed || !ALLOWED_MIME[sniffed]) {
    throw new AppError(
      "UNSUPPORTED_MEDIA",
      "Only PDF, JPG, PNG, WebP and HEIC files are supported.",
    );
  }
  if (meta.recordId) {
    const rec = await db.medicalRecord.findFirst({
      where: { id: meta.recordId, ...ownedActive(userId) },
      select: { id: true },
    });
    if (!rec) throw notFound("Medical record");
  }
  const documentDate = meta.documentDate ? parseZonedInput(meta.documentDate, tz) : null;

  const key = newStorageKey(userId, ALLOWED_MIME[sniffed].ext);
  await storage().put(key, file.buffer, sniffed);

  // Extract text (and candidate lab values for lab reports) before saving metadata.
  const isLab = meta.type === "LAB_REPORT";
  const extraction = await extractDocument(file.buffer, sniffed, isLab);

  try {
    return await db.$transaction(async (tx) => {
      const providerId = await ensureProvider(
        tx,
        userId,
        meta.providerName,
        isLab ? "LABORATORY" : "OTHER",
      );
      const doc = await tx.medicalDocument.create({
        data: {
          userId,
          name: meta.name,
          type: meta.type,
          documentDate,
          providerId,
          providerName: meta.providerName ?? null,
          recordId: meta.recordId ?? null,
          storageKey: key,
          originalFilename: file.filename.slice(0, 200),
          mimeType: sniffed,
          sizeBytes: file.buffer.length,
          sha256: createHash("sha256").update(file.buffer).digest("hex"),
          tags: meta.tags,
          notes: meta.notes ?? null,
          extractedText: extraction.text,
          extractionStatus: extraction.status,
        },
      });
      await syncDocumentEvent(tx, doc);
      let importJobId: string | null = null;
      if (isLab && extraction.report && extraction.report.candidates.length) {
        const job = await tx.importJob.create({
          data: {
            userId,
            documentId: doc.id,
            kind: "LAB_REPORT",
            extractor: extraction.extractor,
            candidates: extraction.report.candidates as unknown as Prisma.InputJsonValue,
            meta: {
              collectedAt: extraction.report.collectedAt,
              labName: extraction.report.labName ?? meta.providerName ?? null,
            },
          },
        });
        importJobId = job.id;
      }
      return {
        document: doc,
        importJobId,
        extractionStatus: extraction.status,
        candidateCount: extraction.report?.candidates.length ?? 0,
      };
    });
  } catch (err) {
    // Roll back the stored object if metadata could not be written.
    await storage()
      .delete(key)
      .catch((e) => logger.error("storage.cleanup_failed", { err: e }));
    throw err;
  }
}

export interface DocumentListQuery {
  q?: string;
  type?: DocumentType;
  tag?: string;
  page?: number;
  pageSize?: number;
}

export async function listDocuments(userId: string, query: DocumentListQuery = {}) {
  const pageSize = Math.min(query.pageSize ?? 24, 100);
  const page = Math.max(query.page ?? 1, 1);
  const q = query.q?.trim();
  const where: Prisma.MedicalDocumentWhereInput = {
    ...ownedActive(userId),
    ...(query.type ? { type: query.type } : {}),
    ...(query.tag ? { tags: { has: query.tag } } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { providerName: { contains: q, mode: "insensitive" } },
            { notes: { contains: q, mode: "insensitive" } },
            { extractedText: { contains: q, mode: "insensitive" } },
            { tags: { has: q.toLowerCase() } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    db.medicalDocument.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      // Never select extracted text for list views.
      select: {
        id: true,
        name: true,
        type: true,
        documentDate: true,
        providerName: true,
        mimeType: true,
        sizeBytes: true,
        tags: true,
        createdAt: true,
        isDemo: true,
        extractionStatus: true,
      },
    }),
    db.medicalDocument.count({ where }),
  ]);
  return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getDocument(userId: string, id: string) {
  const doc = await db.medicalDocument.findFirst({
    where: { id, ...ownedActive(userId) },
    include: {
      record: { select: { id: true, title: true, deletedAt: true } },
      labPanels: {
        where: { deletedAt: null },
        select: { id: true, name: true, collectedAt: true },
      },
      importJobs: { where: { status: "AWAITING_REVIEW" }, select: { id: true } },
    },
  });
  if (!doc) throw notFound("Document");
  return doc;
}

/** Ownership-checked file access for the download/preview route. */
export async function openDocumentFile(userId: string, id: string) {
  const doc = await db.medicalDocument.findFirst({
    where: { id, ...ownedActive(userId) },
    select: {
      id: true,
      storageKey: true,
      mimeType: true,
      sizeBytes: true,
      name: true,
      originalFilename: true,
    },
  });
  if (!doc) throw notFound("Document");
  const file = await storage().get(doc.storageKey);
  return { doc, ...file };
}

export async function updateDocument(userId: string, id: string, rawMeta: unknown, tz: string) {
  const meta = documentMetaSchema.parse(rawMeta);
  return db.$transaction(async (tx) => {
    const existing = await tx.medicalDocument.findFirst({
      where: { id, ...ownedActive(userId) },
      select: { id: true },
    });
    if (!existing) throw notFound("Document");
    if (meta.recordId) {
      const rec = await tx.medicalRecord.findFirst({
        where: { id: meta.recordId, ...ownedActive(userId) },
        select: { id: true },
      });
      if (!rec) throw notFound("Medical record");
    }
    const providerId = await ensureProvider(
      tx,
      userId,
      meta.providerName,
      meta.type === "LAB_REPORT" ? "LABORATORY" : "OTHER",
    );
    const doc = await tx.medicalDocument.update({
      where: { id },
      data: {
        name: meta.name,
        type: meta.type,
        providerName: meta.providerName ?? null,
        providerId,
        notes: meta.notes ?? null,
        tags: meta.tags,
        recordId: meta.recordId ?? null,
        documentDate: meta.documentDate ? parseZonedInput(meta.documentDate, tz) : null,
      },
    });
    await syncDocumentEvent(tx, doc);
    return doc;
  });
}

/**
 * Delete a document: metadata is soft-deleted (for audit consistency) and the
 * file itself is removed from storage immediately, along with extracted text.
 */
export async function deleteDocument(userId: string, id: string) {
  const doc = await db.medicalDocument.findFirst({
    where: { id, ...ownedActive(userId) },
    select: { id: true, storageKey: true },
  });
  if (!doc) throw notFound("Document");
  await db.$transaction(async (tx) => {
    await tx.medicalDocument.update({
      where: { id },
      data: { deletedAt: new Date(), extractedText: null },
    });
    await tx.importJob.updateMany({
      where: { documentId: id, status: "AWAITING_REVIEW" },
      data: { status: "DISCARDED" },
    });
    await removeTimelineEvent(tx, "DOCUMENT", id);
  });
  await storage()
    .delete(doc.storageKey)
    .catch((err) => logger.error("storage.delete_failed", { err }));
}

export async function listDocumentOptions(userId: string) {
  return db.medicalDocument.findMany({
    where: ownedActive(userId),
    select: { id: true, name: true, documentDate: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}
