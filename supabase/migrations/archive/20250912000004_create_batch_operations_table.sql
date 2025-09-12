-- Create batch_operations table for tracking batch processing
CREATE TABLE IF NOT EXISTS public.batch_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    batch_id TEXT NOT NULL,
    operation_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'partial')),
    results JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add batch_id field to passport_scans for tracking batch relationships
ALTER TABLE public.passport_scans 
ADD COLUMN batch_id TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_batch_operations_user_id ON public.batch_operations(user_id);
CREATE INDEX IF NOT EXISTS idx_batch_operations_batch_id ON public.batch_operations(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_operations_status ON public.batch_operations(status);
CREATE INDEX IF NOT EXISTS idx_passport_scans_batch_id ON public.passport_scans(batch_id);

-- Enable RLS
ALTER TABLE public.batch_operations ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can manage own batch operations" ON public.batch_operations
    FOR ALL USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_batch_operations_updated_at
    BEFORE UPDATE ON public.batch_operations
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();