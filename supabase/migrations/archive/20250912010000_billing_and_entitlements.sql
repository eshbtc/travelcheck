-- Billing & Entitlements schema for Lemon Squeezy integration
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Customers mapped to Supabase users
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

-- Subscriptions (Personal / Firm tiers)
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

-- Entitlements per user (applies to both one‑time and subscriptions)
CREATE TABLE IF NOT EXISTS public.billing_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_code TEXT, -- e.g., one_time, personal, firm_starter
  status TEXT DEFAULT 'active',
  report_credits_balance INT DEFAULT 0,         -- one‑time credits balance
  report_credits_monthly_quota INT DEFAULT 0,   -- monthly quota for firms
  seats_limit INT DEFAULT 0,
  api_minimum_cents INT DEFAULT 0,
  effective_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Webhook idempotency store
CREATE TABLE IF NOT EXISTS public.billing_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dedupe_hash TEXT UNIQUE NOT NULL,
  event_name TEXT,
  customer_email TEXT,
  received_at TIMESTAMPTZ DEFAULT now(),
  raw JSONB
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_billing_customers_user ON public.billing_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_user ON public.billing_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_entitlements_user ON public.billing_entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_webhook_events_received ON public.billing_webhook_events(received_at DESC);

-- RLS
ALTER TABLE public.billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_webhook_events ENABLE ROW LEVEL SECURITY;

-- Policies: users can read their own; admins can manage all
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

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_billing_customers_updated
  BEFORE UPDATE ON public.billing_customers
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER trg_billing_subscriptions_updated
  BEFORE UPDATE ON public.billing_subscriptions
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER trg_billing_entitlements_updated
  BEFORE UPDATE ON public.billing_entitlements
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

