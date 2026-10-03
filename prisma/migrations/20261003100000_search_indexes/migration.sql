-- Trigram indexes so case-insensitive substring search (ILIKE '%term%') stays
-- fast as a user's history grows. pg_trgm is a trusted extension (PG13+).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "MedicalRecord_title_trgm" ON "MedicalRecord" USING GIN ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "MedicalRecord_notes_trgm" ON "MedicalRecord" USING GIN ("notes" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "MedicalDocument_name_trgm" ON "MedicalDocument" USING GIN ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "MedicalDocument_extractedText_trgm" ON "MedicalDocument" USING GIN ("extractedText" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "LabResult_testName_trgm" ON "LabResult" USING GIN ("testName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Provider_name_trgm" ON "Provider" USING GIN ("name" gin_trgm_ops);
