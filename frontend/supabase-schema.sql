-- Travel Check Supabase Database Schema
-- Run this in your Supabase SQL Editor

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email VARCHAR NOT NULL,
  full_name VARCHAR,
  avatar_url VARCHAR,
  primary_use_case VARCHAR DEFAULT 'tax_residency',
  target_countries TEXT[] DEFAULT '{}',
  timezone VARCHAR DEFAULT 'UTC',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Passport scans table
CREATE TABLE IF NOT EXISTS public.passport_scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  file_name VARCHAR NOT NULL,
  file_url VARCHAR NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR,
  analysis_results JSONB,
  processing_status VARCHAR DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  confidence_score DECIMAL(3,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Flight emails table
CREATE TABLE IF NOT EXISTS public.flight_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  email_id VARCHAR,
  provider VARCHAR CHECK (provider IN ('gmail', 'office365')),
  subject VARCHAR,
  sender VARCHAR,
  received_date TIMESTAMP WITH TIME ZONE,
  raw_content TEXT,
  parsed_data JSONB,
  confidence_score DECIMAL(3,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Travel history table (unified presence records)
CREATE TABLE IF NOT EXISTS public.travel_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  country VARCHAR NOT NULL,
  attribution VARCHAR NOT NULL, -- 'passport', 'email', 'manual', etc.
  confidence DECIMAL(3,2) DEFAULT 0.9,
  evidence TEXT[],
  conflicts JSONB DEFAULT '[]',
  timezone VARCHAR DEFAULT 'UTC',
  local_time TIME,
  source_id UUID, -- References passport_scans.id or flight_emails.id
  source_type VARCHAR, -- 'passport_scan', 'flight_email', 'manual'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reports table
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  report_type VARCHAR NOT NULL,
  country VARCHAR NOT NULL,
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  report_data JSONB NOT NULL,
  export_formats TEXT[] DEFAULT '{}',
  status VARCHAR DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'exported', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Duplicate records table (for conflict resolution)
CREATE TABLE IF NOT EXISTS public.duplicate_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  record_type VARCHAR NOT NULL, -- 'travel_entry', 'passport_stamp', etc.
  primary_record_id UUID,
  duplicate_record_ids UUID[],
  similarity_score DECIMAL(3,2),
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  resolution_action VARCHAR,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Integration status table
CREATE TABLE IF NOT EXISTS public.integration_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  provider VARCHAR NOT NULL CHECK (provider IN ('gmail', 'office365')),
  is_connected BOOLEAN DEFAULT FALSE,
  access_token VARCHAR,
  refresh_token VARCHAR,
  expires_at TIMESTAMP WITH TIME ZONE,
  scopes TEXT[],
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_status VARCHAR DEFAULT 'idle' CHECK (sync_status IN ('idle', 'syncing', 'error')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Templates table
CREATE TABLE IF NOT EXISTS public.report_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  description TEXT,
  category VARCHAR NOT NULL,
  country VARCHAR NOT NULL,
  template_data JSONB NOT NULL,
  preview_url VARCHAR,
  is_public BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit log table
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  action VARCHAR NOT NULL,
  resource_type VARCHAR NOT NULL,
  resource_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_passport_scans_user_id ON public.passport_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_passport_scans_created_at ON public.passport_scans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flight_emails_user_id ON public.flight_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_flight_emails_received_date ON public.flight_emails(received_date DESC);
CREATE INDEX IF NOT EXISTS idx_travel_history_user_id ON public.travel_history(user_id);
CREATE INDEX IF NOT EXISTS idx_travel_history_date ON public.travel_history(date DESC);
CREATE INDEX IF NOT EXISTS idx_travel_history_country ON public.travel_history(country);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON public.reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_duplicate_records_user_id ON public.duplicate_records(user_id);
CREATE INDEX IF NOT EXISTS idx_integration_status_user_id ON public.integration_status(user_id);

-- Row Level Security (RLS) Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flight_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duplicate_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for passport_scans
CREATE POLICY "Users can view own passport scans" ON public.passport_scans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own passport scans" ON public.passport_scans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own passport scans" ON public.passport_scans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own passport scans" ON public.passport_scans
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for flight_emails
CREATE POLICY "Users can view own flight emails" ON public.flight_emails
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own flight emails" ON public.flight_emails
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own flight emails" ON public.flight_emails
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own flight emails" ON public.flight_emails
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for travel_history
CREATE POLICY "Users can view own travel history" ON public.travel_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own travel history" ON public.travel_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own travel history" ON public.travel_history
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own travel history" ON public.travel_history
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for reports
CREATE POLICY "Users can view own reports" ON public.reports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reports" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reports" ON public.reports
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reports" ON public.reports
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for duplicate_records
CREATE POLICY "Users can view own duplicates" ON public.duplicate_records
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own duplicates" ON public.duplicate_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own duplicates" ON public.duplicate_records
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for integration_status
CREATE POLICY "Users can view own integrations" ON public.integration_status
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own integrations" ON public.integration_status
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own integrations" ON public.integration_status
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for report_templates
CREATE POLICY "Users can view own templates" ON public.report_templates
  FOR SELECT USING (auth.uid() = user_id OR is_public = TRUE);

CREATE POLICY "Users can insert own templates" ON public.report_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates" ON public.report_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates" ON public.report_templates
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for audit_log
CREATE POLICY "Users can view own audit log" ON public.audit_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert audit log" ON public.audit_log
  FOR INSERT WITH CHECK (true);

-- Functions for automatic timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamps
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_passport_scans_updated_at BEFORE UPDATE ON public.passport_scans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flight_emails_updated_at BEFORE UPDATE ON public.flight_emails
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_travel_history_updated_at BEFORE UPDATE ON public.travel_history
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_duplicate_records_updated_at BEFORE UPDATE ON public.duplicate_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integration_status_updated_at BEFORE UPDATE ON public.integration_status
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_templates_updated_at BEFORE UPDATE ON public.report_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile after signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

-- Trigger to create user profile after signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;