-- Add analysis_data field to travel_history table
ALTER TABLE public.travel_history ADD COLUMN analysis_data JSONB DEFAULT '{}'::jsonb;