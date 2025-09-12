-- Add reset tracking columns to entitlements for monthly/annual credits
ALTER TABLE public.billing_entitlements
  ADD COLUMN IF NOT EXISTS last_monthly_reset_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_annual_reset_year INT,
  ADD COLUMN IF NOT EXISTS annual_included_reports INT DEFAULT 1;

