-- CreateTable
CREATE TABLE "cbhpm_procedures" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "procedimento" TEXT NOT NULL,
    "porte" TEXT,
    "valorPorteCents" INTEGER,
    "totalPorteCents" INTEGER,
    "editionYear" INTEGER,
    "sourceFile" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cbhpm_procedures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cbhpm_procedures_codigo_key" ON "cbhpm_procedures"("codigo");
