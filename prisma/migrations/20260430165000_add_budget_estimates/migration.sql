-- CreateEnum
CREATE TYPE "BudgetEstimateStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'CONVERTED', 'CANCELED', 'EXPIRED');

-- CreateTable
CREATE TABLE "budget_estimates" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "patientId" TEXT,
    "providerId" TEXT,
    "status" "BudgetEstimateStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT,
    "notes" TEXT,
    "subtotalCents" INTEGER NOT NULL DEFAULT 0,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "approvedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "convertedGuideId" TEXT,
    "createdById" TEXT,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_estimates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_estimate_items" (
    "id" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "pricingTableId" TEXT,
    "procedurePriceId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPriceCents" INTEGER NOT NULL DEFAULT 0,
    "operationalCostCents" INTEGER,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_estimate_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "budget_estimates_code_key" ON "budget_estimates"("code");

-- CreateIndex
CREATE UNIQUE INDEX "budget_estimates_convertedGuideId_key" ON "budget_estimates"("convertedGuideId");

-- CreateIndex
CREATE INDEX "budget_estimates_patientId_createdAt_idx" ON "budget_estimates"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "budget_estimates_providerId_status_idx" ON "budget_estimates"("providerId", "status");

-- CreateIndex
CREATE INDEX "budget_estimates_status_updatedAt_idx" ON "budget_estimates"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "budget_estimate_items_estimateId_idx" ON "budget_estimate_items"("estimateId");

-- CreateIndex
CREATE INDEX "budget_estimate_items_procedureId_idx" ON "budget_estimate_items"("procedureId");

-- CreateIndex
CREATE INDEX "budget_estimate_items_pricingTableId_idx" ON "budget_estimate_items"("pricingTableId");

-- CreateIndex
CREATE INDEX "budget_estimate_items_procedurePriceId_idx" ON "budget_estimate_items"("procedurePriceId");

-- AddForeignKey
ALTER TABLE "budget_estimates" ADD CONSTRAINT "budget_estimates_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_estimates" ADD CONSTRAINT "budget_estimates_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "health_insurance_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_estimates" ADD CONSTRAINT "budget_estimates_convertedGuideId_fkey" FOREIGN KEY ("convertedGuideId") REFERENCES "billing_guides"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_estimates" ADD CONSTRAINT "budget_estimates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_estimates" ADD CONSTRAINT "budget_estimates_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_estimate_items" ADD CONSTRAINT "budget_estimate_items_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "budget_estimates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_estimate_items" ADD CONSTRAINT "budget_estimate_items_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "procedures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_estimate_items" ADD CONSTRAINT "budget_estimate_items_pricingTableId_fkey" FOREIGN KEY ("pricingTableId") REFERENCES "pricing_tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_estimate_items" ADD CONSTRAINT "budget_estimate_items_procedurePriceId_fkey" FOREIGN KEY ("procedurePriceId") REFERENCES "procedure_prices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

