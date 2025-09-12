-- Add duplicate detection fields to passport_scans table
ALTER TABLE public.passport_scans 
ADD COLUMN is_duplicate BOOLEAN DEFAULT false,
ADD COLUMN duplicate_of UUID REFERENCES public.passport_scans(id) ON DELETE SET NULL,
ADD COLUMN duplicate_confidence DECIMAL;

-- Create duplicate detection results table for logging
CREATE TABLE IF NOT EXISTS public.duplicate_detection_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    detection_type TEXT NOT NULL,
    scan_id UUID REFERENCES public.passport_scans(id) ON DELETE SET NULL,
    duplicates_found INTEGER DEFAULT 0,
    auto_resolved BOOLEAN DEFAULT false,
    resolved_count INTEGER DEFAULT 0,
    results JSONB DEFAULT '[]'::jsonb,
    similarity_threshold DECIMAL DEFAULT 0.8,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_passport_scans_is_duplicate ON public.passport_scans(is_duplicate);
CREATE INDEX IF NOT EXISTS idx_passport_scans_duplicate_of ON public.passport_scans(duplicate_of);
CREATE INDEX IF NOT EXISTS idx_duplicate_detection_results_user_id ON public.duplicate_detection_results(user_id);

-- Enable RLS
ALTER TABLE public.duplicate_detection_results ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can manage own duplicate detection results" ON public.duplicate_detection_results
    FOR ALL USING (auth.uid() = user_id);