-- Add patient lifecycle and document fields before creating related indexes.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PatientStatus') THEN
    CREATE TYPE "PatientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED');
  END IF;
END $$;

ALTER TABLE "patients"
ADD COLUMN IF NOT EXISTS "status" "PatientStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN IF NOT EXISTS "blockReason" TEXT,
ADD COLUMN IF NOT EXISTS "documents" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
