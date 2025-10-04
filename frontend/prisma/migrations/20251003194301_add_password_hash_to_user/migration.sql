-- AlterTable
-- Add password_hash column to users table
-- This field is optional and only used for credentials-based authentication
ALTER TABLE "users" ADD COLUMN "password_hash" TEXT;
