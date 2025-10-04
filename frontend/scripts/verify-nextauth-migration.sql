-- NextAuth Migration Verification Script
-- Run this in Railway PostgreSQL console after migration

-- 1. Verify columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('name', 'email_verified', 'image', 'display_name', 'photo_url')
ORDER BY column_name;

-- Expected output:
-- column_name     | data_type                   | is_nullable
-- ----------------+-----------------------------+-------------
-- display_name    | character varying           | YES
-- email_verified  | timestamp without time zone | YES
-- image           | character varying           | YES
-- name            | character varying           | YES
-- photo_url       | character varying           | YES

-- 2. Check data sync (should have matching values)
SELECT
  email,
  name,
  display_name AS "displayName",
  image,
  photo_url AS "photoUrl",
  CASE
    WHEN name = display_name AND image = photo_url THEN '✅ Synced'
    WHEN name IS NULL AND display_name IS NULL THEN '✅ Both NULL'
    ELSE '⚠️ Mismatch'
  END AS sync_status
FROM users
LIMIT 10;

-- 3. Check for users with missing NextAuth fields
SELECT
  COUNT(*) FILTER (WHERE name IS NULL AND display_name IS NOT NULL) AS missing_name,
  COUNT(*) FILTER (WHERE image IS NULL AND photo_url IS NOT NULL) AS missing_image,
  COUNT(*) AS total_users
FROM users;

-- Expected after migration:
-- missing_name | missing_image | total_users
-- -------------+---------------+-------------
--            0 |             0 |           N

-- 4. Verify Account table compatibility
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'accounts'
  AND column_name IN (
    'id', 'user_id', 'type', 'provider', 'provider_account_id',
    'refresh_token', 'access_token', 'expires_at', 'token_type',
    'scope', 'id_token', 'session_state'
  )
ORDER BY column_name;

-- Expected: All 12 columns should exist

-- 5. Sample NextAuth tables structure
SELECT
  'users' AS table_name,
  COUNT(*) AS record_count
FROM users
UNION ALL
SELECT 'accounts', COUNT(*) FROM accounts
UNION ALL
SELECT 'sessions', COUNT(*) FROM sessions
UNION ALL
SELECT 'verification_tokens', COUNT(*) FROM verification_tokens;

-- 6. Check indexes
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'users'
  AND indexname LIKE '%email%'
ORDER BY indexname;
