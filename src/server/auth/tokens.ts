import { createHash, createHmac, randomBytes } from "node:crypto";

export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Keyed hash for pseudonymising IP addresses in audit logs. */
export function hmac(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex").slice(0, 32);
}
