import "server-only";
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { env } from "./env";

/**
 * Authenticated encryption for small secrets stored in the database (users' AI API keys).
 *
 * - AES-256-GCM with a random 96-bit IV per value.
 * - The key is derived from APP_SECRET with HKDF, so a database dump alone is useless.
 * - Every value is bound to a context string (e.g. the owning user id) as additional
 *   authenticated data: a ciphertext copied onto another user's row will not decrypt.
 *
 * Format: v1.<iv>.<tag>.<ciphertext>, each part base64url.
 */
const VERSION = "v1";

function key(): Buffer {
  return Buffer.from(hkdfSync("sha256", env().APP_SECRET, "kosha", "secret-box:v1", 32));
}

export function sealSecret(plain: string, context: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(context, "utf8"));
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [VERSION, iv, cipher.getAuthTag(), ct]
    .map((p) => (typeof p === "string" ? p : p.toString("base64url")))
    .join(".");
}

/** Returns null when the value was tampered with, belongs to another context, or APP_SECRET changed. */
export function openSecret(sealed: string, context: string): string | null {
  const parts = sealed.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) return null;
  try {
    const [iv, tag, ct] = parts.slice(1).map((p) => Buffer.from(p, "base64url"));
    if (iv.length !== 12 || tag.length !== 16) return null;
    const decipher = createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAAD(Buffer.from(context, "utf8"));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
