-- CreateTable
CREATE TABLE "agreement_pricing_rules" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "pricingTableId" TEXT NOT NULL,
    "multiplierBasisPoints" INTEGER NOT NULL DEFAULT 10000,
    "requiresAuthorization" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agreement_pricing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agreement_pricing_rules_providerId_pricingTableId_key" ON "agreement_pricing_rules"("providerId", "pricingTableId");

-- CreateIndex
CREATE INDEX "agreement_pricing_rules_providerId_active_idx" ON "agreement_pricing_rules"("providerId", "active");

-- CreateIndex
CREATE INDEX "agreement_pricing_rules_pricingTableId_idx" ON "agreement_pricing_rules"("pricingTableId");

-- AddForeignKey
ALTER TABLE "agreement_pricing_rules" ADD CONSTRAINT "agreement_pricing_rules_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "health_insurance_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agreement_pricing_rules" ADD CONSTRAINT "agreement_pricing_rules_pricingTableId_fkey" FOREIGN KEY ("pricingTableId") REFERENCES "pricing_tables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
