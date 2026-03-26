-- Nilayam COMPLETE Supabase SQL for EXISTING projects
-- Safe for existing projects: non-destructive, idempotent, and aligned to the current app.
-- Run this whole file once in the Supabase SQL Editor.
-- Nilayam app repair script
-- Run this once in the Supabase SQL editor for an existing project.
-- It is idempotent and aims to align the database/storage with the current app code.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

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

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role public.user_role,
    avatar_url TEXT,
    phone_number TEXT,
    bio TEXT,
    subscription_tier TEXT DEFAULT 'basic',
    payment_methods JSONB DEFAULT '{}'::jsonb,
    bank_details JSONB DEFAULT '{}'::jsonb,
    is_verified BOOLEAN DEFAULT FALSE,
    id_proof_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.buildings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    property_type public.property_type,
    cctv_url TEXT,
    images TEXT[] DEFAULT '{}',
    google_map_url TEXT,
    threed_model_url TEXT,
    panorama_url TEXT,
    coordinates JSONB,
    community_features JSONB DEFAULT '{"enable_chat": true, "enable_polls": true, "enable_gate_pass": true, "enable_amenities": true}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.houses (
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
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.maintenance_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    house_id UUID REFERENCES public.houses(id) ON DELETE CASCADE NOT NULL,
    tenant_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    description TEXT NOT NULL,
    status public.maintenance_status DEFAULT 'open',
    image_urls TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.gate_passes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID REFERENCES public.buildings(id) ON DELETE CASCADE,
    house_id UUID REFERENCES public.houses(id) ON DELETE CASCADE,
    visitor_name TEXT NOT NULL,
    visitor_phone TEXT,
    visitor_type TEXT DEFAULT 'Guest',
    access_code TEXT NOT NULL,
    valid_until TIMESTAMPTZ NOT NULL,
    status public.gate_pass_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.amenities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID REFERENCES public.buildings(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    capacity INTEGER DEFAULT 1,
    open_time TIME DEFAULT '06:00',
    close_time TIME DEFAULT '22:00',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.amenity_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    amenity_id UUID REFERENCES public.amenities(id) ON DELETE CASCADE NOT NULL,
    tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status public.booking_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.polls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID REFERENCES public.buildings(id) ON DELETE CASCADE NOT NULL,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    status public.poll_status DEFAULT 'active',
    total_votes INTEGER DEFAULT 0,
    created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    audience public.announcement_audience DEFAULT 'all_tenants',
    target_id UUID,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID REFERENCES public.buildings(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    sender_name TEXT,
    sender_role TEXT,
    text TEXT NOT NULL,
    reply_to JSONB,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

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
    google_map_url TEXT,
    threed_model_url TEXT,
    panorama_url TEXT,
    coordinates JSONB,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    house_id UUID REFERENCES public.houses(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    status public.payment_status DEFAULT 'pending',
    payment_type TEXT NOT NULL,
    razorpay_order_id TEXT UNIQUE,
    razorpay_payment_id TEXT UNIQUE,
    razorpay_signature TEXT,
    receipt_url TEXT,
    due_date DATE,
    paid_date DATE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    building_id UUID REFERENCES public.buildings(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    type public.transaction_type NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.service_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    location TEXT NOT NULL,
    rating NUMERIC(3,2) DEFAULT 0,
    jobs_completed INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    description TEXT,
    availability TEXT DEFAULT 'Available',
    catalogs JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.service_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID REFERENCES public.service_providers(id) ON DELETE CASCADE NOT NULL,
    reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewer_name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id_proof_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS payment_methods JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_details JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS google_map_url TEXT;
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS threed_model_url TEXT;
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS panorama_url TEXT;
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS coordinates JSONB;
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS community_features JSONB DEFAULT '{"enable_chat": true, "enable_polls": true, "enable_gate_pass": true, "enable_amenities": true}'::jsonb;
ALTER TABLE public.houses ADD COLUMN IF NOT EXISTS security_deposit NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.houses ADD COLUMN IF NOT EXISTS parking_slot TEXT;
ALTER TABLE public.houses ADD COLUMN IF NOT EXISTS is_listed_on_marketplace BOOLEAN DEFAULT FALSE;
ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS bedrooms INTEGER;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS bathrooms INTEGER;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS area_sqft NUMERIC(10,2);
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS furnishing_status TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS amenities TEXT[] DEFAULT '{}';
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS parking_available BOOLEAN DEFAULT FALSE;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS possession_status TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS preferred_tenants TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS google_map_url TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS threed_model_url TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS panorama_url TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS coordinates JSONB;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS paid_date DATE;
ALTER TABLE public.service_providers ADD COLUMN IF NOT EXISTS catalogs JSONB DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    t text;
BEGIN
    FOR t IN
        SELECT unnest(ARRAY['profiles', 'buildings', 'houses', 'maintenance_requests', 'listings', 'payments', 'service_providers'])
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS tr_set_updated_at_%I ON public.%I', t, t);
        EXECUTE format('CREATE TRIGGER tr_set_updated_at_%I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at()', t, t);
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role, avatar_url)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        NULLIF(new.raw_user_meta_data->>'role', '')::public.user_role,
        new.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url);
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

CREATE INDEX IF NOT EXISTS idx_buildings_owner ON public.buildings(owner_id);
CREATE INDEX IF NOT EXISTS idx_houses_building ON public.houses(building_id);
CREATE INDEX IF NOT EXISTS idx_houses_tenant ON public.houses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_house ON public.maintenance_requests(house_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant ON public.payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_owner ON public.transactions(owner_id);
CREATE INDEX IF NOT EXISTS idx_listings_owner ON public.listings(owner_id);
CREATE INDEX IF NOT EXISTS idx_service_providers_category ON public.service_providers(category);
CREATE INDEX IF NOT EXISTS idx_service_reviews_provider ON public.service_reviews(provider_id);

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
ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
CREATE POLICY "profiles_select_authenticated" ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "buildings_select_public" ON public.buildings;
CREATE POLICY "buildings_select_public" ON public.buildings FOR SELECT USING (true);
DROP POLICY IF EXISTS "buildings_owner_all" ON public.buildings;
CREATE POLICY "buildings_owner_all" ON public.buildings FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "houses_select_public" ON public.houses;
CREATE POLICY "houses_select_public" ON public.houses FOR SELECT USING (true);
DROP POLICY IF EXISTS "houses_owner_all" ON public.houses;
CREATE POLICY "houses_owner_all" ON public.houses FOR ALL USING (
    EXISTS (SELECT 1 FROM public.buildings b WHERE b.id = public.houses.building_id AND b.owner_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.buildings b WHERE b.id = public.houses.building_id AND b.owner_id = auth.uid())
);

DROP POLICY IF EXISTS "maintenance_owner_tenant_select" ON public.maintenance_requests;
CREATE POLICY "maintenance_owner_tenant_select" ON public.maintenance_requests FOR SELECT USING (
    owner_id = auth.uid() OR tenant_id = auth.uid()
);
DROP POLICY IF EXISTS "maintenance_tenant_insert" ON public.maintenance_requests;
CREATE POLICY "maintenance_tenant_insert" ON public.maintenance_requests FOR INSERT WITH CHECK (tenant_id = auth.uid());
DROP POLICY IF EXISTS "maintenance_owner_update" ON public.maintenance_requests;
CREATE POLICY "maintenance_owner_update" ON public.maintenance_requests FOR UPDATE USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "listings_select_public" ON public.listings;
CREATE POLICY "listings_select_public" ON public.listings FOR SELECT USING (true);
DROP POLICY IF EXISTS "listings_owner_all" ON public.listings;
CREATE POLICY "listings_owner_all" ON public.listings FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "payments_tenant_select" ON public.payments;
CREATE POLICY "payments_tenant_select" ON public.payments FOR SELECT USING (tenant_id = auth.uid());
DROP POLICY IF EXISTS "payments_owner_select" ON public.payments;
CREATE POLICY "payments_owner_select" ON public.payments FOR SELECT USING (
    EXISTS (
        SELECT 1
        FROM public.houses h
        JOIN public.buildings b ON b.id = h.building_id
        WHERE h.id = public.payments.house_id AND b.owner_id = auth.uid()
    )
);
DROP POLICY IF EXISTS "payments_tenant_insert" ON public.payments;
CREATE POLICY "payments_tenant_insert" ON public.payments FOR INSERT WITH CHECK (tenant_id = auth.uid());
DROP POLICY IF EXISTS "payments_tenant_update" ON public.payments;
CREATE POLICY "payments_tenant_update" ON public.payments FOR UPDATE USING (tenant_id = auth.uid());

DROP POLICY IF EXISTS "transactions_owner_all" ON public.transactions;
CREATE POLICY "transactions_owner_all" ON public.transactions FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "announcements_select_relevant" ON public.announcements;
CREATE POLICY "announcements_select_relevant" ON public.announcements FOR SELECT USING (
    owner_id = auth.uid()
    OR audience = 'all_tenants'
    OR (
        audience = 'specific_building'
        AND EXISTS (
            SELECT 1 FROM public.houses h
            WHERE h.building_id = public.announcements.target_id AND h.tenant_id = auth.uid()
        )
    )
);
DROP POLICY IF EXISTS "announcements_owner_insert" ON public.announcements;
CREATE POLICY "announcements_owner_insert" ON public.announcements FOR INSERT WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "amenities_select_public" ON public.amenities;
CREATE POLICY "amenities_select_public" ON public.amenities FOR SELECT USING (true);
DROP POLICY IF EXISTS "amenities_owner_all" ON public.amenities;
CREATE POLICY "amenities_owner_all" ON public.amenities FOR ALL USING (
    EXISTS (SELECT 1 FROM public.buildings b WHERE b.id = public.amenities.building_id AND b.owner_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.buildings b WHERE b.id = public.amenities.building_id AND b.owner_id = auth.uid())
);

DROP POLICY IF EXISTS "polls_select_public" ON public.polls;
CREATE POLICY "polls_select_public" ON public.polls FOR SELECT USING (true);
DROP POLICY IF EXISTS "polls_owner_all" ON public.polls;
CREATE POLICY "polls_owner_all" ON public.polls FOR ALL USING (
    EXISTS (SELECT 1 FROM public.buildings b WHERE b.id = public.polls.building_id AND b.owner_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.buildings b WHERE b.id = public.polls.building_id AND b.owner_id = auth.uid())
);

DROP POLICY IF EXISTS "chat_member_all" ON public.chat_messages;
CREATE POLICY "chat_member_all" ON public.chat_messages FOR ALL USING (
    EXISTS (SELECT 1 FROM public.houses h WHERE h.building_id = public.chat_messages.building_id AND h.tenant_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.buildings b WHERE b.id = public.chat_messages.building_id AND b.owner_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.houses h WHERE h.building_id = public.chat_messages.building_id AND h.tenant_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.buildings b WHERE b.id = public.chat_messages.building_id AND b.owner_id = auth.uid())
);

DROP POLICY IF EXISTS "gate_passes_member_select" ON public.gate_passes;
CREATE POLICY "gate_passes_member_select" ON public.gate_passes FOR SELECT USING (
    EXISTS (
        SELECT 1
        FROM public.houses h
        JOIN public.buildings b ON b.id = h.building_id
        WHERE h.id = public.gate_passes.house_id
        AND (h.tenant_id = auth.uid() OR b.owner_id = auth.uid())
    )
);
DROP POLICY IF EXISTS "gate_passes_owner_all" ON public.gate_passes;
CREATE POLICY "gate_passes_owner_all" ON public.gate_passes FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM public.houses h
        JOIN public.buildings b ON b.id = h.building_id
        WHERE h.id = public.gate_passes.house_id
        AND b.owner_id = auth.uid()
    )
) WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.houses h
        JOIN public.buildings b ON b.id = h.building_id
        WHERE h.id = public.gate_passes.house_id
        AND b.owner_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "service_providers_select_public" ON public.service_providers;
CREATE POLICY "service_providers_select_public" ON public.service_providers FOR SELECT USING (true);
DROP POLICY IF EXISTS "service_providers_insert_authenticated" ON public.service_providers;
CREATE POLICY "service_providers_insert_authenticated" ON public.service_providers FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "service_providers_update_owner" ON public.service_providers;
CREATE POLICY "service_providers_update_owner" ON public.service_providers FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "service_reviews_select_public" ON public.service_reviews;
CREATE POLICY "service_reviews_select_public" ON public.service_reviews FOR SELECT USING (true);
DROP POLICY IF EXISTS "service_reviews_insert_authenticated" ON public.service_reviews;
CREATE POLICY "service_reviews_insert_authenticated" ON public.service_reviews FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP VIEW IF EXISTS public.marketplace_view;

CREATE VIEW public.marketplace_view AS
SELECT
    l.*,
    b.name AS building_name,
    b.address,
    b.property_type
FROM public.listings l
JOIN public.buildings b ON b.id = l.building_id;

GRANT SELECT ON public.marketplace_view TO authenticated, anon;

INSERT INTO storage.buckets (id, name, public) VALUES ('property_images', 'property_images', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('id-proofs', 'id-proofs', false)
ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('tenant_documents', 'tenant_documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "nilayam_property_images_select_v1" ON storage.objects;
CREATE POLICY "nilayam_property_images_select_v1"
ON storage.objects FOR SELECT
USING (bucket_id = 'property_images');

DROP POLICY IF EXISTS "nilayam_property_images_insert_v1" ON storage.objects;
CREATE POLICY "nilayam_property_images_insert_v1"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'property_images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "nilayam_property_images_delete_v1" ON storage.objects;
CREATE POLICY "nilayam_property_images_delete_v1"
ON storage.objects FOR DELETE
USING (bucket_id = 'property_images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "users_upload_own_id_proof_v1" ON storage.objects;
CREATE POLICY "users_upload_own_id_proof_v1"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'id-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "users_view_own_id_proof_v1" ON storage.objects;
CREATE POLICY "users_view_own_id_proof_v1"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'id-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "admins_view_all_id_proofs_v1" ON storage.objects;
CREATE POLICY "admins_view_all_id_proofs_v1"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'id-proofs');

DROP POLICY IF EXISTS "tenant_documents_select_v1" ON storage.objects;
CREATE POLICY "tenant_documents_select_v1"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'tenant_documents' AND EXISTS (
        SELECT 1
        FROM public.houses h
        JOIN public.buildings b ON b.id = h.building_id
        WHERE h.id::text = (storage.foldername(name))[1]
        AND (h.tenant_id = auth.uid() OR b.owner_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "tenant_documents_insert_v1" ON storage.objects;
CREATE POLICY "tenant_documents_insert_v1"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'tenant_documents' AND EXISTS (
        SELECT 1
        FROM public.houses h
        JOIN public.buildings b ON b.id = h.building_id
        WHERE h.id::text = (storage.foldername(name))[1]
        AND (h.tenant_id = auth.uid() OR b.owner_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "tenant_documents_delete_v1" ON storage.objects;
CREATE POLICY "tenant_documents_delete_v1"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'tenant_documents' AND EXISTS (
        SELECT 1
        FROM public.houses h
        JOIN public.buildings b ON b.id = h.building_id
        WHERE h.id::text = (storage.foldername(name))[1]
        AND (h.tenant_id = auth.uid() OR b.owner_id = auth.uid())
    )
);

SELECT 'Nilayam repair SQL completed successfully' AS status;


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

