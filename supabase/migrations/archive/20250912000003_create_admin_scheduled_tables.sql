-- Create missing tables for admin/scheduled ingestion routes
-- Referenced by /api/booking/ingest-daily, /api/booking/ingest-evening, /api/sync/daily

-- OAuth tokens table for storing encrypted OAuth credentials
CREATE TABLE IF NOT EXISTS public.oauth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('gmail', 'office365', 'google', 'microsoft')),
    token_type TEXT NOT NULL CHECK (token_type IN ('access_token', 'refresh_token', 'id_token')),
    encrypted_access_token TEXT,
    encrypted_refresh_token TEXT,
    scope TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Ensure one set of tokens per user per provider
    UNIQUE(user_id, provider, token_type)
);

-- Batch jobs table for tracking scheduled processing operations
CREATE TABLE IF NOT EXISTS public.batch_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL CHECK (job_type IN ('daily_ingest', 'evening_ingest', 'manual_sync', 'data_cleanup', 'analysis')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    metadata JSONB DEFAULT '{}'::jsonb,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- System logs table for administrative operations and audit trail
CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    operation TEXT NOT NULL,
    operation_type TEXT DEFAULT 'info' CHECK (operation_type IN ('info', 'warning', 'error', 'critical', 'debug')),
    details JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    request_id TEXT,
    execution_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Travel analysis cache table for storing computed travel patterns and analysis
CREATE TABLE IF NOT EXISTS public.travel_analysis_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    analysis_type TEXT NOT NULL CHECK (analysis_type IN ('daily_batch', 'evening_batch', 'on_demand', 'pattern_analysis', 'compliance_check', 'duplicate_detection')),
    analysis_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    cache_key TEXT,
    expires_at TIMESTAMPTZ,
    computation_time_ms INTEGER,
    data_sources TEXT[] DEFAULT ARRAY[]::TEXT[],
    confidence_score DECIMAL(3,2) CHECK (confidence_score BETWEEN 0.0 AND 1.0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Allow one cached analysis per type per user, but with versioning via created_at
    UNIQUE(user_id, analysis_type, cache_key)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_provider ON public.oauth_tokens(user_id, provider);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_expires_at ON public.oauth_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_batch_jobs_user_status ON public.batch_jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_type_created ON public.batch_jobs(job_type, created_at);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_status_priority ON public.batch_jobs(status, priority);

CREATE INDEX IF NOT EXISTS idx_system_logs_operation ON public.system_logs(operation);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON public.system_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON public.system_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_travel_analysis_cache_user_type ON public.travel_analysis_cache(user_id, analysis_type);
CREATE INDEX IF NOT EXISTS idx_travel_analysis_cache_expires_at ON public.travel_analysis_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_travel_analysis_cache_created_at ON public.travel_analysis_cache(created_at);

-- Add RLS (Row Level Security) policies
ALTER TABLE public.oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_analysis_cache ENABLE ROW LEVEL SECURITY;

-- OAuth tokens policies - users can only access their own tokens
CREATE POLICY oauth_tokens_user_policy ON public.oauth_tokens
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Batch jobs policies - users can view their own jobs, admins can view all
CREATE POLICY batch_jobs_user_policy ON public.batch_jobs
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY batch_jobs_admin_policy ON public.batch_jobs
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND (role = 'admin' OR settings->>'is_admin' = 'true')
        )
    );

-- System logs policies - only admins can view system logs
CREATE POLICY system_logs_admin_policy ON public.system_logs
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND (role = 'admin' OR settings->>'is_admin' = 'true')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND (role = 'admin' OR settings->>'is_admin' = 'true')
        )
    );

-- Travel analysis cache policies - users can access their own cached analysis
CREATE POLICY travel_analysis_cache_user_policy ON public.travel_analysis_cache
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Add functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for automatic updated_at timestamp updates
CREATE TRIGGER update_oauth_tokens_updated_at 
    BEFORE UPDATE ON public.oauth_tokens 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_batch_jobs_updated_at 
    BEFORE UPDATE ON public.batch_jobs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_travel_analysis_cache_updated_at 
    BEFORE UPDATE ON public.travel_analysis_cache 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add function to cleanup expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.travel_analysis_cache 
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add function to cleanup old batch jobs (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_batch_jobs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.batch_jobs 
    WHERE created_at < (NOW() - INTERVAL '30 days')
    AND status IN ('completed', 'failed', 'cancelled');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add function to cleanup old system logs (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_system_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.system_logs 
    WHERE created_at < (NOW() - INTERVAL '90 days');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;