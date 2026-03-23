-- Adds missing local-services backend tables and storage bucket used by the UI.

CREATE TABLE IF NOT EXISTS public.service_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    location TEXT NOT NULL,
    rating NUMERIC(3, 2) DEFAULT 0,
    jobs_completed INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    description TEXT,
    availability TEXT DEFAULT 'Available',
    catalogs JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.service_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID REFERENCES public.service_providers(id) ON DELETE CASCADE NOT NULL,
    reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewer_name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_service_providers_category ON public.service_providers(category);
CREATE INDEX IF NOT EXISTS idx_service_reviews_provider_id ON public.service_reviews(provider_id);

ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service providers are viewable by everyone" ON public.service_providers;
CREATE POLICY "Service providers are viewable by everyone"
  ON public.service_providers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can register service providers" ON public.service_providers;
CREATE POLICY "Authenticated users can register service providers"
  ON public.service_providers FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Provider owners can update their own service profile" ON public.service_providers;
CREATE POLICY "Provider owners can update their own service profile"
  ON public.service_providers FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service reviews are viewable by everyone" ON public.service_reviews;
CREATE POLICY "Service reviews are viewable by everyone"
  ON public.service_reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can add service reviews" ON public.service_reviews;
CREATE POLICY "Authenticated users can add service reviews"
  ON public.service_reviews FOR INSERT WITH CHECK (auth.role() = 'authenticated');

INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant_documents', 'tenant_documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Tenant documents are viewable by assigned stakeholders" ON storage.objects;
CREATE POLICY "Tenant documents are viewable by assigned stakeholders"
  ON storage.objects FOR SELECT USING (
    bucket_id = 'tenant_documents' AND EXISTS (
      SELECT 1
      FROM public.houses h
      JOIN public.buildings b ON b.id = h.building_id
      WHERE h.id::text = (storage.foldername(name))[1]
      AND (
        h.tenant_id = auth.uid()
        OR b.owner_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Tenant documents can be uploaded by assigned stakeholders" ON storage.objects;
CREATE POLICY "Tenant documents can be uploaded by assigned stakeholders"
  ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'tenant_documents' AND EXISTS (
      SELECT 1
      FROM public.houses h
      JOIN public.buildings b ON b.id = h.building_id
      WHERE h.id::text = (storage.foldername(name))[1]
      AND (
        h.tenant_id = auth.uid()
        OR b.owner_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Tenant documents can be deleted by assigned stakeholders" ON storage.objects;
CREATE POLICY "Tenant documents can be deleted by assigned stakeholders"
  ON storage.objects FOR DELETE USING (
    bucket_id = 'tenant_documents' AND EXISTS (
      SELECT 1
      FROM public.houses h
      JOIN public.buildings b ON b.id = h.building_id
      WHERE h.id::text = (storage.foldername(name))[1]
      AND (
        h.tenant_id = auth.uid()
        OR b.owner_id = auth.uid()
      )
    )
  );
