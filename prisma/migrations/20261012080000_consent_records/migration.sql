-- Keep the first age confirmation; record later ones separately.
ALTER TABLE "User" ADD COLUMN "lastAgeConfirmedAt" TIMESTAMP(3);

-- Separate, optional consent to use the server's AI service.
ALTER TABLE "User" ADD COLUMN "aiConsentAt" TIMESTAMP(3);

-- Sending uploaded reports to an AI service is now opt-in.
ALTER TABLE "AiCredential" ALTER COLUMN "readDocuments" SET DEFAULT false;
