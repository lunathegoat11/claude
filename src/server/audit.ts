import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { hmac } from "./auth/tokens";
import { logger } from "./logger";

export type AuditAction =
  | "auth.sign_up"
  | "auth.sign_in"
  | "auth.sign_in_failed"
  | "auth.sign_out"
  | "auth.password_changed"
  | "auth.sessions_revoked"
  | "auth.password_reset_requested"
  | "auth.password_reset"
  | "auth.email_verified"
  | "consent.given"
  | "record.create"
  | "record.update"
  | "record.delete"
  | "document.upload"
  | "document.update"
  | "document.view"
  | "document.download"
  | "document.delete"
  | "lab.create"
  | "lab.update"
  | "lab.delete"
  | "lab.import_confirmed"
  | "lab.import_discarded"
  | "measurement.create"
  | "measurement.update"
  | "measurement.delete"
  | "measurement.import"
  | "metric.create"
  | "profile.update"
  | "health_summary.update"
  | "ai.query"
  | "ai.conversation_delete"
  | "data.export"
  | "account.delete";

export interface AuditContext {
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * Append an audit entry. Stores identifiers and actions only — never clinical
 * content. Failures are logged but never break the user's request.
 */
export async function audit(
  userId: string | null,
  action: AuditAction,
  entity?: { type: string; id?: string },
  ctx?: AuditContext,
  metadata?: Prisma.InputJsonValue,
) {
  try {
    const secret = process.env.APP_SECRET ?? "dev";
    await db.auditLog.create({
      data: {
        userId,
        action,
        entityType: entity?.type,
        entityId: entity?.id,
        ipHash: ctx?.ip ? hmac(ctx.ip, secret) : null,
        userAgent: ctx?.userAgent?.slice(0, 300) ?? null,
        metadata,
      },
    });
  } catch (err) {
    logger.error("audit.write_failed", { action, err });
  }
}
