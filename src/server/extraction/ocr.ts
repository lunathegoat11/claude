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
const OCR_TIMEOUT_MS = 90_000;

function langPath() {
  const p = path.join(process.cwd(), "node_modules", "@tesseract.js-data", "eng", "4.0.0");
  return existsSync(p) ? p : null;
}

export function ocrAvailable() {
  return langPath() !== null;
}

/**
 * Two differently prepared copies of the photo. Report tables are read best when the
 * image is enlarged with a high-quality filter and sharpened; a second, higher-contrast
 * copy read with automatic layout catches rows the first one garbles. Comparing the two
 * reads is also how we know which values can be trusted.
 */
async function variants(buf: Buffer): Promise<{ img: Buffer; psm: "4" | "3" }[]> {
  const sharp = (await import("sharp")).default;
  const base = () => sharp(buf, { failOn: "none" }).rotate().grayscale(); // honour EXIF orientation
  const [a, b] = await Promise.all([
    base().resize({ width: 2600, kernel: "lanczos3" }).normalize().sharpen().png().toBuffer(),
    base()
      .resize({ width: 2400, kernel: "lanczos3" })
      .normalize()
      .linear(1.4, -40)
      .sharpen()
      .png()
      .toBuffer(),
  ]);
  // psm 4 = "a single column of text of variable sizes", which suits report tables.
  return [
    { img: a, psm: "4" },
    { img: b, psm: "3" },
  ];
}

/**
 * The top of the page on its own: hospital and lab names are often printed in white on a
 * coloured banner, which the full-page reads lose.
 */
async function headerStrip(buf: Buffer): Promise<Buffer | null> {
  const sharp = (await import("sharp")).default;
  const img = sharp(buf, { failOn: "none" }).rotate();
  const m = await img.metadata();
  const width = m.autoOrient?.width ?? m.width;
  const height = m.autoOrient?.height ?? m.height;
  if (!width || !height) return null;
  return img
    .extract({ left: 0, top: 0, width, height: Math.max(1, Math.round(height * 0.18)) })
    .grayscale()
    .resize({ width: 2400, kernel: "lanczos3" })
    .normalize()
    .sharpen()
    .png()
    .toBuffer();
}

/**
 * Read a photo twice (see `variants`) plus its header strip. Returns both page texts,
 * best first, and the header text.
 */
export async function ocrImagePasses(
  buf: Buffer,
): Promise<{ texts: string[]; header: string | null }> {
  const lp = langPath();
  if (!lp) throw new Error("OCR language data not installed");
  const { createWorker } = await import("tesseract.js");
  const [inputs, strip] = await Promise.all([variants(buf), headerStrip(buf).catch(() => null)]);
  const worker = await createWorker("eng", 1, { langPath: lp, cacheMethod: "none", gzip: true });
  const deadline = Date.now() + OCR_TIMEOUT_MS;
  try {
    const texts: string[] = [];
    for (const { img, psm } of inputs) {
      const left = deadline - Date.now();
      if (left <= 0) break;
      await worker.setParameters({
        preserve_interword_spaces: "1",
        tessedit_pageseg_mode: psm as never,
      });
      const result = await Promise.race([
        worker.recognize(img),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("OCR timed out")), left),
        ),
      ]);
      texts.push(result.data.text);
    }
    if (!texts.length) throw new Error("OCR timed out");
    let header: string | null = null;
    if (strip && deadline - Date.now() > 5_000) {
      await worker.setParameters({ tessedit_pageseg_mode: "6" as never });
      header = (await worker.recognize(strip)).data.text;
    }
    return { texts, header };
  } catch (err) {
    logger.error("ocr.failed", { err });
    throw err;
  } finally {
    await worker.terminate().catch(() => undefined);
  }
}

/** Single best text for a photo. */
export async function ocrImage(buf: Buffer): Promise<string> {
  return (await ocrImagePasses(buf)).texts[0];
}
