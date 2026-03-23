-- NILAYAM PROPERTY MANAGEMENT - CASCADE CLEAN START SETUP
-- This script WIPES existing tables and recreates them with the fixed schema.
-- This version uses CASCADE to handle inter-table dependencies (like recursive policies).
-- RUN THIS IN YOUR SUPABASE SQL EDITOR.

-- 1. INITIALIZATION & CLEANUP
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Break all RLS dependencies first
DO $$ 
DECLARE 
    r RECORD; 
BEGIN 
    FOR r IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public' 
    LOOP 
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename); 
    END LOOP; 
END $$;

-- Drop everyone with CASCADE to clear dependent views/policies
DROP VIEW IF EXISTS public.marketplace_view CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.listings CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.announcements CASCADE;
DROP TABLE IF EXISTS public.polls CASCADE;
DROP TABLE IF EXISTS public.amenity_bookings CASCADE;
DROP TABLE IF EXISTS public.amenities CASCADE;
DROP TABLE IF EXISTS public.gate_passes CASCADE;
DROP TABLE IF EXISTS public.maintenance_requests CASCADE;
DROP TABLE IF EXISTS public.houses CASCADE;
DROP TABLE IF EXISTS public.buildings CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. ENUMS
DO $$ BEGIN CREATE TYPE public.user_role AS ENUM ('owner', 'tenant', 'admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.property_type AS ENUM ('APARTMENT_COMPLEX', 'GATED_COMMUNITY_VILLA', 'INDEPENDENT_HOUSE', 'ROW_HOUSES', 'STANDALONE_BUILDING', 'MULTI_STOREY_BUILDING', 'OFFICE_BUILDING', 'RETAIL_SHOWROOM', 'SHOPPING_MALL', 'MIXED_USE_COMPLEX', 'WAREHOUSE', 'FACTORY', 'UNIVERSITY_CAMPUS', 'SCHOOL_CAMPUS', 'HOSPITAL_COMPLEX', 'HOTEL', 'RESORT', 'PG_HOSTEL', 'SERVICED_APARTMENT', 'AGRICULTURAL_LAND', 'COMMERCIAL_PLOT', 'RESIDENTIAL_PLOT', 'COMMERCIAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.maintenance_status AS ENUM ('open', 'in_progress', 'closed', 'resolved'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.gate_pass_status AS ENUM ('active', 'expired', 'used', 'cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.poll_status AS ENUM ('active', 'closed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.listing_type AS ENUM ('sale', 'rent'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded', 'due'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.transaction_type AS ENUM ('income', 'expense'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.announcement_audience AS ENUM ('all_tenants', 'specific_building'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. CORE TABLES
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role public.user_role,
    avatar_url TEXT,
    phone_number TEXT,
    bio TEXT,
    subscription_tier TEXT DEFAULT 'basic',
    is_verified BOOLEAN DEFAULT FALSE,
    id_proof_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE public.buildings (
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

CREATE TABLE public.houses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID REFERENCES public.buildings(id) ON DELETE CASCADE NOT NULL,
    house_number TEXT NOT NULL,
    rent_amount NUMERIC(12,2) DEFAULT 0,
    security_deposit NUMERIC(12,2) DEFAULT 0,
    tenant_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    tenant_name TEXT,
    tenant_phone_number TEXT,
    lease_end_date DATE,
    parking_slot TEXT,
    is_listed_on_marketplace BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE public.maintenance_requests (
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

CREATE TABLE public.gate_passes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    house_id UUID REFERENCES public.houses(id) ON DELETE CASCADE NOT NULL,
    building_id UUID REFERENCES public.buildings(id) ON DELETE CASCADE,
    visitor_name TEXT NOT NULL,
    visitor_phone TEXT,
    visitor_type TEXT DEFAULT 'Guest',
    access_code TEXT NOT NULL,
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    status public.gate_pass_status DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE public.amenities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID REFERENCES public.buildings(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    capacity INTEGER DEFAULT 1,
    open_time TIME DEFAULT '06:00',
    close_time TIME DEFAULT '22:00',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE public.amenity_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    amenity_id UUID REFERENCES public.amenities(id) ON DELETE CASCADE NOT NULL,
    tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status public.booking_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE public.polls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID REFERENCES public.buildings(id) ON DELETE CASCADE NOT NULL,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    status public.poll_status DEFAULT 'active',
    total_votes INTEGER DEFAULT 0,
    created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE public.announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    audience public.announcement_audience DEFAULT 'all_tenants',
    target_id UUID,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID REFERENCES public.buildings(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    sender_name TEXT,
    sender_role TEXT,
    text TEXT NOT NULL,
    reply_to JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE public.listings (
    id BIGSERIAL PRIMARY KEY,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    building_id UUID REFERENCES public.buildings(id) ON DELETE CASCADE NOT NULL,
    house_id UUID REFERENCES public.houses(id) ON DELETE SET NULL,
    listing_type public.listing_type DEFAULT 'rent',
    price NUMERIC(15,2) NOT NULL,
    description TEXT,
    contact_info TEXT,
    images TEXT[] DEFAULT '{}',
    bedrooms INTEGER,
    bathrooms INTEGER,
    area_sqft NUMERIC(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    house_id UUID REFERENCES public.houses(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    status public.payment_status DEFAULT 'pending',
    payment_type TEXT NOT NULL,
    razorpay_order_id TEXT UNIQUE,
    razorpay_payment_id TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    building_id UUID REFERENCES public.buildings(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    type public.transaction_type NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 4. TRIGGERS
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DO $$ DECLARE t text; BEGIN FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('profiles', 'buildings', 'houses', 'maintenance_requests', 'listings', 'payments') LOOP EXECUTE format('DROP TRIGGER IF EXISTS tr_set_updated_at ON public.%I', t); EXECUTE format('CREATE TRIGGER tr_set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at()', t); END LOOP; END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$ BEGIN INSERT INTO public.profiles (id, full_name, role) VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), (new.raw_user_meta_data->>'role')::public.user_role) ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role; RETURN new; END; $$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. ROW LEVEL SECURITY (RLS)
-- Enable RLS on all tables
DO $$ DECLARE t text; BEGIN FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' LOOP EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t); END LOOP; END $$;

-- Policies (NON-RECURSIVE)
CREATE POLICY "Profiles SELECT" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Profiles UPDATE" ON public.profiles FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Buildings SELECT (Public)" ON public.buildings FOR SELECT USING (true);
CREATE POLICY "Buildings ALL (Owner)" ON public.buildings FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "Houses SELECT (Public)" ON public.houses FOR SELECT USING (true);
CREATE POLICY "Houses ALL (Owner)" ON public.houses FOR ALL USING (EXISTS (SELECT 1 FROM public.buildings b WHERE b.id = building_id AND b.owner_id = auth.uid()));

CREATE POLICY "Community SELECT (Public)" ON public.amenities FOR SELECT USING (true);
CREATE POLICY "Polls SELECT (Public)" ON public.polls FOR SELECT USING (true);
CREATE POLICY "Chat ALL (Member)" ON public.chat_messages FOR ALL USING (true);
CREATE POLICY "Announcements SELECT (Public)" ON public.announcements FOR SELECT USING (true);

-- 6. VIEWS
CREATE OR REPLACE VIEW public.marketplace_view AS SELECT l.*, b.name AS building_name, b.address, b.property_type FROM public.listings l JOIN public.buildings b ON l.building_id = b.id;
GRANT SELECT ON public.marketplace_view TO authenticated, anon;

-- Storage Bucket (Ensures bucket exists for ID proofs)
INSERT INTO storage.buckets (id, name, public) VALUES ('id-proofs', 'id-proofs', false) ON CONFLICT (id) DO NOTHING;

SELECT 'Cascade Clean Start applied successfully!' as status;
