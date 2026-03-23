-- Nilayam Property Management Schema
-- Supporting Gated Communities & Apartments

-- ==========================================
-- CUSTOM ENUM TYPES
-- ==========================================
-- Enums enforce data integrity at the database kernel level
CREATE TYPE user_role AS ENUM ('owner', 'tenant');
CREATE TYPE property_type AS ENUM (
    'APARTMENT_COMPLEX', 'GATED_COMMUNITY_VILLA', 'INDEPENDENT_HOUSE', 'ROW_HOUSES', 
    'STANDALONE_BUILDING', 'MULTI_STOREY_BUILDING', 'OFFICE_BUILDING', 'RETAIL_SHOWROOM', 
    'SHOPPING_MALL', 'MIXED_USE_COMPLEX', 'WAREHOUSE', 'FACTORY', 'UNIVERSITY_CAMPUS', 
    'SCHOOL_CAMPUS', 'HOSPITAL_COMPLEX', 'HOTEL', 'RESORT', 'PG_HOSTEL', 
    'SERVICED_APARTMENT', 'AGRICULTURAL_LAND', 'COMMERCIAL_PLOT', 'RESIDENTIAL_PLOT',
    'COMMERCIAL'
);
CREATE TYPE maintenance_status AS ENUM ('open', 'in_progress', 'closed');
CREATE TYPE gate_pass_status AS ENUM ('active', 'expired', 'used');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled');
CREATE TYPE poll_status AS ENUM ('active', 'closed');

-- Profiles: Users of the system (Owners, Tenants)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role user_role,
    avatar_url TEXT,
    phone_number TEXT,
    bio TEXT,
    subscription_tier TEXT DEFAULT 'basic',
    payment_methods JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Buildings: Represents a Gated Community or an Apartment Complex
CREATE TABLE IF NOT EXISTS buildings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    property_type property_type NOT NULL,
    cctv_url TEXT,
    images TEXT[], -- Array of image URLs
    community_features JSONB DEFAULT '{"enable_chat": true, "enable_polls": true, "enable_gate_pass": true, "enable_amenities": true}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Houses: Represents a Unit (Villa or Apartment Flat)
CREATE TABLE IF NOT EXISTS houses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id UUID REFERENCES buildings(id) ON DELETE CASCADE NOT NULL,
    house_number TEXT NOT NULL,
    rent_amount NUMERIC DEFAULT 0,
    security_deposit NUMERIC DEFAULT 0,
    tenant_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    tenant_name TEXT, -- Legacy support or caching
    tenant_phone_number TEXT,
    lease_end_date DATE,
    parking_slot TEXT,
    is_listed_on_marketplace BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Maintenance Requests
CREATE TABLE IF NOT EXISTS maintenance_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    house_id UUID REFERENCES houses(id) ON DELETE CASCADE NOT NULL,
    tenant_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    description TEXT NOT NULL,
    status maintenance_status DEFAULT 'open',
    image_urls TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Gate Passes: For Gated Communities
CREATE TABLE IF NOT EXISTS gate_passes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    house_id UUID REFERENCES houses(id) ON DELETE CASCADE NOT NULL,
    visitor_name TEXT NOT NULL,
    visitor_phone TEXT,
    access_code TEXT NOT NULL,
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    status gate_pass_status DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Amenities: For Community Facilities
CREATE TABLE IF NOT EXISTS amenities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id UUID REFERENCES buildings(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    capacity INTEGER DEFAULT 1,
    open_time TIME,
    close_time TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Amenity Bookings
CREATE TABLE IF NOT EXISTS amenity_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amenity_id UUID REFERENCES amenities(id) ON DELETE CASCADE NOT NULL,
    tenant_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status booking_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Polls: For Community Voting
CREATE TABLE IF NOT EXISTS polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id UUID REFERENCES buildings(id) ON DELETE CASCADE NOT NULL,
    question TEXT NOT NULL,
    options JSONB NOT NULL, -- [{id, text, votes}]
    status poll_status DEFAULT 'active',
    created_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Marketplace Listings
CREATE TABLE IF NOT EXISTS listings (
    id SERIAL PRIMARY KEY,
    owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    building_id UUID REFERENCES buildings(id) ON DELETE CASCADE NOT NULL,
    house_id UUID REFERENCES houses(id) ON DELETE SET NULL,
    listing_type TEXT NOT NULL,
    price NUMERIC NOT NULL,
    description TEXT,
    contact_info TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- PAYMENTS (RAZORPAY INTEGRATION)
-- ==========================================
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    house_id UUID REFERENCES houses(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'INR',
    status payment_status DEFAULT 'pending',
    payment_type TEXT NOT NULL, -- 'rent', 'maintenance', 'security_deposit'
    razorpay_order_id TEXT UNIQUE,
    razorpay_payment_id TEXT UNIQUE,
    razorpay_signature TEXT,
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view their own payments"
  ON payments FOR SELECT USING (auth.uid() = tenant_id);

CREATE POLICY "Owners can view payments for their properties"
  ON payments FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM houses h 
      JOIN buildings b ON h.building_id = b.id 
      WHERE h.id = payments.house_id AND b.owner_id = auth.uid()
    )
  );

CREATE POLICY "Tenants can insert their own payments"
  ON payments FOR INSERT WITH CHECK (auth.uid() = tenant_id);

-- System/Service Role will handle updates (or tenants can update their own pending payments via webhook ideally)
CREATE POLICY "Tenants can update their own pending payments"
  ON payments FOR UPDATE USING (auth.uid() = tenant_id AND status = 'pending');

CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_house_id ON payments(house_id);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order ON payments(razorpay_order_id);

-- ==========================================
-- REMOTE PROCEDURE CALLS (RPC)
-- ==========================================
-- Function required by the Marketplace dashboard
CREATE OR REPLACE FUNCTION get_all_marketplace_listings()
RETURNS TABLE (
    id INT,
    building_name TEXT,
    address TEXT,
    property_type TEXT,
    house_number TEXT,
    listing_type TEXT,
    price NUMERIC,
    description TEXT,
    contact_info TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        l.id,
        b.name AS building_name,
        b.address,
        b.property_type::TEXT,
        h.house_number,
        l.listing_type,
        l.price,
        l.description,
        l.contact_info,
        l.image_url,
        l.created_at
    FROM listings l
    JOIN buildings b ON l.building_id = b.id
    LEFT JOIN houses h ON l.house_id = h.id
    ORDER BY l.created_at DESC;
$$;


-- Custom function to automatically update 'updated_at' columns
-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Automated profile creation trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply Profile Creation Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Apply Updated At Trigger
DROP TRIGGER IF EXISTS set_timestamp ON profiles;
CREATE TRIGGER set_timestamp BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

-- Repeat for others if updated_at is added later; profiles is generally the most updated

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE amenity_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- DROP EXISTING POLICIES TO PREVENT INFINITE RECURSION
-- ==========================================
-- This dynamically drops all legacy policies from the public schema
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END
$$;

-- ==========================================
-- PROFILES POLICIES
-- ==========================================
CREATE POLICY "Public profiles are viewable by everyone."
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile."
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile."
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- ==========================================
-- BUILDINGS POLICIES
-- ==========================================
CREATE POLICY "Buildings are viewable by everyone."
  ON buildings FOR SELECT USING (true);

CREATE POLICY "Owners can insert their buildings."
  ON buildings FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their buildings."
  ON buildings FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their buildings."
  ON buildings FOR DELETE USING (auth.uid() = owner_id);

-- ==========================================
-- HOUSES (UNITS) POLICIES
-- ==========================================
CREATE POLICY "Houses are viewable by everyone"
  ON houses FOR SELECT USING (true);

CREATE POLICY "Owners can manage houses in their buildings"
  ON houses FOR ALL USING (
    EXISTS (
      SELECT 1 FROM buildings WHERE id = houses.building_id AND owner_id = auth.uid()
    )
  );

-- ==========================================
-- MAINTENANCE REQUESTS POLICIES
-- ==========================================
CREATE POLICY "Tenants can view own maintenance reqs"
  ON maintenance_requests FOR SELECT USING (auth.uid() = tenant_id);

CREATE POLICY "Owners can view maintenance reqs for their buildings"
  ON maintenance_requests FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Tenants can insert maintenance reqs"
  ON maintenance_requests FOR INSERT WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "Owners can update maintenance reqs"
  ON maintenance_requests FOR UPDATE USING (auth.uid() = owner_id);

-- ==========================================
-- MARKETPLACE LISTINGS POLICIES
-- ==========================================
CREATE POLICY "Listings are viewable by everyone."
  ON listings FOR SELECT USING (true);

CREATE POLICY "Owners can insert listings"
  ON listings FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update own listings"
  ON listings FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete own listings"
  ON listings FOR DELETE USING (auth.uid() = owner_id);

-- ==========================================
-- B-TREE INDEXES FOR FOREIGN KEYS (SCALABILITY)
-- ==========================================
-- These ensure that looking up a user's properties takes O(log N) instead of O(N)
CREATE INDEX IF NOT EXISTS idx_buildings_owner_id ON buildings(owner_id);
CREATE INDEX IF NOT EXISTS idx_houses_building_id ON houses(building_id);
CREATE INDEX IF NOT EXISTS idx_houses_tenant_id ON houses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_house_id ON maintenance_requests(house_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_tenant_id ON maintenance_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_owner_id ON maintenance_requests(owner_id);
CREATE INDEX IF NOT EXISTS idx_gate_passes_house_id ON gate_passes(house_id);
CREATE INDEX IF NOT EXISTS idx_amenities_building_id ON amenities(building_id);
CREATE INDEX IF NOT EXISTS idx_bookings_amenity_id ON amenity_bookings(amenity_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_id ON amenity_bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_polls_building_id ON polls(building_id);
CREATE INDEX IF NOT EXISTS idx_listings_owner_id ON listings(owner_id);
CREATE INDEX IF NOT EXISTS idx_listings_house_id ON listings(house_id);

-- ==========================================
-- GIN INDEXES FOR TEXT SEARCH (PERFORMANCE)
-- ==========================================
-- Enables blazingly fast searching for users by name
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_profiles_name_gin ON profiles USING GIN (full_name gin_trgm_ops);

-- ==========================================
-- STORAGE POLICIES (ZERO-TRUST SECURITY)
-- ==========================================
-- Ensure tenants cannot view other tenants' uploaded documents or images.
-- (Assumes you have 'tenant_documents' and 'property_images' buckets created in Supabase Storage)

-- Note: We do NOT use ALTER TABLE or DROP POLICY on `storage.objects` here 
-- because it causes "must be owner of table objects" error in Supabase SQL editor.

-- Property Images (Publicly viewable, Owners can upload/delete)
DROP POLICY IF EXISTS "nilayam_property_images_select_v1" ON storage.objects;
CREATE POLICY "nilayam_property_images_select_v1" 
  ON storage.objects FOR SELECT USING (bucket_id = 'property_images');

DROP POLICY IF EXISTS "nilayam_property_images_insert_v1" ON storage.objects;
CREATE POLICY "nilayam_property_images_insert_v1" 
  ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'property_images' AND auth.role() = 'authenticated'
  );

-- Tenant Documents (Private to the owner/tenant)
-- We use the folder name as the user ID for simplicity in this baseline
DROP POLICY IF EXISTS "nilayam_tenant_documents_select_v1" ON storage.objects;
CREATE POLICY "nilayam_tenant_documents_select_v1" 
  ON storage.objects FOR SELECT USING (
    bucket_id = 'tenant_documents' AND (auth.uid()::text = (storage.foldername(name))[1])
  );

DROP POLICY IF EXISTS "nilayam_tenant_documents_insert_v1" ON storage.objects;
CREATE POLICY "nilayam_tenant_documents_insert_v1" 
  ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'tenant_documents' AND (auth.uid()::text = (storage.foldername(name))[1])
  );

-- ==========================================
-- MARKETPLACE FUNCTIONS
-- ==========================================
CREATE OR REPLACE FUNCTION get_all_marketplace_listings()
RETURNS TABLE (
    id BIGINT,
    created_at TIMESTAMPTZ,
    owner_id UUID,
    listing_type listing_type,
    price NUMERIC,
    description TEXT,
    contact_info TEXT,
    image_url TEXT,
    building_name TEXT,
    address TEXT,
    property_type property_type
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id, l.created_at, l.owner_id, l.listing_type, 
        l.price, l.description, l.contact_info, l.image_url,
        b.name as building_name, b.address, b.property_type
    FROM listings l
    JOIN buildings b ON l.building_id = b.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

