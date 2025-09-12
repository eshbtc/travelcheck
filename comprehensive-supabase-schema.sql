-- Comprehensive Supabase Schema for Travel Check App
-- Based on existing Firestore structure

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_crypto";

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

-- Email Accounts table for OAuth integrations
CREATE TABLE IF NOT EXISTS public.email_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    email_account_id UUID REFERENCES public.email_accounts(id),
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    passport_data JSONB DEFAULT '{}'::jsonb,
    flight_data JSONB DEFAULT '{}'::jsonb,
    email_data JSONB DEFAULT '{}'::jsonb,
    manual_entries JSONB DEFAULT '[]'::jsonb,
    computed_presence JSONB DEFAULT '{}'::jsonb,
    summary_stats JSONB DEFAULT '{}'::jsonb,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Passport Scans table
CREATE TABLE IF NOT EXISTS public.passport_scans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Travel Entries table (individual travel records)
CREATE TABLE IF NOT EXISTS public.travel_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Duplicate Detection table
CREATE TABLE IF NOT EXISTS public.duplicate_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

CREATE TABLE IF NOT EXISTS public.duplicate_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.duplicate_groups(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL,
    item_id UUID NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    confidence_score DECIMAL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Health Check table
CREATE TABLE IF NOT EXISTS public.health_check (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status TEXT DEFAULT 'healthy',
    last_check TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

CREATE INDEX IF NOT EXISTS idx_email_accounts_user_id ON public.email_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_email_accounts_provider ON public.email_accounts(provider);
CREATE INDEX IF NOT EXISTS idx_email_accounts_active ON public.email_accounts(is_active);

CREATE INDEX IF NOT EXISTS idx_flight_emails_user_id ON public.flight_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_flight_emails_processed ON public.flight_emails(is_processed);
CREATE INDEX IF NOT EXISTS idx_flight_emails_date_flight ON public.flight_emails(date_flight);
CREATE INDEX IF NOT EXISTS idx_flight_emails_airline ON public.flight_emails(airline);

CREATE INDEX IF NOT EXISTS idx_passport_scans_user_id ON public.passport_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_passport_scans_status ON public.passport_scans(processing_status);

CREATE INDEX IF NOT EXISTS idx_travel_entries_user_id ON public.travel_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_travel_entries_type ON public.travel_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_travel_entries_country ON public.travel_entries(country_code);
CREATE INDEX IF NOT EXISTS idx_travel_entries_date ON public.travel_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_travel_entries_status ON public.travel_entries(status);

CREATE INDEX IF NOT EXISTS idx_reports_user_id ON public.reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_type ON public.reports(report_type);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);

-- Report Templates table
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

CREATE INDEX IF NOT EXISTS idx_report_templates_user_id ON public.report_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_report_templates_category ON public.report_templates(category);
CREATE INDEX IF NOT EXISTS idx_report_templates_created_at ON public.report_templates(created_at DESC);

-- Row Level Security (RLS) Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flight_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duplicate_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duplicate_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_check ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;

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
CREATE POLICY "Users can view own or public templates" ON public.report_templates
    FOR SELECT USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can insert own templates" ON public.report_templates
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates" ON public.report_templates
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates" ON public.report_templates
    FOR DELETE USING (auth.uid() = user_id);

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

-- Health check is public read
CREATE POLICY "Public health check" ON public.health_check
    FOR SELECT USING (true);

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

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

-- Insert initial health check record
INSERT INTO public.health_check (status, metadata) 
VALUES ('healthy', '{"initialized": true, "version": "1.0.0"}'::jsonb)
ON CONFLICT DO NOTHING;

-- =============================================
-- Storage: Buckets and RLS Policies
-- =============================================

-- Create storage buckets if they do not exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'passport-scans',
    'passport-scans',
    FALSE,
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'processed-documents',
    'processed-documents',
    FALSE,
    52428800, -- 50MB
    ARRAY['application/pdf', 'application/json', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- Ensure RLS is enabled on storage objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- RLS policies for passport-scans bucket
CREATE POLICY "Users can upload passport scans" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'passport-scans'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view own passport scans" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'passport-scans'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own passport scans" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'passport-scans'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own passport scans" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'passport-scans'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS policies for processed-documents bucket
CREATE POLICY "Users can upload processed documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'processed-documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view own processed documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'processed-documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own processed documents" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'processed-documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own processed documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'processed-documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
