-- AlterTable
ALTER TABLE "cbhpm_procedures"
ADD COLUMN "incidencias" TEXT,
ADD COLUMN "filme" DECIMAL(10,4),
ADD COLUMN "totalFilmeCents" INTEGER,
ADD COLUMN "uco" DECIMAL(10,4),
ADD COLUMN "totalUcoCents" INTEGER,
ADD COLUMN "porteAnestesico" TEXT,
ADD COLUMN "valorPorteAnestesicoCents" INTEGER,
ADD COLUMN "totalPorteAnestesicoCents" INTEGER,
ADD COLUMN "numeroAuxiliares" INTEGER,
ADD COLUMN "totalAuxiliaresCents" INTEGER,
ADD COLUMN "totalPrimeiroAuxiliarCents" INTEGER,
ADD COLUMN "totalSegundoAuxiliarCents" INTEGER,
ADD COLUMN "totalTerceiroAuxiliarCents" INTEGER,
ADD COLUMN "totalQuartoAuxiliarCents" INTEGER,
ADD COLUMN "adicionaisCents" INTEGER,
ADD COLUMN "subtotalCents" INTEGER;
