-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('FEMALE', 'MALE', 'INTERSEX', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "BloodGroup" AS ENUM ('A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "GlucoseUnit" AS ENUM ('MG_DL', 'MMOL_L');

-- CreateEnum
CREATE TYPE "WeightUnit" AS ENUM ('KG', 'LB');

-- CreateEnum
CREATE TYPE "TemperatureUnit" AS ENUM ('C', 'F');

-- CreateEnum
CREATE TYPE "ProviderType" AS ENUM ('DOCTOR', 'HOSPITAL', 'CLINIC', 'LABORATORY', 'PHARMACY', 'DIAGNOSTIC_CENTRE', 'OTHER');

-- CreateEnum
CREATE TYPE "RecordType" AS ENUM ('DOCTOR_VISIT', 'DIAGNOSIS', 'PROCEDURE', 'HOSPITALIZATION', 'PRESCRIPTION', 'VACCINATION', 'ALLERGY', 'CONDITION', 'FAMILY_HISTORY', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('LAB_REPORT', 'PRESCRIPTION', 'DOCTOR_NOTE', 'DISCHARGE_SUMMARY', 'IMAGING_REPORT', 'VACCINATION_RECORD', 'INSURANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "ExtractionStatus" AS ENUM ('NOT_APPLICABLE', 'PENDING', 'COMPLETED', 'FAILED', 'UNSUPPORTED');

-- CreateEnum
CREATE TYPE "DataSource" AS ENUM ('MANUAL', 'PDF_IMPORT', 'IMAGE_IMPORT', 'CSV_IMPORT', 'DEVICE', 'DEMO');

-- CreateEnum
CREATE TYPE "LabFlag" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'ABNORMAL', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "MetricValueType" AS ENUM ('SINGLE', 'DUAL');

-- CreateEnum
CREATE TYPE "AllergySeverity" AS ENUM ('MILD', 'MODERATE', 'SEVERE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ConditionStatus" AS ENUM ('ACTIVE', 'MANAGED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "TimelineSource" AS ENUM ('MEDICAL_RECORD', 'DOCUMENT', 'LAB_PANEL', 'MEASUREMENT', 'NOTE');

-- CreateEnum
CREATE TYPE "TimelineCategory" AS ENUM ('VISIT', 'DIAGNOSIS', 'PROCEDURE', 'HOSPITALIZATION', 'PRESCRIPTION', 'VACCINATION', 'LAB', 'MEASUREMENT', 'DOCUMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "AIRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('AWAITING_REVIEW', 'CONFIRMED', 'DISCARDED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "emailVerified" TIMESTAMP(3),
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "dateOfBirth" DATE,
    "sex" "Sex",
    "phone" TEXT,
    "city" TEXT,
    "state" TEXT,
    "bloodGroup" "BloodGroup",
    "heightCm" DECIMAL(5,1),
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "emergencyContactRelation" TEXT,
    "glucoseUnit" "GlucoseUnit" NOT NULL DEFAULT 'MG_DL',
    "weightUnit" "WeightUnit" NOT NULL DEFAULT 'KG',
    "temperatureUnit" "TemperatureUnit" NOT NULL DEFAULT 'F',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Provider" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ProviderType" NOT NULL DEFAULT 'OTHER',
    "specialty" TEXT,
    "city" TEXT,
    "state" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalRecord" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "RecordType" NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "providerId" UUID,
    "doctorName" TEXT,
    "facilityName" TEXT,
    "specialty" TEXT,
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MedicalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalDocument" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "documentDate" TIMESTAMP(3),
    "providerId" UUID,
    "providerName" TEXT,
    "recordId" UUID,
    "storageKey" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "extractedText" TEXT,
    "extractionStatus" "ExtractionStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MedicalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabPanel" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "collectedAt" TIMESTAMP(3) NOT NULL,
    "reportedAt" TIMESTAMP(3),
    "labName" TEXT,
    "providerId" UUID,
    "documentId" UUID,
    "source" "DataSource" NOT NULL DEFAULT 'MANUAL',
    "notes" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "LabPanel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabResult" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "panelId" UUID,
    "biomarkerCode" TEXT,
    "testName" TEXT NOT NULL,
    "valueNumeric" DECIMAL(14,4),
    "valueText" TEXT,
    "unit" TEXT,
    "refLow" DECIMAL(14,4),
    "refHigh" DECIMAL(14,4),
    "refText" TEXT,
    "flag" "LabFlag" NOT NULL DEFAULT 'UNKNOWN',
    "observedAt" TIMESTAMP(3) NOT NULL,
    "labName" TEXT,
    "source" "DataSource" NOT NULL DEFAULT 'MANUAL',
    "notes" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "LabResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthMetric" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "unit" TEXT NOT NULL,
    "valueType" "MetricValueType" NOT NULL DEFAULT 'SINGLE',
    "primaryLabel" TEXT,
    "secondaryLabel" TEXT,
    "decimals" INTEGER NOT NULL DEFAULT 0,
    "minValue" DECIMAL(12,3),
    "maxValue" DECIMAL(12,3),
    "contexts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category" TEXT NOT NULL DEFAULT 'vitals',
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthMeasurement" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "metricId" UUID NOT NULL,
    "value" DECIMAL(12,3) NOT NULL,
    "value2" DECIMAL(12,3),
    "unit" TEXT NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL,
    "context" TEXT,
    "contextNote" TEXT,
    "notes" TEXT,
    "source" "DataSource" NOT NULL DEFAULT 'MANUAL',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "HealthMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medication" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "dosage" TEXT,
    "frequency" TEXT,
    "startDate" DATE,
    "endDate" DATE,
    "prescribedBy" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Allergy" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "allergen" TEXT NOT NULL,
    "reaction" TEXT,
    "severity" "AllergySeverity" NOT NULL DEFAULT 'UNKNOWN',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Allergy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Condition" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ConditionStatus" NOT NULL DEFAULT 'ACTIVE',
    "diagnosedOn" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Condition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimelineEvent" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "sourceType" "TimelineSource" NOT NULL,
    "sourceId" UUID NOT NULL,
    "category" "TimelineCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "importance" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIConversation" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIMessage" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "role" "AIRole" NOT NULL,
    "content" TEXT NOT NULL,
    "citations" JSONB,
    "safety" JSONB,
    "provider" TEXT,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "documentId" UUID,
    "kind" TEXT NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'AWAITING_REVIEW',
    "extractor" TEXT NOT NULL,
    "candidates" JSONB NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE INDEX "Provider_userId_name_idx" ON "Provider"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Provider_userId_name_type_key" ON "Provider"("userId", "name", "type");

-- CreateIndex
CREATE INDEX "MedicalRecord_userId_deletedAt_date_idx" ON "MedicalRecord"("userId", "deletedAt", "date" DESC);

-- CreateIndex
CREATE INDEX "MedicalRecord_userId_type_idx" ON "MedicalRecord"("userId", "type");

-- CreateIndex
CREATE INDEX "MedicalRecord_tags_idx" ON "MedicalRecord" USING GIN ("tags");

-- CreateIndex
CREATE UNIQUE INDEX "MedicalDocument_storageKey_key" ON "MedicalDocument"("storageKey");

-- CreateIndex
CREATE INDEX "MedicalDocument_userId_deletedAt_createdAt_idx" ON "MedicalDocument"("userId", "deletedAt", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "MedicalDocument_userId_type_idx" ON "MedicalDocument"("userId", "type");

-- CreateIndex
CREATE INDEX "MedicalDocument_tags_idx" ON "MedicalDocument" USING GIN ("tags");

-- CreateIndex
CREATE INDEX "LabPanel_userId_deletedAt_collectedAt_idx" ON "LabPanel"("userId", "deletedAt", "collectedAt" DESC);

-- CreateIndex
CREATE INDEX "LabResult_userId_deletedAt_observedAt_idx" ON "LabResult"("userId", "deletedAt", "observedAt" DESC);

-- CreateIndex
CREATE INDEX "LabResult_userId_biomarkerCode_observedAt_idx" ON "LabResult"("userId", "biomarkerCode", "observedAt");

-- CreateIndex
CREATE INDEX "LabResult_userId_testName_idx" ON "LabResult"("userId", "testName");

-- CreateIndex
CREATE INDEX "LabResult_panelId_idx" ON "LabResult"("panelId");

-- CreateIndex
CREATE INDEX "HealthMetric_key_idx" ON "HealthMetric"("key");

-- CreateIndex
CREATE UNIQUE INDEX "HealthMetric_userId_key_key" ON "HealthMetric"("userId", "key");

-- CreateIndex
CREATE INDEX "HealthMeasurement_userId_metricId_deletedAt_measuredAt_idx" ON "HealthMeasurement"("userId", "metricId", "deletedAt", "measuredAt" DESC);

-- CreateIndex
CREATE INDEX "HealthMeasurement_userId_deletedAt_measuredAt_idx" ON "HealthMeasurement"("userId", "deletedAt", "measuredAt" DESC);

-- CreateIndex
CREATE INDEX "Medication_userId_active_idx" ON "Medication"("userId", "active");

-- CreateIndex
CREATE INDEX "Allergy_userId_idx" ON "Allergy"("userId");

-- CreateIndex
CREATE INDEX "Condition_userId_idx" ON "Condition"("userId");

-- CreateIndex
CREATE INDEX "TimelineEvent_userId_occurredAt_idx" ON "TimelineEvent"("userId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "TimelineEvent_userId_category_idx" ON "TimelineEvent"("userId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "TimelineEvent_sourceType_sourceId_key" ON "TimelineEvent"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "AIConversation_userId_updatedAt_idx" ON "AIConversation"("userId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "AIMessage_conversationId_createdAt_idx" ON "AIMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "ImportJob_userId_status_idx" ON "ImportJob"("userId", "status");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Provider" ADD CONSTRAINT "Provider_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalRecord" ADD CONSTRAINT "MedicalRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalRecord" ADD CONSTRAINT "MedicalRecord_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalDocument" ADD CONSTRAINT "MedicalDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalDocument" ADD CONSTRAINT "MedicalDocument_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalDocument" ADD CONSTRAINT "MedicalDocument_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "MedicalRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabPanel" ADD CONSTRAINT "LabPanel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabPanel" ADD CONSTRAINT "LabPanel_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabPanel" ADD CONSTRAINT "LabPanel_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "MedicalDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "LabPanel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthMetric" ADD CONSTRAINT "HealthMetric_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthMeasurement" ADD CONSTRAINT "HealthMeasurement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthMeasurement" ADD CONSTRAINT "HealthMeasurement_metricId_fkey" FOREIGN KEY ("metricId") REFERENCES "HealthMetric"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medication" ADD CONSTRAINT "Medication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allergy" ADD CONSTRAINT "Allergy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Condition" ADD CONSTRAINT "Condition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIConversation" ADD CONSTRAINT "AIConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIMessage" ADD CONSTRAINT "AIMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AIConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "MedicalDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
