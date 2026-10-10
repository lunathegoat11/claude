import "server-only";

export interface ImageQuality {
  /** Variance of the Laplacian on a normalised 1000px-wide greyscale copy. Low = blurry. */
  sharpness: number;
  /** Mean brightness 0–255. */
  brightness: number;
  width: number;
  height: number;
  problem: "BLURRY" | "TOO_DARK" | "TOO_SMALL" | null;
}

/** Below this, small printed digits can't be read reliably (calibrated on report photos). */
export const MIN_SHARPNESS = 220;
const MIN_BRIGHTNESS = 45;
const MIN_SIDE = 500;

/**
 * Quick check of a photo before trying to read it: is it big enough, bright enough and
 * in focus? Uses the variance of the Laplacian, a standard focus measure: sharp text has
 * strong edges, a blurry photo has almost none.
 */
export async function assessImage(buf: Buffer): Promise<ImageQuality> {
  const sharp = (await import("sharp")).default;
  const base = sharp(buf, { failOn: "none" }).rotate();
  const meta = await base.metadata();
  const width = meta.autoOrient?.width ?? meta.width ?? 0;
  const height = meta.autoOrient?.height ?? meta.height ?? 0;

  const grey = base.clone().grayscale().resize({ width: 1000, withoutEnlargement: false });
  const stats = await grey.clone().stats();
  const brightness = stats.channels[0]?.mean ?? 0;
  const { data } = await grey
    .clone()
    .normalize()
    .convolve({ width: 3, height: 3, kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0], scale: 1, offset: 128 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < data.length; i++) {
    const v = data[i] - 128;
    sum += v;
    sumSq += v * v;
  }
  const n = data.length || 1;
  const sharpness = sumSq / n - (sum / n) ** 2;

  let problem: ImageQuality["problem"] = null;
  if (Math.min(width, height) < MIN_SIDE) problem = "TOO_SMALL";
  else if (brightness < MIN_BRIGHTNESS) problem = "TOO_DARK";
  else if (sharpness < MIN_SHARPNESS) problem = "BLURRY";
  return {
    sharpness: Math.round(sharpness),
    brightness: Math.round(brightness),
    width,
    height,
    problem,
  };
}

export const QUALITY_MESSAGES: Record<NonNullable<ImageQuality["problem"]>, string> = {
  BLURRY:
    "This photo is too blurry to read the numbers. Take another photo: hold the phone steady, tap the report on screen to focus, and make sure the text looks sharp.",
  TOO_DARK:
    "This photo is too dark to read. Take another photo in better light, without shadows over the report.",
  TOO_SMALL:
    "This photo is too small to read. Take the photo closer to the report so the text fills the screen.",
};
