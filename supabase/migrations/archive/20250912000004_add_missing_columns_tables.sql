-- Add missing columns and tables for duplicate detection and batch processing routes
-- Addresses schema mismatches identified in QA review

-- Add missing columns to passport_scans table
ALTER TABLE public.passport_scans 
ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS duplicate_of UUID REFERENCES public.passport_scans(id) ON DELETE SET NULL;

-- Create duplicate_detection_results table for tracking duplicate detection operations
CREATE TABLE IF NOT EXISTS public.duplicate_detection_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    detection_type TEXT NOT NULL CHECK (detection_type IN ('passport_scans', 'flight_emails', 'travel_entries', 'all')),
    total_scanned INTEGER DEFAULT 0,
    duplicates_found INTEGER DEFAULT 0,
    duplicates_resolved INTEGER DEFAULT 0,
    detection_criteria JSONB DEFAULT '{}'::jsonb,
    results JSONB DEFAULT '{}'::jsonb,
    auto_resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create batch_operations table for tracking batch processing operations
CREATE TABLE IF NOT EXISTS public.batch_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    batch_id TEXT NOT NULL,
    operation_type TEXT NOT NULL CHECK (operation_type IN ('passport_scan', 'ocr_processing', 'duplicate_detection', 'data_export', 'bulk_upload')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    total_items INTEGER DEFAULT 0,
    processed_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,
    success_items INTEGER DEFAULT 0,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
    operation_metadata JSONB DEFAULT '{}'::jsonb,
    results JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_passport_scans_is_duplicate ON public.passport_scans(is_duplicate);
CREATE INDEX IF NOT EXISTS idx_passport_scans_duplicate_of ON public.passport_scans(duplicate_of);

CREATE INDEX IF NOT EXISTS idx_duplicate_detection_results_user_type ON public.duplicate_detection_results(user_id, detection_type);
CREATE INDEX IF NOT EXISTS idx_duplicate_detection_results_created_at ON public.duplicate_detection_results(created_at);

CREATE INDEX IF NOT EXISTS idx_batch_operations_user_batch ON public.batch_operations(user_id, batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_operations_status ON public.batch_operations(status);
CREATE INDEX IF NOT EXISTS idx_batch_operations_created_at ON public.batch_operations(created_at);

-- Add RLS (Row Level Security) policies
ALTER TABLE public.duplicate_detection_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_operations ENABLE ROW LEVEL SECURITY;

-- Duplicate detection results policies - users can only access their own results
CREATE POLICY duplicate_detection_results_user_policy ON public.duplicate_detection_results
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Batch operations policies - users can access their own operations, admins can view all
CREATE POLICY batch_operations_user_policy ON public.batch_operations
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY batch_operations_admin_policy ON public.batch_operations
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND (role = 'admin' OR settings->>'is_admin' = 'true')
        )
    );

-- Add triggers for automatic updated_at timestamp updates
CREATE TRIGGER update_duplicate_detection_results_updated_at 
    BEFORE UPDATE ON public.duplicate_detection_results 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_batch_operations_updated_at 
    BEFORE UPDATE ON public.batch_operations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add function to cleanup old duplicate detection results (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_duplicate_detection_results()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.duplicate_detection_results 
    WHERE created_at < (NOW() - INTERVAL '30 days');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add function to cleanup old batch operations (older than 60 days)
CREATE OR REPLACE FUNCTION cleanup_old_batch_operations()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.batch_operations 
    WHERE created_at < (NOW() - INTERVAL '60 days')
    AND status IN ('completed', 'failed', 'cancelled');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;