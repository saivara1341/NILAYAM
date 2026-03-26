-- Nilayam Enterprise Platform Extension
-- Covers linked-account onboarding, payout retries, webhook replay,
-- accounting controls, tenant lifecycle, admin approvals, marketplace finance,
-- notifications, document review, background jobs, analytics, and security.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
    CREATE TYPE public.kyc_status AS ENUM ('pending', 'submitted', 'verified', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.retry_status AS ENUM ('queued', 'retrying', 'completed', 'failed', 'dead_letter');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.lifecycle_stage AS ENUM ('onboarding', 'move_in', 'active', 'renewal', 'notice', 'move_out', 'deposit_settlement', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.notification_channel AS ENUM ('whatsapp', 'sms', 'email', 'push', 'in_app');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.notification_status AS ENUM ('queued', 'processing', 'sent', 'retrying', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.document_review_status AS ENUM ('pending', 'approved', 'rejected', 'needs_resubmission');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.job_run_status AS ENUM ('queued', 'processing', 'completed', 'retrying', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.incident_status AS ENUM ('open', 'monitoring', 'resolved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.incident_severity AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.marketplace_order_status AS ENUM ('initiated', 'paid', 'fulfilled', 'cancelled', 'disputed', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.owner_linked_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    provider TEXT NOT NULL DEFAULT 'razorpay_route',
    linked_account_id TEXT UNIQUE,
    contact_id TEXT,
    stakeholder_id TEXT,
    kyc_status public.kyc_status DEFAULT 'pending' NOT NULL,
    onboarding_payload JSONB DEFAULT '{}'::jsonb,
    requirements JSONB DEFAULT '[]'::jsonb,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.payout_retry_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_payout_id UUID REFERENCES public.owner_payouts(id) ON DELETE CASCADE NOT NULL,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    retry_reason TEXT,
    status public.retry_status DEFAULT 'queued' NOT NULL,
    attempts INTEGER DEFAULT 0 NOT NULL,
    next_retry_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    last_error TEXT,
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.webhook_replay_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_event_id UUID REFERENCES public.razorpay_webhook_events(id) ON DELETE CASCADE NOT NULL,
    requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status public.retry_status DEFAULT 'queued' NOT NULL,
    replay_notes TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.accounting_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    invoice_id UUID REFERENCES public.invoice_records(id) ON DELETE SET NULL,
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    adjustment_type TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    reason TEXT NOT NULL,
    approval_status public.approval_status DEFAULT 'pending' NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.refund_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    amount NUMERIC(12,2) NOT NULL,
    status public.approval_status DEFAULT 'pending' NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.credit_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    tenant_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES public.invoice_records(id) ON DELETE SET NULL,
    note_number TEXT UNIQUE NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    reason TEXT NOT NULL,
    issued_on TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.deposit_settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    tenant_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    house_id UUID REFERENCES public.houses(id) ON DELETE CASCADE NOT NULL,
    collected_amount NUMERIC(12,2) NOT NULL,
    deductions_amount NUMERIC(12,2) DEFAULT 0 NOT NULL,
    refund_amount NUMERIC(12,2) DEFAULT 0 NOT NULL,
    settlement_status public.approval_status DEFAULT 'pending' NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.tenant_lifecycle_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    tenant_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    house_id UUID REFERENCES public.houses(id) ON DELETE CASCADE NOT NULL,
    stage public.lifecycle_stage NOT NULL,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL,
    due_on TIMESTAMPTZ,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.staff_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    staff_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role_name TEXT NOT NULL,
    permissions JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.approval_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    request_type TEXT NOT NULL,
    entity_table TEXT NOT NULL,
    entity_id UUID NOT NULL,
    submitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status public.approval_status DEFAULT 'pending' NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.audit_log_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_table TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.marketplace_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID,
    buyer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    seller_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    order_status public.marketplace_order_status DEFAULT 'initiated' NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    commission_amount NUMERIC(12,2) DEFAULT 0 NOT NULL,
    vendor_settlement_amount NUMERIC(12,2) DEFAULT 0 NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.marketplace_product_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    seller_name TEXT NOT NULL,
    seller_role TEXT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price NUMERIC(12,2) NOT NULL,
    category TEXT NOT NULL,
    condition TEXT NOT NULL,
    contact_info TEXT NOT NULL,
    location TEXT,
    images JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.marketplace_disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.marketplace_orders(id) ON DELETE CASCADE NOT NULL,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    raised_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'open' NOT NULL,
    reason TEXT NOT NULL,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.vendor_settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID REFERENCES public.service_providers(id) ON DELETE SET NULL,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    work_order_id UUID REFERENCES public.vendor_work_orders(id) ON DELETE SET NULL,
    amount NUMERIC(12,2) NOT NULL,
    settlement_status public.approval_status DEFAULT 'pending' NOT NULL,
    due_on TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    template_key TEXT NOT NULL,
    channel public.notification_channel NOT NULL,
    title TEXT,
    body TEXT NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.notification_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    recipient_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    channel public.notification_channel NOT NULL,
    destination TEXT,
    template_key TEXT,
    payload JSONB DEFAULT '{}'::jsonb,
    status public.notification_status DEFAULT 'queued' NOT NULL,
    attempts INTEGER DEFAULT 0 NOT NULL,
    last_error TEXT,
    next_attempt_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.document_verification_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    tenant_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    document_type TEXT NOT NULL,
    document_url TEXT,
    status public.document_review_status DEFAULT 'pending' NOT NULL,
    reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    review_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.signature_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    tenant_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    agreement_house_id UUID REFERENCES public.houses(id) ON DELETE SET NULL,
    document_url TEXT NOT NULL,
    status public.approval_status DEFAULT 'pending' NOT NULL,
    signed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.job_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    job_type TEXT NOT NULL,
    status public.job_run_status DEFAULT 'queued' NOT NULL,
    attempts INTEGER DEFAULT 0 NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    last_error TEXT,
    next_run_at TIMESTAMPTZ DEFAULT now(),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.analytics_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    snapshot_type TEXT NOT NULL,
    snapshot_date DATE DEFAULT CURRENT_DATE NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.security_incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    severity public.incident_severity DEFAULT 'medium' NOT NULL,
    status public.incident_status DEFAULT 'open' NOT NULL,
    source TEXT,
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.rate_limit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    scope TEXT NOT NULL,
    request_key TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_owner_linked_accounts_owner ON public.owner_linked_accounts(owner_id);
CREATE INDEX IF NOT EXISTS idx_payout_retry_queue_status ON public.payout_retry_queue(status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON public.notification_queue(status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_job_runs_status ON public.job_runs(status, next_run_at);
CREATE INDEX IF NOT EXISTS idx_security_incidents_status ON public.security_incidents(status, severity);
CREATE INDEX IF NOT EXISTS idx_lifecycle_tasks_owner ON public.tenant_lifecycle_tasks(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_owner ON public.approval_requests(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_document_reviews_owner ON public.document_verification_reviews(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_marketplace_disputes_owner ON public.marketplace_disputes(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_marketplace_product_listings_created_at ON public.marketplace_product_listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_product_listings_seller ON public.marketplace_product_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_owner ON public.analytics_snapshots(owner_id, snapshot_date);

CREATE OR REPLACE FUNCTION public.nilayam_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DO $$ BEGIN
    CREATE TRIGGER trg_owner_linked_accounts_updated_at BEFORE UPDATE ON public.owner_linked_accounts FOR EACH ROW EXECUTE FUNCTION public.nilayam_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TRIGGER trg_payout_retry_queue_updated_at BEFORE UPDATE ON public.payout_retry_queue FOR EACH ROW EXECUTE FUNCTION public.nilayam_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TRIGGER trg_accounting_adjustments_updated_at BEFORE UPDATE ON public.accounting_adjustments FOR EACH ROW EXECUTE FUNCTION public.nilayam_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TRIGGER trg_refund_requests_updated_at BEFORE UPDATE ON public.refund_requests FOR EACH ROW EXECUTE FUNCTION public.nilayam_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TRIGGER trg_deposit_settlements_updated_at BEFORE UPDATE ON public.deposit_settlements FOR EACH ROW EXECUTE FUNCTION public.nilayam_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TRIGGER trg_tenant_lifecycle_tasks_updated_at BEFORE UPDATE ON public.tenant_lifecycle_tasks FOR EACH ROW EXECUTE FUNCTION public.nilayam_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TRIGGER trg_staff_roles_updated_at BEFORE UPDATE ON public.staff_roles FOR EACH ROW EXECUTE FUNCTION public.nilayam_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TRIGGER trg_approval_requests_updated_at BEFORE UPDATE ON public.approval_requests FOR EACH ROW EXECUTE FUNCTION public.nilayam_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TRIGGER trg_marketplace_orders_updated_at BEFORE UPDATE ON public.marketplace_orders FOR EACH ROW EXECUTE FUNCTION public.nilayam_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TRIGGER trg_marketplace_product_listings_updated_at BEFORE UPDATE ON public.marketplace_product_listings FOR EACH ROW EXECUTE FUNCTION public.nilayam_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TRIGGER trg_marketplace_disputes_updated_at BEFORE UPDATE ON public.marketplace_disputes FOR EACH ROW EXECUTE FUNCTION public.nilayam_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TRIGGER trg_vendor_settlements_updated_at BEFORE UPDATE ON public.vendor_settlements FOR EACH ROW EXECUTE FUNCTION public.nilayam_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TRIGGER trg_notification_templates_updated_at BEFORE UPDATE ON public.notification_templates FOR EACH ROW EXECUTE FUNCTION public.nilayam_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TRIGGER trg_notification_queue_updated_at BEFORE UPDATE ON public.notification_queue FOR EACH ROW EXECUTE FUNCTION public.nilayam_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TRIGGER trg_document_reviews_updated_at BEFORE UPDATE ON public.document_verification_reviews FOR EACH ROW EXECUTE FUNCTION public.nilayam_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TRIGGER trg_job_runs_updated_at BEFORE UPDATE ON public.job_runs FOR EACH ROW EXECUTE FUNCTION public.nilayam_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TRIGGER trg_security_incidents_updated_at BEFORE UPDATE ON public.security_incidents FOR EACH ROW EXECUTE FUNCTION public.nilayam_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.owner_linked_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_retry_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposit_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_lifecycle_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_product_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_verification_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_replay_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner linked accounts manage" ON public.owner_linked_accounts;
CREATE POLICY "Owner linked accounts manage" ON public.owner_linked_accounts
FOR ALL USING ((auth.uid())::UUID = owner_id) WITH CHECK ((auth.uid())::UUID = owner_id);

DROP POLICY IF EXISTS "Payout retry queue manage" ON public.payout_retry_queue;
CREATE POLICY "Payout retry queue manage" ON public.payout_retry_queue
FOR ALL USING ((auth.uid())::UUID = owner_id) WITH CHECK ((auth.uid())::UUID = owner_id);

DROP POLICY IF EXISTS "Accounting adjustments manage" ON public.accounting_adjustments;
CREATE POLICY "Accounting adjustments manage" ON public.accounting_adjustments
FOR ALL USING ((auth.uid())::UUID = owner_id) WITH CHECK ((auth.uid())::UUID = owner_id);

DROP POLICY IF EXISTS "Refund requests manage" ON public.refund_requests;
CREATE POLICY "Refund requests manage" ON public.refund_requests
FOR ALL USING ((auth.uid())::UUID = owner_id) WITH CHECK ((auth.uid())::UUID = owner_id);

DROP POLICY IF EXISTS "Credit notes manage" ON public.credit_notes;
CREATE POLICY "Credit notes manage" ON public.credit_notes
FOR ALL USING ((auth.uid())::UUID = owner_id) WITH CHECK ((auth.uid())::UUID = owner_id);

DROP POLICY IF EXISTS "Deposit settlements manage" ON public.deposit_settlements;
CREATE POLICY "Deposit settlements manage" ON public.deposit_settlements
FOR ALL USING ((auth.uid())::UUID = owner_id) WITH CHECK ((auth.uid())::UUID = owner_id);

DROP POLICY IF EXISTS "Lifecycle tasks manage" ON public.tenant_lifecycle_tasks;
CREATE POLICY "Lifecycle tasks manage" ON public.tenant_lifecycle_tasks
FOR ALL USING ((auth.uid())::UUID = owner_id) WITH CHECK ((auth.uid())::UUID = owner_id);

DROP POLICY IF EXISTS "Staff roles manage" ON public.staff_roles;
CREATE POLICY "Staff roles manage" ON public.staff_roles
FOR ALL USING ((auth.uid())::UUID = owner_id) WITH CHECK ((auth.uid())::UUID = owner_id);

DROP POLICY IF EXISTS "Approval requests manage" ON public.approval_requests;
CREATE POLICY "Approval requests manage" ON public.approval_requests
FOR ALL USING ((auth.uid())::UUID = owner_id) WITH CHECK ((auth.uid())::UUID = owner_id);

DROP POLICY IF EXISTS "Audit log owner view" ON public.audit_log_entries;
CREATE POLICY "Audit log owner view" ON public.audit_log_entries
FOR SELECT USING ((auth.uid())::UUID = owner_id);

DROP POLICY IF EXISTS "Marketplace orders owner manage" ON public.marketplace_orders;
CREATE POLICY "Marketplace orders owner manage" ON public.marketplace_orders
FOR ALL USING ((auth.uid())::UUID = owner_id) WITH CHECK ((auth.uid())::UUID = owner_id);

DROP POLICY IF EXISTS "Marketplace products public read" ON public.marketplace_product_listings;
CREATE POLICY "Marketplace products public read" ON public.marketplace_product_listings
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Marketplace products seller manage" ON public.marketplace_product_listings;
CREATE POLICY "Marketplace products seller manage" ON public.marketplace_product_listings
FOR ALL USING ((auth.uid())::UUID = seller_id) WITH CHECK ((auth.uid())::UUID = seller_id);

DROP POLICY IF EXISTS "Marketplace disputes owner manage" ON public.marketplace_disputes;
CREATE POLICY "Marketplace disputes owner manage" ON public.marketplace_disputes
FOR ALL USING ((auth.uid())::UUID = owner_id) WITH CHECK ((auth.uid())::UUID = owner_id);

DROP POLICY IF EXISTS "Vendor settlements owner manage" ON public.vendor_settlements;
CREATE POLICY "Vendor settlements owner manage" ON public.vendor_settlements
FOR ALL USING ((auth.uid())::UUID = owner_id) WITH CHECK ((auth.uid())::UUID = owner_id);

DROP POLICY IF EXISTS "Notification templates owner manage" ON public.notification_templates;
CREATE POLICY "Notification templates owner manage" ON public.notification_templates
FOR ALL USING ((auth.uid())::UUID = owner_id) WITH CHECK ((auth.uid())::UUID = owner_id);

DROP POLICY IF EXISTS "Notification queue owner manage" ON public.notification_queue;
CREATE POLICY "Notification queue owner manage" ON public.notification_queue
FOR ALL USING ((auth.uid())::UUID = owner_id) WITH CHECK ((auth.uid())::UUID = owner_id);

DROP POLICY IF EXISTS "Document reviews owner manage" ON public.document_verification_reviews;
CREATE POLICY "Document reviews owner manage" ON public.document_verification_reviews
FOR ALL USING ((auth.uid())::UUID = owner_id) WITH CHECK ((auth.uid())::UUID = owner_id);

DROP POLICY IF EXISTS "Signature requests owner manage" ON public.signature_requests;
CREATE POLICY "Signature requests owner manage" ON public.signature_requests
FOR ALL USING ((auth.uid())::UUID = owner_id) WITH CHECK ((auth.uid())::UUID = owner_id);

DROP POLICY IF EXISTS "Job runs owner manage" ON public.job_runs;
CREATE POLICY "Job runs owner manage" ON public.job_runs
FOR ALL USING (((auth.uid())::UUID = owner_id) OR auth.role() = 'service_role')
WITH CHECK (((auth.uid())::UUID = owner_id) OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Analytics snapshots owner manage" ON public.analytics_snapshots;
CREATE POLICY "Analytics snapshots owner manage" ON public.analytics_snapshots
FOR ALL USING ((auth.uid())::UUID = owner_id) WITH CHECK ((auth.uid())::UUID = owner_id);

DROP POLICY IF EXISTS "Security incidents owner manage" ON public.security_incidents;
CREATE POLICY "Security incidents owner manage" ON public.security_incidents
FOR ALL USING (((auth.uid())::UUID = owner_id) OR auth.role() = 'service_role')
WITH CHECK (((auth.uid())::UUID = owner_id) OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Rate limit events service role only" ON public.rate_limit_events;
CREATE POLICY "Rate limit events service role only" ON public.rate_limit_events
FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Webhook replay owner manage" ON public.webhook_replay_requests;
CREATE POLICY "Webhook replay owner manage" ON public.webhook_replay_requests
FOR ALL USING (auth.role() = 'service_role' OR requested_by = (auth.uid())::UUID)
WITH CHECK (auth.role() = 'service_role' OR requested_by = (auth.uid())::UUID);
