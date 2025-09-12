-- Add AI cache and usage log tables, and unique constraints for upserts

-- AI cache table for LLM responses
CREATE TABLE IF NOT EXISTS public.ai_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure we only keep one cache entry per key/endpoint
CREATE UNIQUE INDEX IF NOT EXISTS ai_cache_unique ON public.ai_cache(cache_key, endpoint);
CREATE INDEX IF NOT EXISTS idx_ai_cache_user_endpoint ON public.ai_cache(user_id, endpoint);

-- Usage logs for AI endpoints (rate limiting/observability)
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  cache_hit BOOLEAN DEFAULT false,
  data_size INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_time ON public.ai_usage_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_endpoint ON public.ai_usage_logs(endpoint);

-- RLS policies
ALTER TABLE public.ai_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_cache_user_policy ON public.ai_cache
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY ai_usage_logs_user_policy ON public.ai_usage_logs
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add unique constraints to support upserts used in API code
DO $$
BEGIN
  -- flight_emails uniqueness on (user_id, message_id)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'flight_emails_user_message_unique'
  ) THEN
    ALTER TABLE public.flight_emails
      ADD CONSTRAINT flight_emails_user_message_unique
      UNIQUE (user_id, message_id);
  END IF;

  -- travel_entries uniqueness on (user_id, source_id, entry_type, country_code, entry_date)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'travel_entries_source_unique'
  ) THEN
    ALTER TABLE public.travel_entries
      ADD CONSTRAINT travel_entries_source_unique
      UNIQUE (user_id, source_id, entry_type, country_code, entry_date);
  END IF;
END $$;

