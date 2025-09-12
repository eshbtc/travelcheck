-- Supabase Storage Setup for Travel Check
-- Run these commands in your Supabase SQL Editor

-- Create storage bucket for passport scans
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'passport-scans',
  'passport-scans',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for processed documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'processed-documents',
  'processed-documents',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'application/json', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for passport-scans bucket
-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload passport scans" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'passport-scans' 
  AND auth.role() = 'authenticated' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view their own files
CREATE POLICY "Users can view own passport scans" ON storage.objects
FOR SELECT USING (
  bucket_id = 'passport-scans' 
  AND auth.role() = 'authenticated' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own files
CREATE POLICY "Users can update own passport scans" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'passport-scans' 
  AND auth.role() = 'authenticated' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete own passport scans" ON storage.objects
FOR DELETE USING (
  bucket_id = 'passport-scans' 
  AND auth.role() = 'authenticated' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS policies for processed-documents bucket
-- Allow authenticated users to upload processed documents to their own folder
CREATE POLICY "Users can upload processed documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'processed-documents' 
  AND auth.role() = 'authenticated' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view their own processed documents
CREATE POLICY "Users can view own processed documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'processed-documents' 
  AND auth.role() = 'authenticated' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own processed documents
CREATE POLICY "Users can update own processed documents" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'processed-documents' 
  AND auth.role() = 'authenticated' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own processed documents
CREATE POLICY "Users can delete own processed documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'processed-documents' 
  AND auth.role() = 'authenticated' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;