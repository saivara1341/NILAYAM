-- DEFINITIVE FIX FOR ROLE SELECTION ISSUE
-- This script performs a "Hard Reset" on the profiles table and role types

-- 1. DROP EVERYTHING RELATED (Start fresh)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS set_timestamp ON profiles;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS trigger_set_timestamp();

-- 2. RESET THE ROLE ENUM (Remove invalid defaults and values)
-- We rename and recreate to be absolutely sure no cached constraints remain
ALTER TABLE IF EXISTS public.profiles DROP COLUMN IF EXISTS role CASCADE;
ALTER TABLE IF EXISTS public.profiles DROP COLUMN IF EXISTS user_role CASCADE;

DROP TYPE IF EXISTS public.user_role CASCADE;
CREATE TYPE public.user_role AS ENUM ('owner', 'tenant');

-- 3. ENSURE PROFILES TABLE IS CORRECT
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS role public.user_role DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'basic',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

-- 4. RECREATE TRIGGER FUNCTIONS (Safer and more robust)
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, subscription_tier)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    'basic'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RE-APPLY TRIGGERS
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

CREATE TRIGGER set_timestamp 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

-- 6. BACKFILL & CLEANSE (Crucial for existing stuck users)
-- This fixes users who have a record but no profile data
INSERT INTO public.profiles (id, full_name, subscription_tier)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)), 'basic'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- Force all invalid roles to NULL so they are prompted to select again
UPDATE public.profiles SET role = NULL WHERE role IS NOT NULL AND role NOT IN ('owner', 'tenant');

-- 7. ENABLE RLS (Security best practice)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
