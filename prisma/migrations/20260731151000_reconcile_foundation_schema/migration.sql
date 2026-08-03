-- Reconcile foundational tables and staff fields that predate migration tracking.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CommunicationType') THEN
    CREATE TYPE "CommunicationType" AS ENUM ('UPDATE', 'NOTICE', 'HOLIDAY');
  END IF;
END $$;

ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'FARMACIA';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ESTOQUE';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'FATURAMENTO';

CREATE TABLE IF NOT EXISTS "sectors" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sectors_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "sectors_name_key" ON "sectors"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "sectors_code_key" ON "sectors"("code");

ALTER TABLE "doctors"
ADD COLUMN IF NOT EXISTS "address" TEXT,
ADD COLUMN IF NOT EXISTS "city" TEXT,
ADD COLUMN IF NOT EXISTS "documents" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "sectorId" TEXT,
ADD COLUMN IF NOT EXISTS "state" TEXT,
ADD COLUMN IF NOT EXISTS "zipCode" TEXT;

UPDATE "doctors" SET "documents" = ARRAY[]::TEXT[] WHERE "documents" IS NULL;
ALTER TABLE "doctors" ALTER COLUMN "documents" SET NOT NULL;

ALTER TABLE "nurses"
ADD COLUMN IF NOT EXISTS "address" TEXT,
ADD COLUMN IF NOT EXISTS "city" TEXT,
ADD COLUMN IF NOT EXISTS "documents" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "sectorId" TEXT,
ADD COLUMN IF NOT EXISTS "state" TEXT,
ADD COLUMN IF NOT EXISTS "zipCode" TEXT;

UPDATE "nurses" SET "documents" = ARRAY[]::TEXT[] WHERE "documents" IS NULL;
ALTER TABLE "nurses" ALTER COLUMN "documents" SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'nurses'
      AND column_name = 'sector'
  ) THEN
    INSERT INTO "sectors" ("id", "name", "code", "updatedAt")
    SELECT
      concat('legacy-sector-', md5(lower(trim("sector")))),
      trim("sector"),
      concat('LEGACY-', substring(md5(lower(trim("sector"))), 1, 12)),
      CURRENT_TIMESTAMP
    FROM "nurses"
    WHERE "sector" IS NOT NULL AND trim("sector") <> ''
    GROUP BY trim("sector")
    ON CONFLICT ("name") DO NOTHING;

    UPDATE "nurses" AS nurses
    SET "sectorId" = sectors."id"
    FROM "sectors" AS sectors
    WHERE nurses."sector" IS NOT NULL
      AND lower(trim(nurses."sector")) = lower(sectors."name")
      AND nurses."sectorId" IS NULL;

    ALTER TABLE "nurses" DROP COLUMN "sector";
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "communication_entries" (
  "id" TEXT NOT NULL,
  "type" "CommunicationType" NOT NULL,
  "tag" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "dateLabel" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "publishAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "communication_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "internal_emails" (
  "id" TEXT NOT NULL,
  "sender" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "preview" TEXT NOT NULL,
  "body" TEXT,
  "timeLabel" TEXT,
  "unread" BOOLEAN NOT NULL DEFAULT true,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "internal_emails_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "communication_entries_type_title_key"
ON "communication_entries"("type", "title");

CREATE UNIQUE INDEX IF NOT EXISTS "internal_emails_sender_subject_key"
ON "internal_emails"("sender", "subject");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'doctors_sectorId_fkey'
  ) THEN
    ALTER TABLE "doctors"
    ADD CONSTRAINT "doctors_sectorId_fkey"
    FOREIGN KEY ("sectorId") REFERENCES "sectors"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'nurses_sectorId_fkey'
  ) THEN
    ALTER TABLE "nurses"
    ADD CONSTRAINT "nurses_sectorId_fkey"
    FOREIGN KEY ("sectorId") REFERENCES "sectors"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
