-- Standard (government-source) reference ranges, applied to each lab result.
ALTER TABLE "LabResult" ADD COLUMN "stdLow" DECIMAL(14,4),
ADD COLUMN "stdHigh" DECIMAL(14,4),
ADD COLUMN "stdText" TEXT,
ADD COLUMN "stdSource" TEXT,
ADD COLUMN "rangeVersion" INTEGER NOT NULL DEFAULT 0;
