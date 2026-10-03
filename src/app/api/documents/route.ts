import type { NextRequest } from "next/server";
import { withApi, json } from "@/server/api";
import { AppError } from "@/server/errors";
import { listDocuments, uploadDocument } from "@/server/services/documents";
import { audit } from "@/server/audit";
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
    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > 110 * 1024 * 1024)
      throw new AppError("PAYLOAD_TOO_LARGE", "File is too large.");
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
    const result = await uploadDocument(
      user.id,
      { buffer, filename: file.name, declaredMime: file.type },
      meta,
      user.timezone,
    );
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
        importJobId: result.importJobId,
        extractionStatus: result.extractionStatus,
        candidateCount: result.candidateCount,
      },
      { status: 201 },
    );
  },
  { bucket: "upload" },
);
