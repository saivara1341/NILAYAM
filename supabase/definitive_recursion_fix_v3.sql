-- DEFINITIVE RLS INFINITE RECURSION FIX (v3)
-- This script nukes all building/house policies and recreates them
-- using a non-recursive, safe structure.

-- 1. NUKE ALL EXISTING POLICIES ON THESE TABLES
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' 
    AND (tablename = 'buildings' OR tablename = 'houses')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- 2. BUILDINGS TABLE POLICIES (No recursion)
-- Enable RLS
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;

-- Global Read Access (Breaks the loop: Anyone can see buildings, which is used by many other checks)
CREATE POLICY "Buildings Selection (Public)" ON public.buildings FOR SELECT USING (true);

-- Owner Management
CREATE POLICY "Buildings Full Access (Owner)" ON public.buildings FOR ALL USING (owner_id = auth.uid());


-- 3. HOUSES TABLE POLICIES (No recursion)
-- Enable RLS
ALTER TABLE public.houses ENABLE ROW LEVEL SECURITY;

-- Global Read Access (Useful for marketplace)
CREATE POLICY "Houses Selection (Public)" ON public.houses FOR SELECT USING (true);

-- Owner Management (Using fixed building references)
CREATE POLICY "Houses Full Access (Owner)" ON public.houses FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.buildings 
        WHERE id = public.houses.building_id 
        AND owner_id = auth.uid()
    )
);

-- Tenant Read Access (Direct check)
CREATE POLICY "Houses Selection (Tenant)" ON public.houses FOR SELECT USING (tenant_id = auth.uid());


-- 4. VERIFY OTHER POTENTIAL RECURSIVE TABLES
-- Drop redundant tenant building view policy if it exists elsewhere
DROP POLICY IF EXISTS "Tenants can view buildings they reside in" ON public.buildings;

-- SUCCESS
SELECT 'RLS Policies reset and recursion loop broken successfully.' as result;
