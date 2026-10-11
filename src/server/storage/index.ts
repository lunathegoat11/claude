import "server-only";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { env } from "@/server/env";
import { LocalStorage } from "./local";
import { S3Storage } from "./s3";
import type { StorageDriver } from "./types";

let driver: StorageDriver | undefined;

/**
 * Why uploads can't be kept safely on this server, or null if they can. On Railway the
 * disk is wiped on every restart, so files stored there without a Volume would vanish.
 */
export function storageProblem(): string | null {
  const e = env();
  if (e.STORAGE_DRIVER !== "local" || process.env.NODE_ENV !== "production") return null;
  const onRailway = !!(process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_ENVIRONMENT);
  if (!onRailway) return null;
  const volume = process.env.RAILWAY_VOLUME_MOUNT_PATH;
  const dir = path.resolve(e.STORAGE_LOCAL_DIR);
  if (!volume || !(dir + path.sep).startsWith(path.resolve(volume) + path.sep))
    return "File storage isn't set up on this server yet, so uploads are switched off to keep files from being lost. Attach a Volume and set STORAGE_LOCAL_DIR to its folder.";
  return null;
}

export function storage(): StorageDriver {
  if (driver) return driver;
  const e = env();
  if (e.STORAGE_DRIVER === "s3") {
    if (!e.S3_BUCKET) throw new Error("S3_BUCKET is required when STORAGE_DRIVER=s3");
    driver = new S3Storage({
      bucket: e.S3_BUCKET,
      region: e.S3_REGION || "ap-south-1",
      endpoint: e.S3_ENDPOINT,
      accessKeyId: e.S3_ACCESS_KEY_ID,
      secretAccessKey: e.S3_SECRET_ACCESS_KEY,
      forcePathStyle: e.S3_FORCE_PATH_STYLE,
    });
  } else {
    driver = new LocalStorage(e.STORAGE_LOCAL_DIR);
  }
  return driver;
}

export function setStorageDriver(d: StorageDriver) {
  driver = d;
}

/** Keys are random and contain no personal information or original filenames. */
export function newStorageKey(userId: string, ext: string) {
  const safeExt = ext.replace(/[^a-z0-9]/gi, "").slice(0, 5).toLowerCase();
  return `u/${userId}/${randomUUID()}${safeExt ? `.${safeExt}` : ""}`;
}

export const ALLOWED_MIME: Record<string, { ext: string; kind: "pdf" | "image" }> = {
  "application/pdf": { ext: "pdf", kind: "pdf" },
  "image/jpeg": { ext: "jpg", kind: "image" },
  "image/png": { ext: "png", kind: "image" },
  "image/webp": { ext: "webp", kind: "image" },
  "image/heic": { ext: "heic", kind: "image" },
};

/** Verify file magic bytes so a renamed executable cannot pose as a PDF. */
export function sniffMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf.subarray(0, 5).toString("latin1") === "%PDF-") return "application/pdf";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  if (buf.subarray(4, 8).toString("latin1") === "ftyp") {
    const brand = buf.subarray(8, 12).toString("latin1");
    if (["heic", "heix", "mif1", "msf1", "hevc"].includes(brand)) return "image/heic";
  }
  return null;
}
