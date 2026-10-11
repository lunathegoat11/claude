import "server-only";
import { db } from "@/server/db";
import { logger } from "@/server/logger";

const DAY = 86_400_000;
const EVERY = 6 * 60 * 60_000;
/** How long deleted items can still be recovered before they are removed for good. */
export const DELETED_KEEP_DAYS = 30;
let lastRun = 0;

/**
 * Keep only what's still needed. Runs at most every six hours, piggybacking on sign-ins.
 *
 * - Expired sign-in sessions: removed.
 * - Email links (verification / password reset): removed a day after they expire or are used.
 * - Values read from a document that were never confirmed or were discarded: removed after 30 days.
 * - Account activity log: kept for one year (security), then removed.
 * - Anything you deleted (records, reports, results, readings, documents): kept for 30
 *   days so a mistake can be put right, then removed for good. (Files are removed at once.)
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
