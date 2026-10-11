-- Collect as little as possible: keep a coarse device label instead of the full
-- user-agent, and stop recording (even pseudonymised) IP addresses.
ALTER TABLE "Session" RENAME COLUMN "userAgent" TO "device";
UPDATE "Session" SET "device" = NULL;

ALTER TABLE "AuditLog" DROP COLUMN "ipHash";
ALTER TABLE "AuditLog" DROP COLUMN "userAgent";
