-- Nilayam Property Management - COMPLETE UNIFIED SCHEMA
-- Author: Antigravity (Advanced Database Engineer)
-- This script provides a production-grade, holistic database structure for property management.

-- ==========================================
-- 1. INITIALIZATION & EXTENSIONS
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ==========================================
-- 2. CUSTOM ENUM TYPES
-- ==========================================
-- Use schema-scoped enums for better portability and organization
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('owner', 'tenant', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.property_type AS ENUM (
        'APARTMENT_COMPLEX', 'GATED_COMMUNITY_VILLA', 'INDEPENDENT_HOUSE', 'ROW_HOUSES', 
        'STANDALONE_BUILDING', 'MULTI_STOREY_BUILDING', 'OFFICE_BUILDING', 'RETAIL_SHOWROOM', 
        'SHOPPING_MALL', 'MIXED_USE_COMPLEX', 'WAREHOUSE', 'FACTORY', 'UNIVERSITY_CAMPUS', 
        'SCHOOL_CAMPUS', 'HOSPITAL_COMPLEX', 'HOTEL', 'RESORT', 'PG_HOSTEL', 
        'SERVICED_APARTMENT', 'AGRICULTURAL_LAND', 'COMMERCIAL_PLOT', 'RESIDENTIAL_PLOT',
        'COMMERCIAL'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.maintenance_status AS ENUM ('open', 'in_progress', 'closed', 'resolved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.gate_pass_status AS ENUM ('active', 'expired', 'used', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.poll_status AS ENUM ('active', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.listing_type AS ENUM ('sale', 'rent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded', 'due');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.transaction_type AS ENUM ('income', 'expense');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.announcement_audience AS ENUM ('all_tenants', 'specific_building');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ==========================================
-- 2.5 DATA TYPE HARMONIZATION (Fix uuid = text issues)
-- ==========================================
-- Ensure existing columns are correctly typed as UUID if they were improperly created as text
DO $$ 
DECLARE 
    col_row RECORD;
BEGIN
    FOR col_row IN (
        SELECT table_name, column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND column_name IN ('id', 'owner_id', 'tenant_id', 'building_id', 'house_id', 'target_id', 'sender_id', 'amenity_id', 'payment_id')
        AND data_type = 'text'
        AND table_name NOT IN ('gate_passes') -- exclude specific text identifiers if any
    ) LOOP
        -- Attempt to convert text to UUID, ignoring errors if data is unparseable
        BEGIN
            EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I TYPE UUID USING %I::UUID', col_row.table_name, col_row.column_name, col_row.column_name);
            RAISE NOTICE 'Converted %.% from text to UUID', col_row.table_name, col_row.column_name;
        EXCEPTION WHEN others THEN
            RAISE NOTICE 'Could not convert %.% to UUID, skipping', col_row.table_name, col_row.column_name;
        END;
    END LOOP;
END $$;

-- ==========================================
-- 3. CORE TABLES
-- ==========================================

-- 3.1 Profiles Table (Extends Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role public.user_role, -- Nullable, no default so app forces role selection
    avatar_url TEXT,
    phone_number TEXT,
    bio TEXT,
    subscription_tier TEXT DEFAULT 'basic',
    payment_methods JSONB DEFAULT '{}'::jsonb,
    bank_details JSONB DEFAULT '{}'::jsonb, -- Store BankDetails interface
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3.2 Buildings Table (Gated Communities/Complexes)
CREATE TABLE IF NOT EXISTS public.buildings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    property_type public.property_type NOT NULL,
    cctv_url TEXT,
    images TEXT[] DEFAULT '{}',
    community_features JSONB DEFAULT '{"enable_chat": true, "enable_polls": true, "enable_gate_pass": true, "enable_amenities": true}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3.3 Houses Table (Units/Villas)
CREATE TABLE IF NOT EXISTS public.houses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID REFERENCES public.buildings(id) ON DELETE CASCADE NOT NULL,
    house_number TEXT NOT NULL,
    rent_amount NUMERIC(12,2) DEFAULT 0,
    security_deposit NUMERIC(12,2) DEFAULT 0,
    tenant_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    tenant_name TEXT, -- Cached for performance/legacy
    tenant_phone_number TEXT, -- Cached
    lease_end_date DATE,
    parking_slot TEXT,
    is_listed_on_marketplace BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3.4 Maintenance Requests
CREATE TABLE IF NOT EXISTS public.maintenance_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    house_id UUID REFERENCES public.houses(id) ON DELETE CASCADE NOT NULL,
    tenant_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    description TEXT NOT NULL,
    status public.maintenance_status DEFAULT 'open',
    image_urls TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3.5 Gate Passes
CREATE TABLE IF NOT EXISTS public.gate_passes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    house_id UUID REFERENCES public.houses(id) ON DELETE CASCADE NOT NULL,
    visitor_name TEXT NOT NULL,
    visitor_phone TEXT,
    visitor_type TEXT DEFAULT 'Guest',
    access_code TEXT NOT NULL,
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    status public.gate_pass_status DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3.6 Amenities & Bookings
CREATE TABLE IF NOT EXISTS public.amenities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID REFERENCES public.buildings(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    capacity INTEGER DEFAULT 1,
    open_time TIME DEFAULT '06:00',
    close_time TIME DEFAULT '22:00',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.amenity_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    amenity_id UUID REFERENCES public.amenities(id) ON DELETE CASCADE NOT NULL,
    tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status public.booking_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3.7 Community Features (Polls, Announcements, Chat)
CREATE TABLE IF NOT EXISTS public.polls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID REFERENCES public.buildings(id) ON DELETE CASCADE NOT NULL,
    question TEXT NOT NULL,
    options JSONB NOT NULL, -- Array of {id, text, votes}
    status public.poll_status DEFAULT 'active',
    total_votes INTEGER DEFAULT 0,
    created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    audience public.announcement_audience DEFAULT 'all_tenants',
    target_id UUID, -- building_id if audience is specific_building
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID REFERENCES public.buildings(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    sender_name TEXT,
    sender_role TEXT,
    text TEXT NOT NULL,
    reply_to JSONB, -- {sender_name, text}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3.8 Marketplace Listings
CREATE TABLE IF NOT EXISTS public.listings (
    id BIGSERIAL PRIMARY KEY,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    building_id UUID REFERENCES public.buildings(id) ON DELETE CASCADE NOT NULL,
    house_id UUID REFERENCES public.houses(id) ON DELETE SET NULL,
    listing_type public.listing_type DEFAULT 'rent',
    price NUMERIC(15,2) NOT NULL,
    description TEXT,
    contact_info TEXT,
    image_url TEXT,
    images TEXT[] DEFAULT '{}',
    bedrooms INTEGER,
    bathrooms INTEGER,
    area_sqft NUMERIC(10,2),
    furnishing_status TEXT,
    amenities TEXT[] DEFAULT '{}',
    parking_available BOOLEAN DEFAULT FALSE,
    possession_status TEXT,
    preferred_tenants TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3.9 Financials (Payments & Transactions)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    house_id UUID REFERENCES public.houses(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    status public.payment_status DEFAULT 'pending',
    payment_type TEXT NOT NULL, -- 'rent', 'maintenance', 'security_deposit'
    razorpay_order_id TEXT UNIQUE,
    razorpay_payment_id TEXT UNIQUE,
    razorpay_signature TEXT,
    receipt_url TEXT,
    due_date DATE,
    paid_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    building_id UUID REFERENCES public.buildings(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    category TEXT NOT NULL, -- 'rent', 'tax', 'maintenance', 'utilities'
    amount NUMERIC(15,2) NOT NULL,
    type public.transaction_type NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ==========================================
-- 4. TRIGGERS & FUNCTIONS
-- ==========================================

-- Function to update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('profiles', 'buildings', 'houses', 'maintenance_requests', 'listings', 'payments')
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS tr_set_updated_at ON public.%I', t);
        EXECUTE format('CREATE TRIGGER tr_set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at()', t);
    END LOOP;
END $$;

-- Auth Hook for automated profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role, avatar_url)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        (new.raw_user_meta_data->>'role')::public.user_role, -- Don't default to tenant
        new.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- 5. INDEXES for Performance
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_buildings_owner ON public.buildings(owner_id);
CREATE INDEX IF NOT EXISTS idx_houses_building ON public.houses(building_id);
CREATE INDEX IF NOT EXISTS idx_houses_tenant ON public.houses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_house ON public.maintenance_requests(house_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant ON public.payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_owner ON public.transactions(owner_id);
CREATE INDEX IF NOT EXISTS idx_listings_owner ON public.listings(owner_id);
CREATE INDEX IF NOT EXISTS idx_profiles_name_trgm ON public.profiles USING gin (full_name gin_trgm_ops);

-- ==========================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amenity_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Dynamic Policy Reset
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- 6.1 Profiles Policies
CREATE POLICY "Public profiles are viewable by authenticated users" ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid())::UUID = id);

-- 6.2 Buildings Policies (Owners manage, Tenants in building view)
CREATE POLICY "Owners can manage their buildings" ON public.buildings FOR ALL USING ((auth.uid())::UUID = owner_id);
CREATE POLICY "Tenants can view buildings they reside in" ON public.buildings FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.houses WHERE building_id = public.buildings.id AND tenant_id = (auth.uid())::UUID)
);
-- Global SELECT for Marketplace/Search
CREATE POLICY "Buildings are publicly viewable for marketplace" ON public.buildings FOR SELECT USING (true);

-- 6.3 Houses Policies
CREATE POLICY "Owners manage houses" ON public.houses FOR ALL USING (
    EXISTS (SELECT 1 FROM public.buildings WHERE id = public.houses.building_id AND owner_id = (auth.uid())::UUID)
);
CREATE POLICY "Tenants view their own unit" ON public.houses FOR SELECT USING (tenant_id = (auth.uid())::UUID);
CREATE POLICY "Houses publicly viewable for marketplace" ON public.houses FOR SELECT USING (true);

-- 6.4 Transactions Policies (STRICT OWNER ONLY)
CREATE POLICY "Owners manage their transactions" ON public.transactions FOR ALL USING ((auth.uid())::UUID = owner_id);

-- 6.5 Announcements Policies
CREATE POLICY "Owners create announcements" ON public.announcements FOR INSERT WITH CHECK ((auth.uid())::UUID = owner_id);
CREATE POLICY "View relevant announcements" ON public.announcements FOR SELECT USING (
    audience = 'all_tenants' OR (audience = 'specific_building' AND EXISTS (
        SELECT 1 FROM public.houses WHERE building_id = public.announcements.target_id AND tenant_id = (auth.uid())::UUID
    )) OR (auth.uid())::UUID = owner_id
);

-- 6.6 Chat Policies
CREATE POLICY "Members can chat" ON public.chat_messages FOR ALL USING (
    EXISTS (SELECT 1 FROM public.houses WHERE building_id = public.chat_messages.building_id AND tenant_id = (auth.uid())::UUID) OR
    EXISTS (SELECT 1 FROM public.buildings WHERE id = public.chat_messages.building_id AND owner_id = (auth.uid())::UUID)
);

-- ==========================================
-- 7. MARKETPLACE VIEW (Simplified RPC replacement)
-- ==========================================
CREATE OR REPLACE VIEW public.marketplace_view AS
SELECT 
    l.*,
    b.name AS building_name,
    b.address,
    b.property_type
FROM public.listings l
JOIN public.buildings b ON (l.building_id)::UUID = (b.id)::UUID;

GRANT SELECT ON public.marketplace_view TO authenticated, anon;
