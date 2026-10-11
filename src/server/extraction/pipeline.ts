import "server-only";
import { SHARP_INPUT } from "@/server/extraction/sharp-options";
import { logger } from "@/server/logger";
import type { ResolvedAI } from "@/server/services/ai-settings";
import { extractPdfText } from "./pdf";
import { ocrAvailable, ocrImagePasses } from "./ocr";
import { env } from "@/server/env";
import { assessImage, QUALITY_MESSAGES, type ImageQuality } from "./image-quality";
import {
  candidatesFromResults,
  findLabName,
  tidyLabName,
  mergeReports,
  parseLabText,
  reportNameFor,
  type ParsedReport,
} from "./lab-parser";

export interface ExtractionResult {
  status: "COMPLETED" | "FAILED" | "UNSUPPORTED";
  text: string | null;
  extractor: string;
  report: ParsedReport | null;
  /** Set when a photo is too blurry/dark/small to read. The upload is refused unless the user insists. */
  quality: { problem: NonNullable<ImageQuality["problem"]>; message: string } | null;
}

const READABLE_IMAGES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Photos sent to an AI service are straightened, scaled to at most 2400px and re-encoded
 * as JPEG: this keeps them under the service's size limit and strips hidden metadata
 * such as the GPS location phones embed in photos.
 */
async function prepareForAI(buf: Buffer): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  return sharp(buf, SHARP_INPUT)
    .rotate()
    .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 88 })
    .toBuffer();
}

/** Accept only a real, past, plausible YYYY-MM-DD date. */
export function plausibleDate(d: string | null | undefined): string | null {
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const t = Date.parse(`${d}T00:00:00Z`);
  if (!Number.isFinite(t) || new Date(t).toISOString().slice(0, 10) !== d) return null;
  if (t > Date.now() + 86_400_000 || new Date(t).getUTCFullYear() < 1950) return null;
  return d;
}

function result(
  status: ExtractionResult["status"],
  extractor: string,
  text: string | null = null,
  report: ParsedReport | null = null,
): ExtractionResult {
  return { status, text, extractor, report, quality: null };
}

/**
 * Document → text → lab results.
 *
 *   1. Photos are checked for blur, darkness and size first.
 *   2. If the user's AI may read documents, the PDF or photo itself is sent to it and every
 *      result comes back as validated JSON (best for real-world table layouts).
 *   3. Otherwise (or if the AI call fails): PDF text layer / on-server OCR, then the
 *      built-in parser.
 */
export async function extractDocument(
  buf: Buffer,
  mimeType: string,
  opts: { ai?: ResolvedAI | null; allowPoorQuality?: boolean } = {},
): Promise<ExtractionResult> {
  const isPdf = mimeType === "application/pdf";
  const isImage = READABLE_IMAGES.includes(mimeType);
  try {
    if (isImage && !opts.allowPoorQuality) {
      const q = await assessImage(buf).catch((err) => {
        logger.warn("extraction.quality_check_failed", { err });
        return null;
      });
      if (q?.problem) {
        return {
          ...result("FAILED", "quality-check"),
          quality: { problem: q.problem, message: QUALITY_MESSAGES[q.problem] },
        };
      }
    }

    const ai = opts.ai;
    if ((isPdf || isImage) && ai?.readDocuments && ai.provider.extractReport) {
      try {
        const r = await ai.provider.extractReport(
          isPdf
            ? { kind: "pdf", data: buf }
            : { kind: "image", data: await prepareForAI(buf), mimeType: "image/jpeg" },
        );
        if (!r.readable && r.problem === "BLURRY" && isImage && !opts.allowPoorQuality) {
          return {
            ...result("FAILED", `ai:${ai.provider.name}`),
            quality: { problem: "BLURRY", message: QUALITY_MESSAGES.BLURRY },
          };
        }
        const pdfText = isPdf ? (await extractPdfText(buf).catch(() => "")).trim() : "";
        const text = (pdfText || r.transcript?.trim() || "").slice(0, 200_000) || null;
        const candidates = r.readable ? candidatesFromResults(r.results) : [];
        return result("COMPLETED", `ai:${ai.provider.name}`, text, {
          candidates,
          collectedAt: plausibleDate(r.collectedAt),
          labName: r.labName?.trim().slice(0, 160) || null,
          reportName: r.reportName?.trim().slice(0, 160) || reportNameFor(candidates),
        });
      } catch (err) {
        // Fall back to reading the document on this server.
        logger.warn("extraction.ai_failed", { provider: ai.provider.name, err });
      }
    }

    if (isPdf) {
      const text = (await extractPdfText(buf)).trim();
      // A scanned PDF has no text layer; it needs a photo or an AI key to be read.
      if (!text) return result("UNSUPPORTED", "pdf-text");
      return result("COMPLETED", "pdf-text", text, parseLabText(text));
    }

    if (isImage) {
      if (ai?.readDocuments && ai.provider.transcribeImage) {
        try {
          const text = (
            await ai.provider.transcribeImage(await prepareForAI(buf), "image/jpeg")
          ).trim();
          if (text && text !== "UNREADABLE")
            return result("COMPLETED", `vision:${ai.provider.name}`, text, parseLabText(text));
        } catch (err) {
          logger.warn("extraction.vision_failed", { provider: ai.provider.name, err });
        }
      }
      if (!env().OCR_ENABLED || !ocrAvailable()) return result("UNSUPPORTED", "none");
      const passes = await ocrImagePasses(buf);
      const texts = passes.texts.map((t) => t.trim());
      const text = texts[0];
      if (text.replace(/\s/g, "").length < 20) return result("FAILED", "ocr");
      const report = mergeReports(texts.map((t) => parseLabText(t, { source: "ocr" })));
      const labName = (passes.header && findLabName(passes.header)) || report.labName;
      report.labName = labName ? tidyLabName(labName, texts.join("\n")) : null;
      return result("COMPLETED", "ocr", text, report);
    }

    // HEIC can't be decoded without extra system libraries.
    return result("UNSUPPORTED", "none");
  } catch (err) {
    logger.error("extraction.failed", { mimeType, err });
    return result("FAILED", "error");
  }
}
