-- Which reference ranges each person prefers (null = automatic, from their time zone).
CREATE TYPE "RangeRegion" AS ENUM ('INDIA', 'INTERNATIONAL');
ALTER TABLE "Profile" ADD COLUMN "rangeRegion" "RangeRegion";
