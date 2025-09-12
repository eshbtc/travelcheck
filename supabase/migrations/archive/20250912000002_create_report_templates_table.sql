-- Create report_templates table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_report_templates_user_id ON public.report_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_report_templates_category ON public.report_templates(category);
CREATE INDEX IF NOT EXISTS idx_report_templates_country ON public.report_templates(country);
CREATE INDEX IF NOT EXISTS idx_report_templates_public ON public.report_templates(is_public);

-- Enable RLS
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage own report templates" ON public.report_templates
    FOR ALL USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Admins can view all report templates" ON public.report_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Add updated_at trigger
CREATE TRIGGER update_report_templates_updated_at
    BEFORE UPDATE ON public.report_templates
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();