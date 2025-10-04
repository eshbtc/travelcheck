-- Migration: Add NextAuth v4 standard fields to User model
-- Purpose: Make schema compatible with NextAuth PrismaAdapter
-- Safe: Additive only, no data loss

-- Step 1: Add missing NextAuth standard fields
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "name" TEXT,
  ADD COLUMN IF NOT EXISTS "email_verified" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "image" TEXT;

-- Step 2: Backfill data from existing fields to maintain compatibility
-- Sync displayName -> name
UPDATE "users"
SET "name" = "display_name"
WHERE "display_name" IS NOT NULL AND "name" IS NULL;

-- Sync photoUrl -> image
UPDATE "users"
SET "image" = "photo_url"
WHERE "photo_url" IS NOT NULL AND "image" IS NULL;

-- Step 3: Create indexes for commonly queried NextAuth fields
CREATE INDEX IF NOT EXISTS "users_email_verified_idx" ON "users"("email_verified");

-- Step 4: Add comment documenting the dual-field strategy
COMMENT ON COLUMN "users"."name" IS 'NextAuth standard field, synced with display_name';
COMMENT ON COLUMN "users"."image" IS 'NextAuth standard field, synced with photo_url';
COMMENT ON COLUMN "users"."email_verified" IS 'NextAuth standard field for email verification status';
