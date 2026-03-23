-- FIX FOR INFINITE RECURSION IN BUILDINGS POLICY
-- This redundant policy was querying 'houses' which in turn queries 'buildings', causing a loop.
-- The building table already has a global SELECT policy, so this is safe to drop.

DROP POLICY IF EXISTS "Tenants can view buildings they reside in" ON public.buildings;

-- Ensure the global marketplace policy exists and is correct
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'buildings' 
        AND policyname = 'Buildings are publicly viewable for marketplace'
    ) THEN
        CREATE POLICY "Buildings are publicly viewable for marketplace" 
        ON public.buildings FOR SELECT USING (true);
    END IF;
END $$;
