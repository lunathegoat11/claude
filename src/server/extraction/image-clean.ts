import "server-only";
import { SHARP_INPUT } from "@/server/extraction/sharp-options";
import { logger } from "@/server/logger";
import { AppError } from "@/server/errors";

/** Longest side kept for stored photos: plenty to read small print, far smaller than a raw phone photo. */
const MAX_SIDE = 3000;

/**
 * Before a photo is stored: turn it upright, scale very large photos down, and drop all
 * hidden metadata (GPS location, camera and phone details, time stamps). Smaller files
 * also load faster on slow phones and connections. PDFs and HEIC are left untouched.
 */
export async function cleanImage(buf: Buffer, mimeType: string): Promise<Buffer> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) return buf;
  try {
    const sharp = (await import("sharp")).default;
    const img = sharp(buf, SHARP_INPUT)
      .rotate()
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true });
    // sharp writes no metadata unless asked to, so the output carries no EXIF/XMP/GPS.
    if (mimeType === "image/jpeg") return await img.jpeg({ quality: 88, mozjpeg: true }).toBuffer();
    if (mimeType === "image/png") return await img.png({ compressionLevel: 9 }).toBuffer();
    return await img.webp({ quality: 88 }).toBuffer();
  } catch (err) {
    // Never store a photo we couldn't strip: it may still carry GPS location.
    logger.warn("upload.image_clean_failed", { mimeType, err });
    throw new AppError(
      "VALIDATION",
      "This photo couldn't be opened. It may be damaged or far too large. Please take it again.",
    );
  }
}
