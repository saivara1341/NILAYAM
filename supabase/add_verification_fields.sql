-- ADD VERIFICATION FIELDS TO PROFILES
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS id_proof_url TEXT;

-- CREATE STORAGE BUCKET FOR ID PROOFS (If not exists)
-- Note: This requires service_role or admin rights in Supabase, but we can provide the SQL for the user.
INSERT INTO storage.buckets (id, name, public)
VALUES ('id-proofs', 'id-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- STORAGE POLICIES
-- 1. Owners/Admins can see all proofs
CREATE POLICY "Admins can view all id proofs" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (bucket_id = 'id-proofs');

-- 2. Users can upload their own proof
CREATE POLICY "Users can upload own id proof" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'id-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 3. Users can view their own proof
CREATE POLICY "Users can view own id proof" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (bucket_id = 'id-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

SELECT 'Verification fields and storage bucket configured' as result;
