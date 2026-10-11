-- Optional consent to improve report reading from corrections.
ALTER TABLE "User" ADD COLUMN "improveReadingAt" TIMESTAMP(3);

-- Anonymous patterns learned from corrections (no user, value, date or report).
CREATE TABLE "ReadingPattern" (
    "id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReadingPattern_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReadingPattern_kind_key_target_key" ON "ReadingPattern"("kind", "key", "target");
