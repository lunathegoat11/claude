import { Readable } from "node:stream";
import { withApi } from "@/server/api";
import { openDocumentFile } from "@/server/services/documents";
import { audit } from "@/server/audit";
import { uuid } from "@/lib/validation/common";
import { notFound } from "@/server/errors";

export const runtime = "nodejs";

const THUMBABLE = ["image/jpeg", "image/png", "image/webp"];

/**
 * Streams a document to its owner only. Files are never publicly addressable;
 * this handler checks the session and ownership on every request.
 */
export const GET = withApi<{ id: string }>(async (req, { user, params }) => {
  if (!uuid.safeParse(params.id).success) throw notFound("Document");
  const download = req.nextUrl.searchParams.get("download") === "1";
  const { doc, body, size } = await openDocumentFile(user.id, params.id);

  // Small previews for lists: a ~20 KB thumbnail instead of a multi-megabyte photo,
  // which matters on low-end phones and slow or metered connections.
  if (req.nextUrl.searchParams.get("size") === "thumb" && THUMBABLE.includes(doc.mimeType)) {
    const chunks: Buffer[] = [];
    for await (const c of body as Readable) chunks.push(Buffer.from(c));
    const sharp = (await import("sharp")).default;
    const thumb = await sharp(Buffer.concat(chunks), { failOn: "none" })
      .rotate()
      .resize({ width: 480, height: 320, fit: "cover", position: "top" })
      .webp({ quality: 70 })
      .toBuffer();
    return new Response(new Uint8Array(thumb), {
      headers: {
        "Content-Type": "image/webp",
        "Content-Length": String(thumb.length),
        "Cache-Control": "private, max-age=600",
        "X-Content-Type-Options": "nosniff",
        "Cross-Origin-Resource-Policy": "same-origin",
      },
    });
  }

  await audit(
    user.id,
    download ? "document.download" : "document.view",
    { type: "MedicalDocument", id: doc.id },
    { ip: req.headers.get("x-forwarded-for"), userAgent: req.headers.get("user-agent") },
  );
  const ext = doc.originalFilename.includes(".")
    ? doc.originalFilename.split(".").pop()
    : doc.mimeType.split("/")[1];
  const filename = `${
    doc.name
      .replace(/[^\w\s.-]/g, "")
      .trim()
      .slice(0, 80) || "document"
  }.${ext}`;
  return new Response(Readable.toWeb(body as Readable) as ReadableStream, {
    headers: {
      "Content-Type": doc.mimeType,
      ...(size ? { "Content-Length": String(size) } : {}),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      // Images get a locked-down CSP. PDFs are left to the browser's built-in viewer
      // (a sandbox CSP would block it); their type is verified by magic bytes on upload.
      ...(doc.mimeType.startsWith("image/")
        ? {
            "Content-Security-Policy":
              "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
          }
        : {}),
      "Cross-Origin-Resource-Policy": "same-origin",
    },
  });
});
