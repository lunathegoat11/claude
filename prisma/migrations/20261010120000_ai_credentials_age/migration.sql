-- Age confirmation (DPDP Act 2023)
ALTER TABLE "User" ADD COLUMN "ageConfirmedAt" TIMESTAMP(3);

-- Users' own AI provider keys (encrypted at rest)
CREATE TABLE "AiCredential" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "keyHint" TEXT NOT NULL,
    "readDocuments" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiCredential_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiCredential_userId_key" ON "AiCredential"("userId");

ALTER TABLE "AiCredential" ADD CONSTRAINT "AiCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
