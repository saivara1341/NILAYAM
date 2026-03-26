-- Nilayam ERP Extension
-- Adds production-ready tables for payment engine, invoices, reconciliation,
-- owner settlements, maintenance work orders, and lead / booking CRM.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
    CREATE TYPE public.invoice_status AS ENUM ('draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.reconciliation_status AS ENUM ('matched', 'unmatched', 'review_required');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.payout_status AS ENUM ('pending', 'processing', 'paid_out', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.maintenance_priority AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.work_order_status AS ENUM ('unassigned', 'assigned', 'en_route', 'in_progress', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.lead_stage AS ENUM ('new', 'contacted', 'visit_scheduled', 'visit_completed', 'negotiation', 'booking_token', 'won', 'lost');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.lead_source AS ENUM ('marketplace', 'website', 'referral', 'walk_in', 'broker', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS building_id UUID REFERENCES public.buildings(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS payment_channel TEXT DEFAULT 'manual',
    ADD COLUMN IF NOT EXISTS settlement_preference TEXT DEFAULT 'direct_owner',
    ADD COLUMN IF NOT EXISTS settlement_status TEXT DEFAULT 'pending_verification',
    ADD COLUMN IF NOT EXISTS external_reference TEXT,
    ADD COLUMN IF NOT EXISTS gateway_payload JSONB DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.invoice_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    tenant_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    building_id UUID REFERENCES public.buildings(id) ON DELETE SET NULL,
    house_id UUID REFERENCES public.houses(id) ON DELETE CASCADE NOT NULL,
    invoice_number TEXT NOT NULL UNIQUE,
    billing_month TEXT NOT NULL,
    status public.invoice_status DEFAULT 'issued',
    issued_on TIMESTAMPTZ DEFAULT now() NOT NULL,
    due_date DATE NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL,
    outstanding_amount NUMERIC(12,2) NOT NULL,
    line_items JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.payment_reconciliations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    invoice_id UUID REFERENCES public.invoice_records(id) ON DELETE SET NULL,
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    expected_amount NUMERIC(12,2) NOT NULL,
    detected_amount NUMERIC(12,2) NOT NULL,
    variance_amount NUMERIC(12,2) NOT NULL,
    status public.reconciliation_status DEFAULT 'unmatched',
    channel TEXT NOT NULL,
    detected_on TIMESTAMPTZ DEFAULT now() NOT NULL,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS public.owner_payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    building_id UUID REFERENCES public.buildings(id) ON DELETE SET NULL,
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    amount NUMERIC(12,2) NOT NULL,
    payout_status public.payout_status DEFAULT 'pending',
    settlement_mode TEXT NOT NULL,
    destination_label TEXT NOT NULL,
    initiated_on TIMESTAMPTZ DEFAULT now() NOT NULL,
    completed_on TIMESTAMPTZ,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS public.vendor_work_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    maintenance_request_id UUID REFERENCES public.maintenance_requests(id) ON DELETE CASCADE NOT NULL,
    provider_id UUID REFERENCES public.service_providers(id) ON DELETE SET NULL,
    priority public.maintenance_priority DEFAULT 'medium',
    status public.work_order_status DEFAULT 'unassigned',
    sla_due_at TIMESTAMPTZ NOT NULL,
    assigned_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    estimated_cost NUMERIC(12,2),
    actual_cost NUMERIC(12,2),
    notes TEXT
);

CREATE TABLE IF NOT EXISTS public.crm_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    building_id UUID REFERENCES public.buildings(id) ON DELETE SET NULL,
    house_id UUID REFERENCES public.houses(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    email TEXT,
    source public.lead_source DEFAULT 'other',
    stage public.lead_stage DEFAULT 'new',
    interested_in TEXT NOT NULL,
    budget NUMERIC(12,2),
    move_in_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.crm_visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE NOT NULL,
    building_id UUID REFERENCES public.buildings(id) ON DELETE SET NULL,
    house_id UUID REFERENCES public.houses(id) ON DELETE SET NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.crm_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE NOT NULL,
    building_id UUID REFERENCES public.buildings(id) ON DELETE SET NULL,
    house_id UUID REFERENCES public.houses(id) ON DELETE SET NULL,
    booking_type TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    status TEXT DEFAULT 'initiated',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invoice_records_owner ON public.invoice_records(owner_id);
CREATE INDEX IF NOT EXISTS idx_invoice_records_house ON public.invoice_records(house_id);
CREATE INDEX IF NOT EXISTS idx_payment_reconciliations_owner ON public.payment_reconciliations(owner_id);
CREATE INDEX IF NOT EXISTS idx_owner_payouts_owner ON public.owner_payouts(owner_id);
CREATE INDEX IF NOT EXISTS idx_vendor_work_orders_request ON public.vendor_work_orders(maintenance_request_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_owner ON public.crm_leads(owner_id);
CREATE INDEX IF NOT EXISTS idx_crm_visits_lead ON public.crm_visits(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_bookings_lead ON public.crm_bookings(lead_id);

ALTER TABLE public.invoice_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Invoice owner manage" ON public.invoice_records;
DROP POLICY IF EXISTS "Invoice tenant view" ON public.invoice_records;
DROP POLICY IF EXISTS "Reconciliation owner manage" ON public.payment_reconciliations;
DROP POLICY IF EXISTS "Owner payouts manage" ON public.owner_payouts;
DROP POLICY IF EXISTS "Work orders owner manage" ON public.vendor_work_orders;
DROP POLICY IF EXISTS "CRM leads owner manage" ON public.crm_leads;
DROP POLICY IF EXISTS "CRM visits owner manage" ON public.crm_visits;
DROP POLICY IF EXISTS "CRM bookings owner manage" ON public.crm_bookings;

CREATE POLICY "Invoice owner manage"
ON public.invoice_records
FOR ALL
USING ((auth.uid())::UUID = owner_id)
WITH CHECK ((auth.uid())::UUID = owner_id);

CREATE POLICY "Invoice tenant view"
ON public.invoice_records
FOR SELECT
USING ((auth.uid())::UUID = tenant_id);

CREATE POLICY "Reconciliation owner manage"
ON public.payment_reconciliations
FOR ALL
USING ((auth.uid())::UUID = owner_id)
WITH CHECK ((auth.uid())::UUID = owner_id);

CREATE POLICY "Owner payouts manage"
ON public.owner_payouts
FOR ALL
USING ((auth.uid())::UUID = owner_id)
WITH CHECK ((auth.uid())::UUID = owner_id);

CREATE POLICY "Work orders owner manage"
ON public.vendor_work_orders
FOR ALL
USING ((auth.uid())::UUID = owner_id)
WITH CHECK ((auth.uid())::UUID = owner_id);

CREATE POLICY "CRM leads owner manage"
ON public.crm_leads
FOR ALL
USING ((auth.uid())::UUID = owner_id)
WITH CHECK ((auth.uid())::UUID = owner_id);

CREATE POLICY "CRM visits owner manage"
ON public.crm_visits
FOR ALL
USING (
    EXISTS (
        SELECT 1
        FROM public.crm_leads lead
        WHERE lead.id = crm_visits.lead_id
        AND lead.owner_id = (auth.uid())::UUID
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.crm_leads lead
        WHERE lead.id = crm_visits.lead_id
        AND lead.owner_id = (auth.uid())::UUID
    )
);

CREATE POLICY "CRM bookings owner manage"
ON public.crm_bookings
FOR ALL
USING (
    EXISTS (
        SELECT 1
        FROM public.crm_leads lead
        WHERE lead.id = crm_bookings.lead_id
        AND lead.owner_id = (auth.uid())::UUID
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.crm_leads lead
        WHERE lead.id = crm_bookings.lead_id
        AND lead.owner_id = (auth.uid())::UUID
    )
);

UPDATE public.payments payment
SET
    owner_id = building.owner_id,
    building_id = house.building_id
FROM public.houses house
JOIN public.buildings building ON building.id = house.building_id
WHERE payment.house_id = house.id
AND (payment.owner_id IS NULL OR payment.building_id IS NULL);
