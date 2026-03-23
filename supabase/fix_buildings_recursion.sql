-- Fix for Infinite Recursion in buildings and houses policies

-- Drop the recursive policies
DROP POLICY IF EXISTS "Tenants can view buildings they reside in" ON public.buildings;
DROP POLICY IF EXISTS "Owners manage houses" ON public.houses;

-- Recreate buildings policy without recursion
-- A tenant can view a building if they are assigned to a house in that building.
-- We use a direct subquery that doesn't trigger the houses policies.
CREATE POLICY "Tenants can view buildings they reside in" ON public.buildings FOR SELECT USING (
    id IN (SELECT building_id FROM public.houses WHERE tenant_id = (auth.uid())::UUID)
);

-- Recreate houses policy without recursion
-- An owner can manage houses if they own the building the house belongs to.
CREATE POLICY "Owners manage houses" ON public.houses FOR ALL USING (
    building_id IN (SELECT id FROM public.buildings WHERE owner_id = (auth.uid())::UUID)
);
