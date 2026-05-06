-- Improve patient directory searches and active-record listing.
CREATE INDEX IF NOT EXISTS "patients_name_idx" ON "patients"("name");
CREATE INDEX IF NOT EXISTS "patients_phone_idx" ON "patients"("phone");
CREATE INDEX IF NOT EXISTS "patients_status_createdAt_idx" ON "patients"("status", "createdAt");
