-- CreateEnum
CREATE TYPE "PlanKind" AS ENUM ('MONTHLY', 'LIFETIME');

-- CreateTable
CREATE TABLE "Subscription" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "kind" "PlanKind" NOT NULL,
    "status" TEXT NOT NULL,
    "paddleCustomerId" TEXT,
    "paddleSubscriptionId" TEXT,
    "paddleTransactionId" TEXT,
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadUsage" (
    "userId" UUID NOT NULL,
    "month" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UploadUsage_pkey" PRIMARY KEY ("userId","month")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_paddleSubscriptionId_key" ON "Subscription"("paddleSubscriptionId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadUsage" ADD CONSTRAINT "UploadUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

