-- Payment proof storage for manual tenant payment verification
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
