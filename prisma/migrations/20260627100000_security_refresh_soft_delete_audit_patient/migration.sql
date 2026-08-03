-- Security hardening: refresh sessions, soft-delete flags and patient audit index.

ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "doctors"
ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "nurses"
ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "audit_logs"
ADD COLUMN IF NOT EXISTS "patientId" TEXT;

CREATE TABLE IF NOT EXISTS "refresh_tokens" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "refresh_tokens_tokenHash_key"
ON "refresh_tokens"("tokenHash");

CREATE INDEX IF NOT EXISTS "refresh_tokens_userId_revokedAt_idx"
ON "refresh_tokens"("userId", "revokedAt");

CREATE INDEX IF NOT EXISTS "refresh_tokens_expiresAt_idx"
ON "refresh_tokens"("expiresAt");

CREATE INDEX IF NOT EXISTS "audit_logs_patientId_createdAt_idx"
ON "audit_logs"("patientId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'refresh_tokens_userId_fkey'
  ) THEN
    ALTER TABLE "refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
