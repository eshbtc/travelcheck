-- Travel Check Consolidated Baseline Schema Migration
-- This migration creates the complete schema from scratch with all features

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA extensions;

-- Helper function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Alternative trigger function for billing tables compatibility
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    display_name TEXT,
    photo_url TEXT,
    provider TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    settings JSONB DEFAULT '{}'::jsonb
);

-- User Preferences (schedule and user-level settings)
CREATE TABLE IF NOT EXISTS public.user_preferences (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email Accounts table for OAuth integrations
CREATE TABLE IF NOT EXISTS public.email_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('gmail', 'office365')),
    email TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    scope TEXT,
    is_active BOOLEAN DEFAULT true,
    last_sync TIMESTAMPTZ,
    sync_status TEXT DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, provider, email)
);

-- Flight Emails table
CREATE TABLE IF NOT EXISTS public.flight_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    email_account_id UUID REFERENCES public.email_accounts(id) ON DELETE SET NULL,
    message_id TEXT,
    thread_id TEXT,
    subject TEXT,
    sender TEXT,
    recipient TEXT,
    body_text TEXT,
    body_html TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    flight_data JSONB,
    booking_data JSONB,
    parsed_data JSONB,
    confidence_score DECIMAL,
    processing_status TEXT DEFAULT 'pending',
    is_processed BOOLEAN DEFAULT false,
    date_received TIMESTAMPTZ,
    date_flight TIMESTAMPTZ,
    airline TEXT,
    flight_number TEXT,
    departure_airport TEXT,
    arrival_airport TEXT,
    confirmation_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Travel History table (main user travel record)
CREATE TABLE IF NOT EXISTS public.travel_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    passport_data JSONB DEFAULT '{}'::jsonb,
    flight_data JSONB DEFAULT '{}'::jsonb,
    email_data JSONB DEFAULT '{}'::jsonb,
    manual_entries JSONB DEFAULT '[]'::jsonb,
    computed_presence JSONB DEFAULT '{}'::jsonb,
    summary_stats JSONB DEFAULT '{}'::jsonb,
    analysis_data JSONB DEFAULT '{}'::jsonb,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Passport Scans table
CREATE TABLE IF NOT EXISTS public.passport_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    file_name TEXT,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    analysis_results JSONB DEFAULT '{}'::jsonb,
    extracted_stamps JSONB DEFAULT '[]'::jsonb,
    processing_status TEXT DEFAULT 'pending',
    confidence_score DECIMAL,
    manual_corrections JSONB DEFAULT '{}'::jsonb,
    is_verified BOOLEAN DEFAULT false,
    ocr_text TEXT,
    passport_info JSONB DEFAULT '{}'::jsonb,
    is_duplicate BOOLEAN DEFAULT false,
    duplicate_of UUID REFERENCES public.passport_scans(id) ON DELETE SET NULL,
    duplicate_confidence DECIMAL,
    batch_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Travel Entries table (individual travel records)
CREATE TABLE IF NOT EXISTS public.travel_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    entry_type TEXT NOT NULL CHECK (entry_type IN ('passport_stamp', 'flight', 'manual', 'email')),
    source_id UUID, -- References passport_scans.id, flight_emails.id, etc.
    source_type TEXT,
    
    -- Location data
    country_code TEXT,
    country_name TEXT,
    city TEXT,
    airport_code TEXT,
    
    -- Date data
    entry_date DATE,
    exit_date DATE,
    entry_time TIME,
    exit_time TIME,
    timezone TEXT,
    
    -- Travel details
    purpose TEXT,
    transport_type TEXT CHECK (transport_type IN ('flight', 'land', 'sea', 'other')),
    carrier TEXT,
    flight_number TEXT,
    confirmation_number TEXT,
    
    -- Status and validation
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'disputed', 'ignored')),
    confidence_score DECIMAL,
    is_verified BOOLEAN DEFAULT false,
    manual_override BOOLEAN DEFAULT false,
    
    -- Additional data
    notes TEXT,
    tags TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reports table
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL CHECK (report_type IN ('presence', 'travel_summary', 'tax_residency', 'visa_compliance', 'custom')),
    title TEXT NOT NULL,
    description TEXT,
    parameters JSONB DEFAULT '{}'::jsonb,
    report_data JSONB NOT NULL,
    file_format TEXT DEFAULT 'json' CHECK (file_format IN ('json', 'pdf', 'csv', 'xlsx')),
    file_url TEXT,
    status TEXT DEFAULT 'generated' CHECK (status IN ('generating', 'generated', 'failed', 'archived')),
    expires_at TIMESTAMPTZ,
    download_count INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT false,
    share_token TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Report Templates table
CREATE TABLE IF NOT EXISTS public.report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT NOT NULL,
    country TEXT NOT NULL,
    template JSONB NOT NULL DEFAULT '{}'::jsonb,
    preview TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Duplicate Detection Groups table
CREATE TABLE IF NOT EXISTS public.duplicate_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    group_type TEXT NOT NULL,
    similarity_score DECIMAL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'ignored')),
    resolution_action TEXT,
    resolved_by UUID REFERENCES public.users(id),
    resolved_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Duplicate Detection Items table
CREATE TABLE IF NOT EXISTS public.duplicate_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.duplicate_groups(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL,
    item_id UUID NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    confidence_score DECIMAL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Duplicate Detection Results table (for logging)
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

-- Batch Operations table (for tracking batch processing)
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

-- Batch Jobs table (for scheduled operations)
CREATE TABLE IF NOT EXISTS public.batch_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    metadata JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- System Logs table (for operational logging)
CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    operation TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Health Check table
CREATE TABLE IF NOT EXISTS public.health_check (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT DEFAULT 'healthy',
    last_check TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- AI cache table for LLM responses
CREATE TABLE IF NOT EXISTS public.ai_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- Billing Customers (mapped to Supabase users)
CREATE TABLE IF NOT EXISTS public.billing_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  lemon_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(email)
);

-- Billing Subscriptions (Personal / Firm tiers)
CREATE TABLE IF NOT EXISTS public.billing_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  lemon_subscription_id TEXT UNIQUE,
  product_id INT,
  variant_id INT,
  plan_code TEXT, -- e.g., personal_monthly, firm_growth
  status TEXT,    -- e.g., active, cancelled, past_due
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Billing Entitlements (applies to both one‑time and subscriptions)
CREATE TABLE IF NOT EXISTS public.billing_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_code TEXT, -- e.g., one_time, personal, firm_starter
  status TEXT DEFAULT 'active',
  report_credits_balance INT DEFAULT 0,         -- one‑time credits balance
  report_credits_monthly_quota INT DEFAULT 0,   -- monthly quota for firms
  seats_limit INT DEFAULT 0,
  api_minimum_cents INT DEFAULT 0,
  last_monthly_reset_at TIMESTAMPTZ,
  last_annual_reset_year INT,
  annual_included_reports INT DEFAULT 1,
  effective_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Billing Webhook Events (idempotency store)
CREATE TABLE IF NOT EXISTS public.billing_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dedupe_hash TEXT UNIQUE NOT NULL,
  event_name TEXT,
  customer_email TEXT,
  received_at TIMESTAMPTZ DEFAULT now(),
  raw JSONB
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

CREATE INDEX IF NOT EXISTS idx_email_accounts_user_id ON public.email_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_email_accounts_provider ON public.email_accounts(provider);
CREATE INDEX IF NOT EXISTS idx_email_accounts_active ON public.email_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_email_accounts_user_provider_active ON public.email_accounts(user_id, provider, is_active);

CREATE INDEX IF NOT EXISTS idx_flight_emails_user_id ON public.flight_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_flight_emails_processed ON public.flight_emails(is_processed);
CREATE INDEX IF NOT EXISTS idx_flight_emails_date_flight ON public.flight_emails(date_flight);
CREATE INDEX IF NOT EXISTS idx_flight_emails_airline ON public.flight_emails(airline);
CREATE INDEX IF NOT EXISTS idx_flight_emails_account_message ON public.flight_emails(email_account_id, message_id);

CREATE INDEX IF NOT EXISTS idx_passport_scans_user_id ON public.passport_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_passport_scans_status ON public.passport_scans(processing_status);
CREATE INDEX IF NOT EXISTS idx_passport_scans_is_duplicate ON public.passport_scans(is_duplicate);
CREATE INDEX IF NOT EXISTS idx_passport_scans_duplicate_of ON public.passport_scans(duplicate_of);
CREATE INDEX IF NOT EXISTS idx_passport_scans_batch_id ON public.passport_scans(batch_id);

CREATE INDEX IF NOT EXISTS idx_travel_entries_user_id ON public.travel_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_travel_entries_type ON public.travel_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_travel_entries_country ON public.travel_entries(country_code);
CREATE INDEX IF NOT EXISTS idx_travel_entries_date ON public.travel_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_travel_entries_status ON public.travel_entries(status);

CREATE INDEX IF NOT EXISTS idx_reports_user_id ON public.reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_type ON public.reports(report_type);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);

CREATE INDEX IF NOT EXISTS idx_report_templates_user_id ON public.report_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_report_templates_category ON public.report_templates(category);
CREATE INDEX IF NOT EXISTS idx_report_templates_country ON public.report_templates(country);
CREATE INDEX IF NOT EXISTS idx_report_templates_public ON public.report_templates(is_public);

CREATE INDEX IF NOT EXISTS idx_duplicate_detection_results_user_id ON public.duplicate_detection_results(user_id);

CREATE INDEX IF NOT EXISTS idx_batch_operations_user_id ON public.batch_operations(user_id);
CREATE INDEX IF NOT EXISTS idx_batch_operations_batch_id ON public.batch_operations(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_operations_status ON public.batch_operations(status);

CREATE INDEX IF NOT EXISTS idx_batch_jobs_user_id ON public.batch_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_status ON public.batch_jobs(status);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_type ON public.batch_jobs(job_type);

CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON public.system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_operation ON public.system_logs(operation);

-- AI cache indexes
CREATE UNIQUE INDEX IF NOT EXISTS ai_cache_unique ON public.ai_cache(cache_key, endpoint);
CREATE INDEX IF NOT EXISTS idx_ai_cache_user_endpoint ON public.ai_cache(user_id, endpoint);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_time ON public.ai_usage_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_endpoint ON public.ai_usage_logs(endpoint);

-- Billing indexes
CREATE INDEX IF NOT EXISTS idx_billing_customers_user ON public.billing_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_user ON public.billing_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_entitlements_user ON public.billing_entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_webhook_events_received ON public.billing_webhook_events(received_at DESC);

-- Unique constraints for upserts (using conditional creation)
DO $$
BEGIN
  -- flight_emails uniqueness on (email_account_id, message_id)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'flight_emails_account_message_unique'
  ) THEN
    ALTER TABLE public.flight_emails
      ADD CONSTRAINT flight_emails_account_message_unique
      UNIQUE (email_account_id, message_id);
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

-- Row Level Security (RLS) Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flight_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duplicate_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duplicate_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duplicate_detection_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_check ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_webhook_events ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own data" ON public.users
    FOR ALL USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Email accounts policies
CREATE POLICY "Users can manage own email accounts" ON public.email_accounts
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all email accounts" ON public.email_accounts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Flight emails policies
CREATE POLICY "Users can manage own flight emails" ON public.flight_emails
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all flight emails" ON public.flight_emails
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Travel history policies
CREATE POLICY "Users can manage own travel history" ON public.travel_history
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all travel history" ON public.travel_history
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Passport scans policies
CREATE POLICY "Users can manage own passport scans" ON public.passport_scans
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all passport scans" ON public.passport_scans
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Travel entries policies
CREATE POLICY "Users can manage own travel entries" ON public.travel_entries
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all travel entries" ON public.travel_entries
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Reports policies
CREATE POLICY "Users can manage own reports" ON public.reports
    FOR ALL USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Admins can view all reports" ON public.reports
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Report templates policies
CREATE POLICY "Users can manage own report templates" ON public.report_templates
    FOR ALL USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Admins can view all report templates" ON public.report_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- User preferences policies (RLS-style; effective when RLS enabled)
CREATE POLICY "Users can manage own preferences" ON public.user_preferences
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all preferences" ON public.user_preferences
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Duplicate detection policies
CREATE POLICY "Users can manage own duplicates" ON public.duplicate_groups
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view duplicate items for own groups" ON public.duplicate_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.duplicate_groups
            WHERE id = group_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage own duplicate detection results" ON public.duplicate_detection_results
    FOR ALL USING (auth.uid() = user_id);

-- Batch operations policies
CREATE POLICY "Users can manage own batch operations" ON public.batch_operations
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own batch jobs" ON public.batch_jobs
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all batch jobs" ON public.batch_jobs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- System logs - admin only
CREATE POLICY "Admins can view system logs" ON public.system_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Health check is public read
CREATE POLICY "Public health check" ON public.health_check
    FOR SELECT USING (true);

-- AI cache and usage policies
CREATE POLICY "ai_cache_user_policy" ON public.ai_cache
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_usage_logs_user_policy" ON public.ai_usage_logs
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Billing policies
CREATE POLICY "Users read own customers" ON public.billing_customers
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage customers" ON public.billing_customers
  FOR ALL USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));

CREATE POLICY "Users read own subscriptions" ON public.billing_subscriptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage subscriptions" ON public.billing_subscriptions
  FOR ALL USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));

CREATE POLICY "Users read own entitlements" ON public.billing_entitlements
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage entitlements" ON public.billing_entitlements
  FOR ALL USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));

-- Webhook events: admin-only
CREATE POLICY "Admins manage webhook events" ON public.billing_webhook_events
  FOR ALL USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));

-- Functions to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, display_name)
    VALUES (
        NEW.id, 
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on auth signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Triggers for updated_at columns
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_email_accounts_updated_at
    BEFORE UPDATE ON public.email_accounts
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_flight_emails_updated_at
    BEFORE UPDATE ON public.flight_emails
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_passport_scans_updated_at
    BEFORE UPDATE ON public.passport_scans
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_travel_entries_updated_at
    BEFORE UPDATE ON public.travel_entries
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_reports_updated_at
    BEFORE UPDATE ON public.reports
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_report_templates_updated_at
    BEFORE UPDATE ON public.report_templates
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_batch_operations_updated_at
    BEFORE UPDATE ON public.batch_operations
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_batch_jobs_updated_at
    BEFORE UPDATE ON public.batch_jobs
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- Billing triggers using alternate function
CREATE TRIGGER trg_billing_customers_updated
  BEFORE UPDATE ON public.billing_customers
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER trg_billing_subscriptions_updated
  BEFORE UPDATE ON public.billing_subscriptions
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER trg_billing_entitlements_updated
  BEFORE UPDATE ON public.billing_entitlements
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- Storage buckets for file uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('passport-scans', 'passport-scans', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('processed-documents', 'processed-documents', false, 52428800, ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Users can upload own passport scans" ON storage.objects FOR INSERT 
    WITH CHECK (bucket_id = 'passport-scans' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own passport scans" ON storage.objects FOR SELECT 
    USING (bucket_id = 'passport-scans' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own passport scans" ON storage.objects FOR DELETE 
    USING (bucket_id = 'passport-scans' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own processed documents" ON storage.objects FOR INSERT 
    WITH CHECK (bucket_id = 'processed-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own processed documents" ON storage.objects FOR SELECT 
    USING (bucket_id = 'processed-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own processed documents" ON storage.objects FOR DELETE 
    USING (bucket_id = 'processed-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Admins can view all storage objects
CREATE POLICY "Admins can view all passport scans" ON storage.objects FOR SELECT 
    USING (bucket_id = 'passport-scans' AND EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    ));

CREATE POLICY "Admins can view all processed documents" ON storage.objects FOR SELECT 
    USING (bucket_id = 'processed-documents' AND EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    ));

-- Insert initial health check record
INSERT INTO public.health_check (status, metadata) 
VALUES ('healthy', '{"initialized": true, "version": "2.0.0", "consolidated_baseline": true, "features": ["core", "billing", "ai_cache", "duplicates", "batch_processing"]}'::jsonb)
ON CONFLICT DO NOTHING;
