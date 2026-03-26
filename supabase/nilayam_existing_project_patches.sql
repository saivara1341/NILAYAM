-- Additional safe patches for existing Nilayam projects
-- These are appended after app_repair_all_features.sql

-- Normalize legacy profile role column/defaults if this project came from older scripts.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'user_role'
    ) THEN
        ALTER TABLE public.profiles RENAME COLUMN user_role TO role;
    END IF;
EXCEPTION WHEN undefined_table THEN
    NULL;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
    ) THEN
        ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;
        ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT NULL;
        UPDATE public.profiles
        SET role = NULL
        WHERE role::text = '' OR role::text NOT IN ('owner', 'tenant', 'admin');
    END IF;
EXCEPTION WHEN undefined_table THEN
    NULL;
END $$;

-- Backfill missing profiles for existing auth users without replacing the newer trigger/function.
INSERT INTO public.profiles (id, full_name, avatar_url)
SELECT
    u.id,
    COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
    u.raw_user_meta_data->>'avatar_url'
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- Manual payment proof storage used by tenant uploads.
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS receipt_url TEXT;

DROP POLICY IF EXISTS "tenants_upload_payment_proofs_v1" ON storage.objects;
CREATE POLICY "tenants_upload_payment_proofs_v1"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'payment-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "tenants_view_own_payment_proofs_v1" ON storage.objects;
CREATE POLICY "tenants_view_own_payment_proofs_v1"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'payment-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "owners_view_payment_proofs_v1" ON storage.objects;
CREATE POLICY "owners_view_payment_proofs_v1"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'payment-proofs'
);

-- Extra indexes for the current UI query patterns.
CREATE INDEX IF NOT EXISTS idx_houses_tenant_name ON public.houses(tenant_name);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON public.maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_owner ON public.maintenance_requests(owner_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_chat_building ON public.chat_messages(building_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gate_passes_house ON public.gate_passes(house_id);
CREATE INDEX IF NOT EXISTS idx_buildings_name_trgm ON public.buildings USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_houses_number_trgm ON public.houses USING gin (house_number gin_trgm_ops);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

SELECT 'Nilayam complete existing-project setup finished successfully' AS status;
