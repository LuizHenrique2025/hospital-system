-- CreateEnum
CREATE TYPE "PricingTableType" AS ENUM ('CBHPM', 'AGREEMENT', 'OWN', 'OPERATIONAL_FEE');

-- AlterEnum
ALTER TYPE "ProcedureType" ADD VALUE IF NOT EXISTS 'CONSULTATION';
ALTER TYPE "ProcedureType" ADD VALUE IF NOT EXISTS 'SURGERY';
ALTER TYPE "ProcedureType" ADD VALUE IF NOT EXISTS 'ROOM_FEE';
ALTER TYPE "ProcedureType" ADD VALUE IF NOT EXISTS 'PACKAGE';

-- CreateTable
CREATE TABLE "pricing_tables" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PricingTableType" NOT NULL DEFAULT 'OWN',
    "year" INTEGER,
    "code" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedure_prices" (
    "id" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "pricingTableId" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "operationalCostCents" INTEGER,
    "billingUnit" TEXT,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procedure_prices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pricing_tables_name_year_key" ON "pricing_tables"("name", "year");

-- CreateIndex
CREATE UNIQUE INDEX "procedure_prices_procedureId_pricingTableId_key" ON "procedure_prices"("procedureId", "pricingTableId");

-- AddForeignKey
ALTER TABLE "procedure_prices" ADD CONSTRAINT "procedure_prices_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "procedures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_prices" ADD CONSTRAINT "procedure_prices_pricingTableId_fkey" FOREIGN KEY ("pricingTableId") REFERENCES "pricing_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;
