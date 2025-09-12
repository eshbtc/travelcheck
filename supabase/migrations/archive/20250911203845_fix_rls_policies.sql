-- Fix RLS policy recursion by dropping and recreating with proper admin check

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;

DROP POLICY IF EXISTS "Users can manage own email accounts" ON public.email_accounts;
DROP POLICY IF EXISTS "Admins can view all email accounts" ON public.email_accounts;

DROP POLICY IF EXISTS "Users can manage own flight emails" ON public.flight_emails;
DROP POLICY IF EXISTS "Admins can view all flight emails" ON public.flight_emails;

DROP POLICY IF EXISTS "Users can manage own travel history" ON public.travel_history;
DROP POLICY IF EXISTS "Admins can view all travel history" ON public.travel_history;

DROP POLICY IF EXISTS "Users can manage own passport scans" ON public.passport_scans;
DROP POLICY IF EXISTS "Admins can view all passport scans" ON public.passport_scans;

DROP POLICY IF EXISTS "Users can manage own travel entries" ON public.travel_entries;
DROP POLICY IF EXISTS "Admins can view all travel entries" ON public.travel_entries;

DROP POLICY IF EXISTS "Users can manage own reports" ON public.reports;
DROP POLICY IF EXISTS "Admins can view all reports" ON public.reports;

DROP POLICY IF EXISTS "Users can manage own duplicates" ON public.duplicate_groups;
DROP POLICY IF EXISTS "Users can view duplicate items for own groups" ON public.duplicate_items;

-- Create simplified policies without admin recursion

-- Users policies - use auth.jwt() to check role from JWT claims
CREATE POLICY "Users can view own data" ON public.users
    FOR ALL USING (
        auth.uid() = id OR 
        (auth.jwt() ->> 'role')::text = 'admin'
    );

-- Email accounts policies
CREATE POLICY "Users can manage own email accounts" ON public.email_accounts
    FOR ALL USING (
        auth.uid() = user_id OR 
        (auth.jwt() ->> 'role')::text = 'admin'
    );

-- Flight emails policies
CREATE POLICY "Users can manage own flight emails" ON public.flight_emails
    FOR ALL USING (
        auth.uid() = user_id OR 
        (auth.jwt() ->> 'role')::text = 'admin'
    );

-- Travel history policies
CREATE POLICY "Users can manage own travel history" ON public.travel_history
    FOR ALL USING (
        auth.uid() = user_id OR 
        (auth.jwt() ->> 'role')::text = 'admin'
    );

-- Passport scans policies
CREATE POLICY "Users can manage own passport scans" ON public.passport_scans
    FOR ALL USING (
        auth.uid() = user_id OR 
        (auth.jwt() ->> 'role')::text = 'admin'
    );

-- Travel entries policies
CREATE POLICY "Users can manage own travel entries" ON public.travel_entries
    FOR ALL USING (
        auth.uid() = user_id OR 
        (auth.jwt() ->> 'role')::text = 'admin'
    );

-- Reports policies
CREATE POLICY "Users can manage own reports" ON public.reports
    FOR ALL USING (
        auth.uid() = user_id OR 
        is_public = true OR 
        (auth.jwt() ->> 'role')::text = 'admin'
    );

-- Duplicate detection policies
CREATE POLICY "Users can manage own duplicates" ON public.duplicate_groups
    FOR ALL USING (
        auth.uid() = user_id OR 
        (auth.jwt() ->> 'role')::text = 'admin'
    );

CREATE POLICY "Users can view duplicate items for own groups" ON public.duplicate_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.duplicate_groups dg
            WHERE dg.id = group_id 
            AND (dg.user_id = auth.uid() OR (auth.jwt() ->> 'role')::text = 'admin')
        )
    );