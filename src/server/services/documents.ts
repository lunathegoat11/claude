import "server-only";
import { createHash } from "node:crypto";
import type { DocumentType, Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { AppError, notFound } from "@/server/errors";
import { logger } from "@/server/logger";
import { ALLOWED_MIME, newStorageKey, sniffMime, storage } from "@/server/storage";
import { extractDocument } from "@/server/extraction/pipeline";
import { cleanImage } from "@/server/extraction/image-clean";
import { parseZonedInput, toDateInputValue } from "@/lib/format";
import {
  documentMetaSchema,
  labPanelSchema,
  labResultInputSchema,
  type LabResultInput,
} from "@/lib/validation/health";
import { OUTSIDE_RANGE_CHECK, type ParsedReport } from "@/server/extraction/lab-parser";
import { aiForUser } from "./ai-settings";
import { writePanel } from "./labs";
import { ensureProvider } from "./providers";
import { removeTimelineEvent, syncDocumentEvent } from "./timeline";

export interface UploadInput {
  buffer: Buffer;
  filename: string;
  declaredMime: string;
}

const ownedActive = (userId: string) => ({ userId, deletedAt: null });

export interface UploadOptions {
  /** Save a photo even though it looks too blurry/dark to read. */
  allowPoorQuality?: boolean;
  /** Seed data only: store the document without saving the values read from it. */
  saveResults?: boolean;
}

/** Turn what was read from a report into lab results that pass the same validation as manual entry. */
function resultsFrom(report: ParsedReport) {
  const out: LabResultInput[] = [];
  for (const c of report.candidates) {
    const checks = [...(c.warnings ?? [])];
    if (c.confidence < 0.5) checks.push("Read with low confidence. Check it against the report.");
    // If a decimal point may have been lost, don't judge high/low from the misread numbers:
    // keep the range as printed in the note instead of a possibly false alarm.
    // (An "outside the range, please check" note keeps the range: the flag may well be right.)
    const doubtful = (c.warnings ?? []).some((w) => !w.startsWith(OUTSIDE_RANGE_CHECK));
    if (doubtful && c.refText) checks.push(`Range as read: ${c.refText}.`);
    const parsed = labResultInputSchema.safeParse({
      testName: c.testName,
      biomarkerCode: c.biomarkerCode ?? undefined,
      value: c.value,
      unit: c.unit ?? undefined,
      refText: doubtful ? undefined : (c.refText ?? undefined),
      refLow: doubtful ? undefined : (c.refLow ?? undefined),
      refHigh: doubtful ? undefined : (c.refHigh ?? undefined),
      labFlag: doubtful ? undefined : (c.labFlag ?? undefined),
      notes: checks.length ? checks.join(" ") : undefined,
    });
    if (parsed.success) out.push(parsed.data);
  }
  return out.slice(0, 100);
}

/** File names that phones and apps give photos automatically. */
export function isCameraFileName(name: string) {
  const n = name.trim().toLowerCase();
  return (
    !/[a-z]{3}/.test(
      n.replace(/^(img|dsc|pxl|wa|vid|photo|image|scan|screenshot|document|file|untitled|cam)/, ""),
    ) ||
    /^(whatsapp image|screenshot|camscanner|scanned|scan|photo|image|document|untitled|img|pxl|dsc)\b/.test(
      n,
    )
  );
}

export async function uploadDocument(
  userId: string,
  file: UploadInput,
  rawMeta: unknown,
  tz: string,
  opts: UploadOptions = {},
) {
  // "AUTO" lets Kosha decide: it becomes a lab report if test results are found.
  const metaIn = { ...(rawMeta as Record<string, unknown>) };
  const autoType = !metaIn.type || metaIn.type === "AUTO";
  if (autoType) metaIn.type = "OTHER";
  const meta = documentMetaSchema.parse(metaIn);
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
  // Strip hidden photo metadata (e.g. GPS location) before anything is read or stored.
  file = { ...file, buffer: await cleanImage(file.buffer, sniffed) };
  if (meta.recordId) {
    const rec = await db.medicalRecord.findFirst({
      where: { id: meta.recordId, ...ownedActive(userId) },
      select: { id: true },
    });
    if (!rec) throw notFound("Medical record");
  }
  let documentDate = meta.documentDate ? parseZonedInput(meta.documentDate, tz) : null;

  // Read the document first, so a photo that can't be read is refused before anything is stored.
  const readLabs = autoType || meta.type === "LAB_REPORT";
  const extraction = await extractDocument(file.buffer, sniffed, {
    ai: await aiForUser(userId),
    allowPoorQuality: opts.allowPoorQuality,
  });
  if (extraction.quality) throw new AppError("IMAGE_QUALITY", extraction.quality.message);

  const report = readLabs ? extraction.report : null;
  const results = report && opts.saveResults !== false ? resultsFrom(report) : [];
  const type = autoType ? (results.length ? "LAB_REPORT" : "OTHER") : meta.type;
  const reportDate = report?.collectedAt ?? null;
  if (!documentDate && reportDate) documentDate = parseZonedInput(reportDate, tz);
  // A camera's file name ("2", "IMG_2041", "WhatsApp Image …") says nothing; name the
  // document after the report that was read instead.
  const name =
    results.length && report?.reportName && isCameraFileName(meta.name)
      ? report.reportName.slice(0, 200)
      : meta.name;
  const providerName = meta.providerName ?? report?.labName ?? null;

  const key = newStorageKey(userId, ALLOWED_MIME[sniffed].ext);
  await storage().put(key, file.buffer, sniffed);

  try {
    return await db.$transaction(async (tx) => {
      const providerId = await ensureProvider(
        tx,
        userId,
        providerName ?? undefined,
        type === "LAB_REPORT" ? "LABORATORY" : "OTHER",
      );
      const doc = await tx.medicalDocument.create({
        data: {
          userId,
          name,
          type,
          documentDate,
          providerId,
          providerName,
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

      // Save the results right away, linked to this document and dated from the report.
      let panel: { id: string; name: string; collectedAt: Date } | null = null;
      if (results.length) {
        const collectedAt = documentDate ?? new Date();
        const panelInput = labPanelSchema.parse({
          name: report!.reportName,
          collectedAt: toDateInputValue(collectedAt, tz),
          labName: providerName ?? undefined,
          documentId: doc.id,
          notes: reportDate
            ? undefined
            : documentDate
              ? "Date taken from the document details you entered."
              : "No date was found on the report, so the upload date was used. Edit this report to set the right date.",
          results,
        });
        panel = await writePanel(
          tx,
          userId,
          panelInput,
          collectedAt,
          sniffed === "application/pdf" ? "PDF_IMPORT" : "IMAGE_IMPORT",
        );
      }
      return {
        document: doc,
        panelId: panel?.id ?? null,
        reportName: panel?.name ?? null,
        collectedAt: panel?.collectedAt ?? null,
        dateFound: Boolean(reportDate),
        resultCount: results.length,
        extractionStatus: extraction.status,
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

/** Delete a document for good: its details, the text read from it and the file itself. */
export async function deleteDocument(userId: string, id: string) {
  const doc = await db.medicalDocument.findFirst({
    where: { id, ...ownedActive(userId) },
    select: { id: true, storageKey: true },
  });
  if (!doc) throw notFound("Document");
  await db.$transaction(async (tx) => {
    await removeTimelineEvent(tx, "DOCUMENT", id);
    await tx.medicalDocument.delete({ where: { id } });
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
