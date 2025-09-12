# Migration: Report Templates + Storage Buckets/RLS

This idempotent migration adds the `report_templates` table (with indexes, RLS, and triggers) and provisions storage buckets (`passport-scans`, `processed-documents`) with per-user folder Row Level Security policies.

Run this SQL in the Supabase SQL editor (service-role context) against your existing database.

## SQL

```sql
BEGIN;

-- 1) Report templates table + indexes + RLS + policies
CREATE TABLE IF NOT EXISTS public.report_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  country TEXT NOT NULL,
  template JSONB NOT NULL,
  preview TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_templates_user_id
  ON public.report_templates(user_id);

CREATE INDEX IF NOT EXISTS idx_report_templates_category
  ON public.report_templates(category);

CREATE INDEX IF NOT EXISTS idx_report_templates_created_at
  ON public.report_templates(created_at DESC);

ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'report_templates'
      AND policyname = 'Users can view own or public templates'
  ) THEN
    CREATE POLICY "Users can view own or public templates"
      ON public.report_templates
      FOR SELECT USING (auth.uid() = user_id OR is_public = TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'report_templates'
      AND policyname = 'Users can insert own templates'
  ) THEN
    CREATE POLICY "Users can insert own templates"
      ON public.report_templates
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'report_templates'
      AND policyname = 'Users can update own templates'
  ) THEN
    CREATE POLICY "Users can update own templates"
      ON public.report_templates
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'report_templates'
      AND policyname = 'Users can delete own templates'
  ) THEN
    CREATE POLICY "Users can delete own templates"
      ON public.report_templates
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Add/update trigger for updated_at (assumes public.update_updated_at_column exists)
DROP TRIGGER IF EXISTS update_report_templates_updated_at ON public.report_templates;
CREATE TRIGGER update_report_templates_updated_at
  BEFORE UPDATE ON public.report_templates
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- 2) Storage buckets + RLS policies (per-user folder)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'passport-scans', 'passport-scans', FALSE, 10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'processed-documents', 'processed-documents', FALSE, 52428800,
  ARRAY['application/pdf', 'application/json', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Passport scans policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can upload passport scans'
  ) THEN
    CREATE POLICY "Users can upload passport scans" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'passport-scans'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can view own passport scans'
  ) THEN
    CREATE POLICY "Users can view own passport scans" ON storage.objects
      FOR SELECT USING (
        bucket_id = 'passport-scans'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can update own passport scans'
  ) THEN
    CREATE POLICY "Users can update own passport scans" ON storage.objects
      FOR UPDATE USING (
        bucket_id = 'passport-scans'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can delete own passport scans'
  ) THEN
    CREATE POLICY "Users can delete own passport scans" ON storage.objects
      FOR DELETE USING (
        bucket_id = 'passport-scans'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  -- Processed documents policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can upload processed documents'
  ) THEN
    CREATE POLICY "Users can upload processed documents" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'processed-documents'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can view own processed documents'
  ) THEN
    CREATE POLICY "Users can view own processed documents" ON storage.objects
      FOR SELECT USING (
        bucket_id = 'processed-documents'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can update own processed documents'
  ) THEN
    CREATE POLICY "Users can update own processed documents" ON storage.objects
      FOR UPDATE USING (
        bucket_id = 'processed-documents'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can delete own processed documents'
  ) THEN
    CREATE POLICY "Users can delete own processed documents" ON storage.objects
      FOR DELETE USING (
        bucket_id = 'processed-documents'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

COMMIT;
```

## Notes
- Idempotent: Buckets, policies, and indexes are only created if missing.
- Trigger: Expects `public.update_updated_at_column` to already exist (it is defined in the canonical schema). If it’s missing in your DB, run the function definition from the canonical schema before this migration.
- Permissions: Execute in a context with service-role privileges so bucket creation succeeds.

