-- 1. Add missing updated_at column to profiles if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='updated_at') THEN
        ALTER TABLE profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
    END IF;
END $$;

-- 2. DANGER ZONE: Fix column name mismatch and invalid defaults
-- If a column named 'user_role' exists (likely from a legacy script), rename it to 'role'
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='user_role') THEN
        ALTER TABLE profiles RENAME COLUMN user_role TO role;
    END IF;
END $$;

-- Ensure the 'role' column has NO default value (Postgres defaults to NULL for Enums)
-- Some legacy scripts might have set it to '' (empty string), which causes the "invalid input value" error.
ALTER TABLE profiles ALTER COLUMN role DROP DEFAULT;
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT NULL;

-- 2.b Cleanse existing bad data
-- Convert any empty strings or invalid values to NULL so the UI can prompt for selection again
UPDATE profiles SET role = NULL WHERE role::text = '' OR role::text NOT IN ('owner', 'tenant');

-- 2. Repair/Create the trigger function for updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Repair/Create the automated profile handler
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Re-apply Triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

DROP TRIGGER IF EXISTS set_timestamp ON profiles;
CREATE TRIGGER set_timestamp BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

-- 5. Backfill any missing profiles for current users
INSERT INTO public.profiles (id, full_name)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1))
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;
