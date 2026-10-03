import "server-only";
import { logger } from "@/server/logger";
import { aiProvider, visionExtractionEnabled } from "@/server/ai";
import { extractPdfText } from "./pdf";
import { ocrAvailable, ocrImage } from "./ocr";
import { env } from "@/server/env";
import { parseLabText, type ParsedReport } from "./lab-parser";

export interface ExtractionResult {
  status: "COMPLETED" | "FAILED" | "UNSUPPORTED";
  text: string | null;
  extractor: string;
  report: ParsedReport | null;
}

/**
 * Document → text → candidate lab values.
 *
 *   PDF   → text layer (unpdf)
 *   Image → transcription by a vision-capable AI provider if enabled,
 *           otherwise on-server OCR (Tesseract)
 *
 * The output is only ever a *proposal*; it is stored in an ImportJob and the
 * user must review and confirm before any LabResult rows are written.
 */
export async function extractDocument(
  buf: Buffer,
  mimeType: string,
  parseLabs: boolean,
): Promise<ExtractionResult> {
  try {
    if (mimeType === "application/pdf") {
      const text = (await extractPdfText(buf)).trim();
      if (!text) return { status: "UNSUPPORTED", text: null, extractor: "pdf-text", report: null };
      return {
        status: "COMPLETED",
        text,
        extractor: "pdf-text",
        report: parseLabs ? parseLabText(text) : null,
      };
    }
    if (mimeType.startsWith("image/")) {
      if (!visionExtractionEnabled()) {
        // Fall back to on-server OCR (HEIC can't be decoded without extra system libraries).
        if (!env().OCR_ENABLED || mimeType === "image/heic" || !ocrAvailable())
          return { status: "UNSUPPORTED", text: null, extractor: "none", report: null };
        const text = (await ocrImage(buf)).trim();
        if (text.replace(/\s/g, "").length < 20)
          return { status: "FAILED", text: null, extractor: "ocr", report: null };
        return {
          status: "COMPLETED",
          text,
          extractor: "ocr",
          report: parseLabs ? parseLabText(text, { source: "ocr" }) : null,
        };
      }
      const provider = aiProvider();
      const text = (await provider.transcribeImage!(buf, mimeType)).trim();
      if (!text || text === "UNREADABLE")
        return { status: "FAILED", text: null, extractor: `vision:${provider.name}`, report: null };
      return {
        status: "COMPLETED",
        text,
        extractor: `vision:${provider.name}`,
        report: parseLabs ? parseLabText(text) : null,
      };
    }
    return { status: "UNSUPPORTED", text: null, extractor: "none", report: null };
  } catch (err) {
    logger.error("extraction.failed", { mimeType, err });
    return { status: "FAILED", text: null, extractor: "error", report: null };
  }
}
