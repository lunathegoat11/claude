import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
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
  | "consent.ai_given"
  | "consent.ai_withdrawn"
  | "consent.renewed"
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
  | "ai.key_saved"
  | "ai.key_removed"
  | "ai.document_reading"
  | "data.export"
  | "account.delete";

export interface AuditContext {
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * Append an audit entry: who did what, and when. Never clinical content, and — to
 * collect as little as possible — no IP address and no browser details either.
 * (The context argument is accepted for call-site compatibility but not stored.)
 * Failures are logged but never break the user's request.
 */
export async function audit(
  userId: string | null,
  action: AuditAction,
  entity?: { type: string; id?: string },
  _ctx?: AuditContext,
  metadata?: Prisma.InputJsonValue,
) {
  try {
    await db.auditLog.create({
      data: {
        userId,
        action,
        entityType: entity?.type,
        entityId: entity?.id,
        metadata,
      },
    });
  } catch (err) {
    logger.error("audit.write_failed", { action, err });
  }
}
