-- Add unique login names while preserving existing users.
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "username" TEXT;

WITH normalized AS (
  SELECT
    id,
    COALESCE(
      NULLIF(
        regexp_replace(
          lower(split_part(email, '@', 1)),
          '[^a-z0-9._-]+',
          '.',
          'g'
        ),
        ''
      ),
      concat('user.', left(id, 8))
    ) AS base_login
  FROM "User"
  WHERE "username" IS NULL OR "username" = ''
),
ranked AS (
  SELECT
    id,
    base_login,
    row_number() OVER (PARTITION BY base_login ORDER BY id) AS position
  FROM normalized
)
UPDATE "User" AS users
SET "username" = CASE
  WHEN ranked.position = 1 THEN ranked.base_login
  ELSE concat(ranked.base_login, '.', ranked.position)
END
FROM ranked
WHERE users.id = ranked.id;

CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key"
ON "User"("username");

ALTER TABLE "User"
ALTER COLUMN "username" SET NOT NULL;
