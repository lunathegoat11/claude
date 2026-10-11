import "server-only";
import { db } from "@/server/db";
import { logger } from "@/server/logger";

const DAY = 86_400_000;
const EVERY = 6 * 60 * 60_000;
/**
 * Deleting now removes things for good at once. This only clears anything left marked as
 * deleted by older versions of Kosha.
 */
export const DELETED_KEEP_DAYS = 0;
let lastRun = 0;

/**
 * Keep only what's still needed. Runs at most every six hours, piggybacking on sign-ins.
 *
 * - Expired sign-in sessions: removed.
 * - Email links (verification / password reset): removed a day after they expire or are used.
 * - Values read from a document that were never confirmed or were discarded: removed after 30 days.
 * - Account activity log: kept for one year (security), then removed.
 * - Anything still marked as deleted by an older version of Kosha: removed for good.
 */
export async function purgeExpiredData(now = Date.now(), force = false) {
  if (!force && now - lastRun < EVERY) return;
  lastRun = now;
  try {
    const dayAgo = new Date(now - DAY);
    await Promise.all([
      db.session.deleteMany({ where: { expiresAt: { lt: new Date(now) } } }),
      db.authToken.deleteMany({
        where: { OR: [{ expiresAt: { lt: dayAgo } }, { usedAt: { lt: dayAgo } }] },
      }),
      db.importJob.deleteMany({
        where: {
          OR: [
            { status: { not: "AWAITING_REVIEW" }, updatedAt: { lt: new Date(now - 30 * DAY) } },
            { status: "AWAITING_REVIEW", createdAt: { lt: new Date(now - 90 * DAY) } },
          ],
        },
      }),
      db.auditLog.deleteMany({ where: { createdAt: { lt: new Date(now - 365 * DAY) } } }),
    ]);
    const deletedBefore = { deletedAt: { lt: new Date(now - DELETED_KEEP_DAYS * DAY) } };
    // One at a time, children first, so links between rows never block a purge.
    await db.labResult.deleteMany({ where: deletedBefore });
    await db.labResult.deleteMany({ where: { panel: deletedBefore } });
    await db.labPanel.deleteMany({ where: deletedBefore });
    await db.healthMeasurement.deleteMany({ where: deletedBefore });
    await db.medicalRecord.deleteMany({ where: deletedBefore });
    await db.medicalDocument.deleteMany({ where: deletedBefore });
  } catch (err) {
    logger.error("retention.purge_failed", { err });
  }
}
