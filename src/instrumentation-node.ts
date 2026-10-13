import { reapplyRanges } from "@/server/services/labs";
import { logger } from "@/server/logger";

// Re-check lab results saved before the current standard reference ranges, in the
// background so start-up isn't delayed. Skipped while building.
if (process.env.NEXT_PHASE !== "phase-production-build") {
  reapplyRanges()
    .then((n) => n && logger.info("labs.ranges_reapplied", { count: n }))
    .catch((e) => logger.error("labs.ranges_reapply_failed", { error: String(e) }));
}
