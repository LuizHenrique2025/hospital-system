-- CreateTable
CREATE TABLE "health_insurance_providers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_insurance_providers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "health_insurance_providers_name_key" ON "health_insurance_providers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "health_insurance_providers_code_key" ON "health_insurance_providers"("code");
