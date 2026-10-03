import "server-only";
import path from "node:path";
import { existsSync } from "node:fs";
import { logger } from "@/server/logger";

/**
 * On-server OCR for photos of lab reports, using Tesseract (WebAssembly) with the
 * English model shipped in node_modules — no external service, no network access.
 *
 * Photos are straightened, converted to greyscale, enlarged and contrast-normalised
 * first, which noticeably improves recognition of small printed numbers.
 */
const OCR_TIMEOUT_MS = 60_000;

function langPath() {
  const p = path.join(process.cwd(), "node_modules", "@tesseract.js-data", "eng", "4.0.0");
  return existsSync(p) ? p : null;
}

export function ocrAvailable() {
  return langPath() !== null;
}

async function preprocess(buf: Buffer): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  const img = sharp(buf, { failOn: "none" }).rotate(); // honour EXIF orientation from phones
  const meta = await img.metadata();
  const width = meta.width ?? 1500;
  // Upscale small images; keep very large photos at a sensible size.
  const target = Math.max(2000, Math.min(width * 2, 3200));
  return img
    .grayscale()
    .resize({ width: target, withoutEnlargement: false })
    .normalize()
    .png()
    .toBuffer();
}

export async function ocrImage(buf: Buffer): Promise<string> {
  const lp = langPath();
  if (!lp) throw new Error("OCR language data not installed");
  const { createWorker } = await import("tesseract.js");
  const input = await preprocess(buf);
  const worker = await createWorker("eng", 1, { langPath: lp, cacheMethod: "none", gzip: true });
  try {
    await worker.setParameters({ preserve_interword_spaces: "1" });
    const result = await Promise.race([
      worker.recognize(input),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("OCR timed out")), OCR_TIMEOUT_MS),
      ),
    ]);
    return result.data.text;
  } catch (err) {
    logger.error("ocr.failed", { err });
    throw err;
  } finally {
    await worker.terminate().catch(() => undefined);
  }
}
