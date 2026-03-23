-- Fix Infinite Recursion in RLS by removing cyclic dependencies

-- 1. Drop the policy that causes buildings to query houses
DROP POLICY IF EXISTS "Tenants can view buildings they reside in" ON public.buildings;

-- (The building table already has a SELECT USING (true) policy, so tenants can still see buildings, making the above policy redundant and dangerous).

-- 2. Drop and recreate the Houses policy for owners, which will now safely query buildings without causing a loop.
DROP POLICY IF EXISTS "Owners manage houses" ON public.houses;
CREATE POLICY "Owners manage houses" ON public.houses FOR ALL USING (
    EXISTS (SELECT 1 FROM public.buildings WHERE id = public.houses.building_id AND owner_id = (auth.uid())::UUID)
);
