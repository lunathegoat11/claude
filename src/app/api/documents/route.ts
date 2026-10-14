import { env } from "@/server/env";
import type { NextRequest } from "next/server";
import { withApi, json } from "@/server/api";
import { AppError } from "@/server/errors";
import { listDocuments, uploadDocument } from "@/server/services/documents";
import { audit } from "@/server/audit";
import { reserveUpload } from "@/server/services/billing";
import { DOCUMENT_TYPES } from "@/lib/validation/health";
import type { DocumentType } from "@prisma/client";

export const runtime = "nodejs";

/** GET /api/documents — paginated metadata list (no file contents, no extracted text). */
export const GET = withApi(async (req, { user }) => {
  const sp = req.nextUrl.searchParams;
  const type = sp.get("type");
  const result = await listDocuments(user.id, {
    q: sp.get("q") ?? undefined,
    type: DOCUMENT_TYPES.includes(type as DocumentType) ? (type as DocumentType) : undefined,
    page: Number(sp.get("page")) || 1,
    pageSize: Number(sp.get("pageSize")) || 24,
  });
  return json(result);
});

/** POST /api/documents — multipart upload: file + metadata fields. */
export const POST = withApi(
  async (req: NextRequest, { user }) => {
    // Check the size before reading the body, so an oversized upload is never held in memory.
    const contentLength = Number(req.headers.get("content-length"));
    if (!Number.isFinite(contentLength) || contentLength <= 0)
      throw new AppError("VALIDATION", "The upload could not be read. Please try again.");
    if (contentLength > env().MAX_UPLOAD_MB * 1024 * 1024 + 64 * 1024)
      throw new AppError("PAYLOAD_TOO_LARGE", `Files can be up to ${env().MAX_UPLOAD_MB} MB.`);
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      throw new AppError("VALIDATION", "The upload could not be read. Please try again.");
    }
    const file = form.get("file");
    if (!(file instanceof File))
      throw new AppError("VALIDATION", "Choose a file to upload.", { file: ["Choose a file"] });
    const meta: Record<string, string> = {};
    for (const key of [
      "name",
      "type",
      "documentDate",
      "providerName",
      "notes",
      "tags",
      "recordId",
    ]) {
      const v = form.get(key);
      if (typeof v === "string") meta[key] = v;
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    // The free plan has a few uploads a month; this counts the upload (and gives it back
    // if the upload fails).
    const giveBack = await reserveUpload(user.id, user.timezone);
    const result = await uploadDocument(
      user.id,
      { buffer, filename: file.name, declaredMime: file.type },
      meta,
      user.timezone,
      { allowPoorQuality: form.get("allowPoorQuality") === "1" },
    ).catch(async (e) => {
      await giveBack();
      throw e;
    });
    await audit(
      user.id,
      "document.upload",
      { type: "MedicalDocument", id: result.document.id },
      { ip: req.headers.get("x-forwarded-for"), userAgent: req.headers.get("user-agent") },
      { sizeBytes: buffer.length, mimeType: result.document.mimeType },
    );
    return json(
      {
        id: result.document.id,
        panelId: result.panelId,
        reportName: result.reportName,
        collectedAt: result.collectedAt,
        dateFound: result.dateFound,
        resultCount: result.resultCount,
        extractionStatus: result.extractionStatus,
      },
      { status: 201 },
    );
  },
  { bucket: "upload" },
);
