-- CreateEnum
CREATE TYPE "ProcedureType" AS ENUM ('PROCEDURE', 'LAB_EXAM', 'IMAGE_EXAM');

-- CreateTable
CREATE TABLE "procedures" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "ProcedureType" NOT NULL DEFAULT 'PROCEDURE',
    "tableCode" TEXT,
    "groupName" TEXT,
    "unit" TEXT,
    "referencePriceCents" INTEGER,
    "requiresAuthorization" BOOLEAN NOT NULL DEFAULT false,
    "requiresReport" BOOLEAN NOT NULL DEFAULT false,
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procedures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "procedures_code_key" ON "procedures"("code");

-- CreateIndex
CREATE INDEX "procedures_description_idx" ON "procedures"("description");
