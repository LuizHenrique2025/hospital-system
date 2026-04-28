-- DropIndex
DROP INDEX IF EXISTS "cbhpm_procedures_codigo_key";

-- AlterTable
ALTER TABLE "cbhpm_procedures" ALTER COLUMN "editionYear" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "cbhpm_procedures_codigo_editionYear_key" ON "cbhpm_procedures"("codigo", "editionYear");

-- CreateIndex
CREATE INDEX "cbhpm_procedures_editionYear_idx" ON "cbhpm_procedures"("editionYear");

-- CreateIndex
CREATE INDEX "cbhpm_procedures_sourceFile_idx" ON "cbhpm_procedures"("sourceFile");
