-- CreateEnum
CREATE TYPE "BillingGuideStatus" AS ENUM ('OPEN', 'AUTHORIZATION_PENDING', 'AUTHORIZED', 'PARTIALLY_AUTHORIZED', 'DENIED', 'IN_EXECUTION', 'EXECUTED', 'ACCOUNT_REVIEW', 'SENT_TO_PROVIDER', 'PAID', 'PARTIALLY_PAID', 'GLOSA', 'PENDING_DOCUMENTATION', 'REJECTED', 'APPEAL_IN_PROGRESS', 'APPEAL_ACCEPTED', 'APPEAL_DENIED', 'LOSS_ACCEPTED', 'CLOSED', 'CANCELED');

-- CreateEnum
CREATE TYPE "BillingGuideMovementType" AS ENUM ('OPENED', 'STATUS_CHANGED', 'AUTHORIZATION_REQUESTED', 'AUTHORIZED', 'DENIED', 'EXECUTION_RECORDED', 'ACCOUNT_REVIEW', 'SENT_TO_PROVIDER', 'PROVIDER_RETURN', 'GLOSA_RECORDED', 'APPEAL_CREATED', 'APPEAL_RETURN', 'DOCUMENT_ATTACHED', 'CLOSED', 'CANCELED', 'COMMENT');

-- CreateEnum
CREATE TYPE "BillingGuideItemStatus" AS ENUM ('REQUESTED', 'AUTHORIZATION_PENDING', 'AUTHORIZED', 'PARTIALLY_AUTHORIZED', 'DENIED', 'EXECUTED', 'BILLED', 'GLOSA', 'APPEALED', 'PAID', 'CANCELED');

-- CreateTable
CREATE TABLE "billing_guides" (
    "id" TEXT NOT NULL,
    "guideNumber" TEXT NOT NULL,
    "authorizationCode" TEXT,
    "patientId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "providerId" TEXT,
    "currentStatus" "BillingGuideStatus" NOT NULL DEFAULT 'OPEN',
    "originSector" TEXT,
    "careType" TEXT,
    "requestedAmountCents" INTEGER NOT NULL DEFAULT 0,
    "authorizedAmountCents" INTEGER NOT NULL DEFAULT 0,
    "paidAmountCents" INTEGER NOT NULL DEFAULT 0,
    "deniedAmountCents" INTEGER NOT NULL DEFAULT 0,
    "appealedAmountCents" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_guides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_guide_items" (
    "id" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "pricingTableId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" "BillingGuideItemStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestedAmountCents" INTEGER NOT NULL DEFAULT 0,
    "authorizedAmountCents" INTEGER,
    "deniedAmountCents" INTEGER,
    "paidAmountCents" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_guide_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_guide_movements" (
    "id" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "movementType" "BillingGuideMovementType" NOT NULL DEFAULT 'STATUS_CHANGED',
    "fromStatus" "BillingGuideStatus",
    "toStatus" "BillingGuideStatus" NOT NULL,
    "sector" TEXT,
    "responsibleUserId" TEXT,
    "reason" TEXT,
    "notes" TEXT,
    "amountCents" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_guide_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "billing_guides_guideNumber_key" ON "billing_guides"("guideNumber");

-- CreateIndex
CREATE INDEX "billing_guides_patientId_createdAt_idx" ON "billing_guides"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "billing_guides_appointmentId_idx" ON "billing_guides"("appointmentId");

-- CreateIndex
CREATE INDEX "billing_guides_providerId_currentStatus_idx" ON "billing_guides"("providerId", "currentStatus");

-- CreateIndex
CREATE INDEX "billing_guides_currentStatus_updatedAt_idx" ON "billing_guides"("currentStatus", "updatedAt");

-- CreateIndex
CREATE INDEX "billing_guide_items_guideId_idx" ON "billing_guide_items"("guideId");

-- CreateIndex
CREATE INDEX "billing_guide_items_procedureId_idx" ON "billing_guide_items"("procedureId");

-- CreateIndex
CREATE INDEX "billing_guide_items_pricingTableId_idx" ON "billing_guide_items"("pricingTableId");

-- CreateIndex
CREATE INDEX "billing_guide_items_status_idx" ON "billing_guide_items"("status");

-- CreateIndex
CREATE INDEX "billing_guide_movements_guideId_createdAt_idx" ON "billing_guide_movements"("guideId", "createdAt");

-- CreateIndex
CREATE INDEX "billing_guide_movements_responsibleUserId_createdAt_idx" ON "billing_guide_movements"("responsibleUserId", "createdAt");

-- CreateIndex
CREATE INDEX "billing_guide_movements_toStatus_createdAt_idx" ON "billing_guide_movements"("toStatus", "createdAt");

-- CreateIndex
CREATE INDEX "billing_guide_movements_sector_createdAt_idx" ON "billing_guide_movements"("sector", "createdAt");

-- AddForeignKey
ALTER TABLE "billing_guides" ADD CONSTRAINT "billing_guides_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_guides" ADD CONSTRAINT "billing_guides_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_guides" ADD CONSTRAINT "billing_guides_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "health_insurance_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_guides" ADD CONSTRAINT "billing_guides_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_guides" ADD CONSTRAINT "billing_guides_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_guide_items" ADD CONSTRAINT "billing_guide_items_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "billing_guides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_guide_items" ADD CONSTRAINT "billing_guide_items_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "procedures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_guide_items" ADD CONSTRAINT "billing_guide_items_pricingTableId_fkey" FOREIGN KEY ("pricingTableId") REFERENCES "pricing_tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_guide_movements" ADD CONSTRAINT "billing_guide_movements_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "billing_guides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_guide_movements" ADD CONSTRAINT "billing_guide_movements_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

