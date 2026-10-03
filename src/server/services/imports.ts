import "server-only";
import { db } from "@/server/db";
import { AppError, notFound } from "@/server/errors";
import type { LabCandidate } from "@/server/extraction/lab-parser";
import { createLabPanel } from "./labs";

export async function getImportJob(userId: string, id: string) {
  const job = await db.importJob.findFirst({
    where: { id, userId },
    include: {
      document: {
        select: {
          id: true,
          name: true,
          documentDate: true,
          providerName: true,
          mimeType: true,
          deletedAt: true,
        },
      },
    },
  });
  if (!job) throw notFound("Import");
  return {
    ...job,
    candidates: job.candidates as unknown as LabCandidate[],
    meta: (job.meta ?? {}) as { collectedAt?: string | null; labName?: string | null },
  };
}

export async function listPendingImports(userId: string) {
  return db.importJob.findMany({
    where: { userId, status: "AWAITING_REVIEW", document: { deletedAt: null } },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, createdAt: true, document: { select: { name: true } } },
  });
}

/**
 * Save the values the user reviewed. The submitted panel (which may have
 * been corrected by the user) is validated like any manual entry.
 */
export async function confirmImport(userId: string, jobId: string, panel: unknown, tz: string) {
  const job = await db.importJob.findFirst({
    where: { id: jobId, userId },
    include: { document: { select: { id: true, mimeType: true, deletedAt: true } } },
  });
  if (!job) throw notFound("Import");
  if (job.status !== "AWAITING_REVIEW")
    throw new AppError("CONFLICT", "This import has already been reviewed.");
  const source = job.document?.mimeType === "application/pdf" ? "PDF_IMPORT" : "IMAGE_IMPORT";
  const docId = job.document && !job.document.deletedAt ? job.document.id : undefined;
  const created = await createLabPanel(
    userId,
    { ...(panel as object), documentId: docId },
    tz,
    source,
  );
  await db.importJob.update({
    where: { id: jobId },
    data: { status: "CONFIRMED", confirmedAt: new Date() },
  });
  return created;
}

export async function discardImport(userId: string, jobId: string) {
  const res = await db.importJob.updateMany({
    where: { id: jobId, userId, status: "AWAITING_REVIEW" },
    data: { status: "DISCARDED" },
  });
  if (!res.count) throw notFound("Import");
}
