
import { User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from './supabase';
import {
    Property, DashboardSummary, FinancialDataPoint, OccupancyDataPoint,
    Tenant, Transaction, MaintenanceRequest, Listing, Profile,
    Announcement, LeaseExpiry, AiSuggestion, TodaysFocusItem,
    TenantDashboardData, VacantUnit, NewListingData,
    ServiceProvider, ServiceCategory,
    PaymentMethods, UserRole, AppNotification, MaintenanceStatus,
    TenantDocument, OccupancyStatus, DetailedVacantUnit,
    Visitor, Amenity, Poll, ChatMessage, ForecastDataPoint,
    ChargeLedgerEntry, AgreementWorkflow, ReminderRecord, TenantOperationalData, TenantLifecycleData,
    Payment, OwnerPaymentsDashboard, OwnerPaymentFilters, OwnerPaymentPropertyOption, AgreementWorkspaceItem, CommunityEvent, ProductListing,
    TenantScoreSummary, TenantScoreFactor, TenantLogEntry, FinanceERPWorkspace, InvoiceRecord, ReconciliationRecord, OwnerPayoutRecord,
    MaintenanceERPWorkspace, VendorWorkOrder, CRMWorkspace, LeadRecord, PropertyVisit, BookingRecord,
    EnterpriseOpsSnapshot, SystemHealthWorkspace, IntegrationStatus, AnalyticsWorkspace
} from '../types';
import { GoogleGenerativeAI } from "@google/generative-ai";

const currentMonthBounds = () => {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    return { start, end };
};

const sanitizeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_');
const normalizePhoneNumber = (value?: string | null) => (value || '').replace(/\D/g, '').slice(-10);
const normalizeAadhaarNumber = (value?: string | null) => (value || '').replace(/\D/g, '').slice(0, 12);
const paymentProofsBucket = 'payment-proofs';
const communityEventsStorageKey = 'nilayam_community_events';
const feedbackStorageKey = 'nilayam_feedback_entries';
const productMarketplaceStorageKey = 'nilayam_product_marketplace';
const financeWorkspaceStorageKey = 'nilayam_finance_workspace';
const workOrdersStorageKey = 'nilayam_work_orders';
const crmWorkspaceStorageKey = 'nilayam_crm_workspace';
const enterpriseOpsStorageKey = 'nilayam_enterprise_ops_snapshot';
const getE2EState = () => {
    if (typeof window === 'undefined') return null;
    return (window as any).__NILAYAM_E2E__ || null;
};
const allowLocalFallback = () => !isSupabaseConfigured || !!getE2EState();
const shouldUseLocalErpPersistence = () => allowLocalFallback();
const emptyEnterpriseOpsSnapshot = (): EnterpriseOpsSnapshot => ({
    linkedAccountsPending: 0,
    payoutRetriesQueued: 0,
    webhookEventsPending: 0,
    accountingExceptions: 0,
    tenantLifecycleTasks: 0,
    approvalTasks: 0,
    marketplaceDisputes: 0,
    notificationsQueued: 0,
    documentsPendingReview: 0,
    jobsFailing: 0,
    analyticsSnapshots: 0,
    securityIncidentsOpen: 0
});
const invokeEdgeFunction = async <T = any>(name: string, body: Record<string, any>): Promise<T | null> => {
    try {
        const { data, error } = await (supabase as any).functions.invoke(name, { body });
        if (error) {
            if (isSupabaseRelationUnavailable(error) || /FunctionsHttpError|Failed to send a request|non-2xx/i.test(String(error.message || ''))) {
                return null;
            }
            throw error;
        }
        return (data ?? null) as T | null;
    } catch (error: any) {
        if (/FunctionsHttpError|Failed to fetch|Failed to send a request|network/i.test(String(error?.message || ''))) {
            return null;
        }
        throw error;
    }
};
const getStoredEnterpriseSnapshot = (): EnterpriseOpsSnapshot => {
    if (typeof window === 'undefined' || !shouldUseLocalErpPersistence()) return emptyEnterpriseOpsSnapshot();
    try {
        const raw = localStorage.getItem(enterpriseOpsStorageKey);
        return raw ? JSON.parse(raw) : emptyEnterpriseOpsSnapshot();
    } catch {
        return emptyEnterpriseOpsSnapshot();
    }
};
const setStoredEnterpriseSnapshot = (value: EnterpriseOpsSnapshot) => {
    if (typeof window === 'undefined' || !shouldUseLocalErpPersistence()) return;
    localStorage.setItem(enterpriseOpsStorageKey, JSON.stringify(value));
};
const localOpsKey = (houseId: string) => `nilayam_ops_${houseId}`;
const tenantIdentityRegistryKey = 'nilayam_tenant_identity_registry';
const formatBillingMonth = (value: Date | string) => {
    const date = typeof value === 'string' ? new Date(value) : value;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};
const titleCase = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
const toDateInput = (value: Date) => value.toISOString().slice(0, 10);
const isCurrentMonth = (value?: string | null) => {
    if (!value) return false;
    const date = new Date(value);
    const now = new Date();
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
};
const normalizePaymentStatus = (status?: string | null): Payment['status'] => {
    if (status === 'completed' || status === 'paid') return 'paid';
    if (status === 'pending') return 'pending';
    if (status === 'failed') return 'failed';
    return 'due';
};
const toReminderNotification = (record: ReminderRecord): AppNotification => ({
    id: `reminder-${record.id}`,
    title: record.title,
    message: record.message,
    type: record.type,
    priority: record.type === 'agreement_renewal' || record.type === 'vacate_followup' ? 'high' : 'medium',
    timestamp: record.scheduled_for,
    meta: { house_id: record.house_id, reminder: true }
});

const getStoredOperations = (houseId: string): { agreement?: AgreementWorkflow; ledger?: ChargeLedgerEntry[]; reminders?: ReminderRecord[]; lifecycle?: TenantLifecycleData } => {
    if (typeof window === 'undefined') return {};
    try {
        const raw = localStorage.getItem(localOpsKey(houseId));
        if (!raw) return {};
        return JSON.parse(raw);
    } catch {
        return {};
    }
};

const setStoredOperations = (houseId: string, value: { agreement?: AgreementWorkflow; ledger?: ChargeLedgerEntry[]; reminders?: ReminderRecord[]; lifecycle?: TenantLifecycleData }) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(localOpsKey(houseId), JSON.stringify(value));
};

const deriveAgreementStatus = (endDate: string | null | undefined): AgreementWorkflow['status'] => {
    if (!endDate) return 'draft';
    const daysRemaining = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysRemaining < 0) return 'closure_in_progress';
    if (daysRemaining <= 30) return 'renewal_due';
    return 'active';
};

const buildDefaultAgreement = (house: any): AgreementWorkflow => ({
    tenant_id: house.tenant_id || null,
    house_id: house.id,
    agreement_type: 'residential_rental',
    status: deriveAgreementStatus(house.lease_end_date),
    template_name: 'Residential rental agreement',
    agreement_start_date: null,
    agreement_end_date: house.lease_end_date || null,
    monthly_rent: Number(house.rent_amount || 0),
    security_deposit: Number(house.security_deposit || 0),
    renewal_notice_days: 30,
    vacate_notice_date: null,
    vacate_reason: null,
    notice_period_days: 30,
    owner_requirements: null,
    tenant_requirements: null,
    special_clauses: [],
    legal_notes: 'This draft is for workflow support and should be reviewed for local legal compliance before execution.',
    drafted_document: null,
    drafted_at: null,
    stamp_duty_status: 'pending',
    registration_status: 'pending',
    last_updated_at: new Date().toISOString()
});

const buildDefaultLifecycle = (house: any, lifecycle?: TenantLifecycleData): TenantLifecycleData => ({
    move_in_date: lifecycle?.move_in_date || null,
    advance_amount: Number(lifecycle?.advance_amount || 0),
    advance_received_on: lifecycle?.advance_received_on || null,
    possession_handover_on: lifecycle?.possession_handover_on || null,
    agreement_acknowledged_at: lifecycle?.agreement_acknowledged_at || null,
    agreement_acceptance_note: lifecycle?.agreement_acceptance_note || null,
    aadhaar_number: lifecycle?.aadhaar_number || null,
    tenant_score: Number(lifecycle?.tenant_score || 0)
});

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const getTenantScoreBand = (score: number): TenantScoreSummary['band'] => {
    if (score >= 85) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'watchlist';
    return 'high_risk';
};

const buildTenantScoreSummary = (payload: {
    lifecycle?: TenantLifecycleData;
    payments: Array<{ due_date?: string; paid_date?: string; status?: string }>;
    reminders: ReminderRecord[];
    openMaintenanceCount?: number;
}): TenantScoreSummary => {
    const factors: TenantScoreFactor[] = [];
    let score = 55;
    const lifecycle = payload.lifecycle;
    const payments = payload.payments || [];
    const openMaintenanceCount = Number(payload.openMaintenanceCount || 0);

    const paidCount = payments.filter((payment) => normalizePaymentStatus(payment.status) === 'paid').length;
    const failedCount = payments.filter((payment) => normalizePaymentStatus(payment.status) === 'failed').length;
    const overdueCount = payments.filter((payment) => {
        const normalized = normalizePaymentStatus(payment.status);
        if (normalized === 'due' || normalized === 'failed') {
            return true;
        }
        return normalized === 'pending' && !!payment.due_date && new Date(payment.due_date).getTime() < Date.now();
    }).length;
    const onTimeCount = payments.filter((payment) => {
        const normalized = normalizePaymentStatus(payment.status);
        if (normalized !== 'paid' || !payment.paid_date || !payment.due_date) return false;
        return new Date(payment.paid_date).getTime() <= new Date(payment.due_date).getTime() + 1000 * 60 * 60 * 24;
    }).length;

    const paymentImpact = Math.min(25, onTimeCount * 6) - Math.min(24, overdueCount * 8 + failedCount * 6);
    score += paymentImpact;
    factors.push({
        label: 'Payment reliability',
        impact: paymentImpact,
        status: paymentImpact >= 8 ? 'positive' : paymentImpact <= -8 ? 'negative' : 'neutral',
        description: paidCount === 0
            ? 'No verified payment history yet.'
            : `${onTimeCount} on-time payment${onTimeCount === 1 ? '' : 's'}, ${overdueCount} overdue / failed cycle${overdueCount === 1 ? '' : 's'}.`
    });

    const verificationReady = Boolean((lifecycle?.aadhaar_number || '').replace(/\D/g, '').length === 12);
    const verificationImpact = verificationReady ? 10 : -6;
    score += verificationImpact;
    factors.push({
        label: 'Identity verification',
        impact: verificationImpact,
        status: verificationReady ? 'positive' : 'negative',
        description: verificationReady ? 'Government ID is mapped for the tenant record.' : 'Tenant should complete verified ID mapping for a stronger trust score.'
    });

    const agreementAck = Boolean(lifecycle?.agreement_acknowledged_at);
    const agreementImpact = agreementAck ? 5 : -2;
    score += agreementImpact;
    factors.push({
        label: 'Agreement compliance',
        impact: agreementImpact,
        status: agreementAck ? 'positive' : 'neutral',
        description: agreementAck ? 'Tenant acknowledged agreement workflow in Nilayam.' : 'Agreement acknowledgement is still pending.'
    });

    const maintenanceImpact = openMaintenanceCount === 0 ? 4 : openMaintenanceCount <= 2 ? 0 : -Math.min(10, openMaintenanceCount * 2);
    score += maintenanceImpact;
    factors.push({
        label: 'Property care',
        impact: maintenanceImpact,
        status: maintenanceImpact >= 4 ? 'positive' : maintenanceImpact <= -4 ? 'negative' : 'neutral',
        description: openMaintenanceCount === 0
            ? 'No unresolved maintenance issues on record.'
            : `${openMaintenanceCount} active maintenance request${openMaintenanceCount === 1 ? '' : 's'} still open.`
    });

    const reminderImpact = payload.reminders.length > 3 ? -4 : payload.reminders.length > 0 ? -1 : 2;
    score += reminderImpact;
    factors.push({
        label: 'Reminder pressure',
        impact: reminderImpact,
        status: reminderImpact > 0 ? 'positive' : reminderImpact < 0 ? 'negative' : 'neutral',
        description: payload.reminders.length === 0
            ? 'No reminder escalations needed recently.'
            : `${payload.reminders.length} reminder${payload.reminders.length === 1 ? '' : 's'} scheduled for this tenant workflow.`
    });

    const finalScore = clampScore(score);
    const band = getTenantScoreBand(finalScore);
    const explanationByBand: Record<TenantScoreSummary['band'], string> = {
        excellent: 'High-confidence tenant profile with strong payment and compliance signals.',
        good: 'Healthy tenant profile with only minor follow-up needs.',
        watchlist: 'Moderate risk profile. Monitor reminders, overdue items, and pending acknowledgements closely.',
        high_risk: 'High follow-up required. Resolve overdue payments, verification gaps, and compliance issues urgently.'
    };

    return {
        score: finalScore,
        band,
        factors,
        explanation: explanationByBand[band]
    };
};

const buildTenantActivityLog = (payload: {
    houseId: string;
    payments: Payment[];
    reminders: ReminderRecord[];
    agreement: AgreementWorkflow;
    lifecycle?: TenantLifecycleData;
    openMaintenanceRequests?: Array<{ id: string; description?: string; created_at?: string; status?: string }>;
}): TenantLogEntry[] => {
    const entries: TenantLogEntry[] = [];

    payload.payments.forEach((payment) => {
        const status = normalizePaymentStatus(payment.status);
        entries.push({
            id: `payment_${payment.id}`,
            title: status === 'paid' ? 'Payment received' : status === 'failed' ? 'Payment verification failed' : 'Payment due',
            description: `${titleCase(payment.payment_type || 'payment')} for ₹${Number(payment.amount || 0).toLocaleString('en-IN')} is ${status}.`,
            occurred_at: payment.paid_date || payment.created_at || payment.due_date,
            category: 'payment',
            tone: status === 'paid' ? 'success' : status === 'failed' ? 'warning' : 'info'
        });
    });

    payload.reminders.forEach((reminder) => {
        entries.push({
            id: `reminder_${reminder.id}`,
            title: reminder.status === 'sent' ? 'Reminder sent' : 'Reminder scheduled',
            description: `${reminder.title} via ${titleCase(reminder.channel)}.`,
            occurred_at: reminder.sent_at || reminder.scheduled_for,
            category: 'reminder',
            tone: reminder.status === 'sent' ? 'info' : 'warning'
        });
    });

    if (payload.agreement?.last_updated_at) {
        entries.push({
            id: `agreement_${payload.houseId}`,
            title: 'Agreement workflow updated',
            description: `Agreement is currently in ${titleCase(payload.agreement.status)} status.`,
            occurred_at: payload.agreement.last_updated_at,
            category: 'agreement',
            tone: payload.agreement.status === 'active' ? 'success' : 'info'
        });
    }

    if (payload.lifecycle?.agreement_acknowledged_at) {
        entries.push({
            id: `agreement_ack_${payload.houseId}`,
            title: 'Agreement acknowledged',
            description: payload.lifecycle.agreement_acceptance_note || 'Tenant acknowledged the agreement inside Nilayam.',
            occurred_at: payload.lifecycle.agreement_acknowledged_at,
            category: 'verification',
            tone: 'success'
        });
    }

    if (payload.lifecycle?.move_in_date) {
        entries.push({
            id: `move_in_${payload.houseId}`,
            title: 'Move-in recorded',
            description: 'Move-in date is logged for this tenancy.',
            occurred_at: payload.lifecycle.move_in_date,
            category: 'lifecycle',
            tone: 'info'
        });
    }

    (payload.openMaintenanceRequests || []).forEach((request) => {
        entries.push({
            id: `maintenance_${request.id}`,
            title: 'Maintenance request open',
            description: request.description || 'Maintenance request requires follow-up.',
            occurred_at: request.created_at || new Date().toISOString(),
            category: 'maintenance',
            tone: request.status === 'resolved' ? 'success' : 'warning'
        });
    });

    return entries
        .filter((entry) => Boolean(entry.occurred_at))
        .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
        .slice(0, 10);
};

const getTenantIdentityRegistry = (): Record<string, { aadhaar_number: string; tenant_score: number; name?: string | null; phone?: string | null }> => {
    if (typeof window === 'undefined') return {};
    try {
        const raw = localStorage.getItem(tenantIdentityRegistryKey);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
};

const setTenantIdentityRegistry = (value: Record<string, { aadhaar_number: string; tenant_score: number; name?: string | null; phone?: string | null }>) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(tenantIdentityRegistryKey, JSON.stringify(value));
};

const getApiBaseUrl = () => {
    const configured = import.meta.env.VITE_API_BASE_URL?.trim();
    if (configured) {
        return configured.replace(/\/$/, '');
    }

    if (typeof window !== 'undefined') {
        const { origin, hostname } = window.location;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return origin;
        }
    }

    return '';
};

export const isRazorpayRuntimeAvailable = () => Boolean(import.meta.env.VITE_RAZORPAY_KEY_ID && getApiBaseUrl());
export const canUseRazorpayForOwner = (methods?: PaymentMethods | null) => Boolean(methods?.enableRazorpay && isRazorpayRuntimeAvailable());

const resolveReceiptUrl = async (receiptUrl?: string | null): Promise<string | undefined> => {
    if (!receiptUrl) return undefined;
    if (/^https?:\/\//i.test(receiptUrl)) return receiptUrl;

    const { data, error } = await supabase.storage
        .from(paymentProofsBucket)
        .createSignedUrl(receiptUrl, 60 * 60 * 24 * 7);

    if (error) {
        console.warn('API: Unable to create signed payment proof URL.', error);
        return undefined;
    }

    return data?.signedUrl;
};

const getAllStoredOperationEntries = () => {
    if (typeof window === 'undefined') return [] as Array<{ houseId: string; data: { agreement?: AgreementWorkflow; ledger?: ChargeLedgerEntry[]; reminders?: ReminderRecord[]; lifecycle?: TenantLifecycleData } }>;

    return Object.keys(localStorage)
        .filter((key) => key.startsWith('nilayam_ops_'))
        .map((key) => {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            try {
                return {
                    houseId: key.replace('nilayam_ops_', ''),
                    data: JSON.parse(raw)
                };
            } catch {
                return null;
            }
        })
        .filter(Boolean) as Array<{ houseId: string; data: { agreement?: AgreementWorkflow; ledger?: ChargeLedgerEntry[]; reminders?: ReminderRecord[]; lifecycle?: TenantLifecycleData } }>;
};

const getStoredCommunityEvents = (): CommunityEvent[] => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(communityEventsStorageKey);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

const setStoredCommunityEvents = (events: CommunityEvent[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(communityEventsStorageKey, JSON.stringify(events));
};

const getStoredFeedback = () => {
    if (typeof window === 'undefined') return [] as any[];
    try {
        const raw = localStorage.getItem(feedbackStorageKey);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

const setStoredFeedback = (entries: any[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(feedbackStorageKey, JSON.stringify(entries));
};

const getStoredProductMarketplaceListings = (): ProductListing[] => {
    if (typeof window === 'undefined' || !shouldUseLocalErpPersistence()) return [];
    try {
        const raw = localStorage.getItem(productMarketplaceStorageKey);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

const setStoredProductMarketplaceListings = (entries: ProductListing[]) => {
    if (typeof window === 'undefined' || !shouldUseLocalErpPersistence()) return;
    localStorage.setItem(productMarketplaceStorageKey, JSON.stringify(entries));
};

const getStoredFinanceWorkspace = (): FinanceERPWorkspace => {
    if (typeof window === 'undefined' || !shouldUseLocalErpPersistence()) return { invoices: [], reconciliations: [], payouts: [] };
    try {
        const raw = localStorage.getItem(financeWorkspaceStorageKey);
        return raw ? JSON.parse(raw) : { invoices: [], reconciliations: [], payouts: [] };
    } catch {
        return { invoices: [], reconciliations: [], payouts: [] };
    }
};

const setStoredFinanceWorkspace = (workspace: FinanceERPWorkspace) => {
    if (typeof window === 'undefined' || !shouldUseLocalErpPersistence()) return;
    localStorage.setItem(financeWorkspaceStorageKey, JSON.stringify(workspace));
};

const getStoredWorkOrders = (): VendorWorkOrder[] => {
    if (typeof window === 'undefined' || !shouldUseLocalErpPersistence()) return [];
    try {
        const raw = localStorage.getItem(workOrdersStorageKey);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

const setStoredWorkOrders = (entries: VendorWorkOrder[]) => {
    if (typeof window === 'undefined' || !shouldUseLocalErpPersistence()) return;
    localStorage.setItem(workOrdersStorageKey, JSON.stringify(entries));
};

const getStoredCRMWorkspace = (): CRMWorkspace => {
    if (typeof window === 'undefined' || !shouldUseLocalErpPersistence()) return { leads: [], visits: [], bookings: [] };
    try {
        const raw = localStorage.getItem(crmWorkspaceStorageKey);
        return raw ? JSON.parse(raw) : { leads: [], visits: [], bookings: [] };
    } catch {
        return { leads: [], visits: [], bookings: [] };
    }
};

const setStoredCRMWorkspace = (workspace: CRMWorkspace) => {
    if (typeof window === 'undefined' || !shouldUseLocalErpPersistence()) return;
    localStorage.setItem(crmWorkspaceStorageKey, JSON.stringify(workspace));
};

export const lookupTenantScoreByAadhaar = async (aadhaarNumber: string): Promise<number> => {
    const normalized = aadhaarNumber.replace(/\D/g, '');
    if (!normalized) return 0;
    const registry = getTenantIdentityRegistry();
    return Number(registry[normalized]?.tenant_score || 0);
};

const normalizeChargeStatus = (entry: ChargeLedgerEntry): ChargeLedgerEntry['status'] => {
    if (entry.paid_date) return 'paid';
    if (new Date(entry.due_date).getTime() < Date.now()) return 'overdue';
    return entry.status === 'scheduled' ? 'scheduled' : 'due';
};

const buildRentLedger = (
    houseId: string,
    tenantId: string | null | undefined,
    rentAmount: number,
    payments: Array<{ id: string; due_date: string; paid_date?: string; amount: number; status: string }>
): ChargeLedgerEntry[] => {
    const months = Array.from({ length: 6 }, (_value, index) => {
        const date = new Date();
        date.setMonth(date.getMonth() - index);
        date.setDate(5);
        return date;
    }).reverse();

    return months.map((date) => {
        const monthKey = formatBillingMonth(date);
        const match = payments.find((payment) => formatBillingMonth(payment.due_date) === monthKey);
        const base: ChargeLedgerEntry = {
            id: match?.id || `rent_${houseId}_${monthKey}`,
            tenant_id: tenantId || null,
            house_id: houseId,
            category: 'rent',
            label: 'Monthly Rent',
            billing_month: monthKey,
            amount: Number(match?.amount || rentAmount || 0),
            due_date: match?.due_date || toDateInput(date),
            paid_date: match?.paid_date,
            status: match?.status === 'completed' || match?.status === 'paid' ? 'paid' : 'due',
            source: match ? 'payment' : 'manual'
        };

        return { ...base, status: normalizeChargeStatus(base) };
    });
};

const getTenantOperationalData = (house: any, payments: Array<{ id: string; due_date: string; paid_date?: string; amount: number; status: string }>): TenantOperationalData => {
    const stored = getStoredOperations(house.id);
    const rentLedger = buildRentLedger(house.id, house.tenant_id, Number(house.rent_amount || 0), payments);
    const manualLedger = (stored.ledger || []).map((entry) => ({ ...entry, status: normalizeChargeStatus(entry) }));
    const mergedLedger = [...rentLedger, ...manualLedger]
        .sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime());

    const agreement = stored.agreement
        ? {
            ...stored.agreement,
            house_id: house.id,
            tenant_id: house.tenant_id || stored.agreement.tenant_id || null,
            agreement_end_date: stored.agreement.agreement_end_date || house.lease_end_date || null,
            status: stored.agreement.status
        }
        : buildDefaultAgreement(house);

    const reminders = (stored.reminders || [])
        .map((record) => ({
            ...record,
            tenant_id: house.tenant_id || record.tenant_id || null
        }))
        .sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime());

    const lifecycle = buildDefaultLifecycle(house, stored.lifecycle);
    const scorecard = buildTenantScoreSummary({
        lifecycle,
        payments,
        reminders,
        openMaintenanceCount: 0
    });

    return {
        ledger: mergedLedger,
        agreement,
        reminders,
        lifecycle: {
            ...lifecycle,
            tenant_score: scorecard.score
        },
        scorecard,
        activityLog: buildTenantActivityLog({
            houseId: house.id,
            payments: payments.map((payment) => ({
                id: payment.id,
                due_date: payment.due_date,
                paid_date: payment.paid_date,
                amount: Number(payment.amount || 0),
                status: normalizePaymentStatus(payment.status)
            })),
            reminders,
            agreement,
            lifecycle: {
                ...lifecycle,
                tenant_score: scorecard.score
            }
        })
    };
};

// --- Auth & Profile ---

export const updateUserProfile = async (updates: Partial<Profile>): Promise<Profile> => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
        throw new Error('Not authenticated');
    }

    const upsertData: any = {
        id: user.id
    };

    if (updates.full_name) upsertData.full_name = updates.full_name;
    if (updates.phone_number) upsertData.phone_number = updates.phone_number;
    if (typeof updates.aadhaar_number === 'string') upsertData.aadhaar_number = updates.aadhaar_number.replace(/\D/g, '').slice(0, 12);
    if (updates.avatar_url) upsertData.avatar_url = updates.avatar_url;
    if (updates.bio) upsertData.bio = updates.bio;
    if (updates.subscription_tier) upsertData.subscription_tier = updates.subscription_tier;
    if (updates.payment_methods) upsertData.payment_methods = updates.payment_methods;
    if (updates.is_verified !== undefined) upsertData.is_verified = updates.is_verified;
    if (updates.id_proof_url) upsertData.id_proof_url = updates.id_proof_url;

    if (updates.role) {
        const validatedRole = String(updates.role).toLowerCase();
        if (['owner', 'tenant'].includes(validatedRole)) {
            upsertData.role = validatedRole;
        }
    }

    let persistedProfile: Profile | null = null;

    const { data, error } = await supabase
        .from('profiles')
        .update(upsertData)
        .eq('id', user.id)
        .select()
        .single();

    if (error) {        
        const { data: checkData, error: checkError } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();

        if (!checkData && !checkError) {
          const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
          const { data: upsertRes, error: upsertErr } = await supabase
            .from('profiles')
            .upsert({ ...upsertData, full_name: fullName }, { onConflict: 'id' })
            .select()
            .single();
          
          if (!upsertErr) {
            persistedProfile = upsertRes as Profile;
          }
        }

        if (!persistedProfile) {
            throw new Error(`Database Error: ${error.message} (Code: ${error.code})`);
        }
    } else {
        persistedProfile = data as Profile;
    }

    const authMetadataUpdates: Record<string, any> = {};
    if (typeof updates.full_name === 'string' && updates.full_name.trim()) {
        authMetadataUpdates.full_name = updates.full_name.trim();
    }
    if (typeof updates.phone_number === 'string') {
        authMetadataUpdates.phone_number = updates.phone_number.trim();
    }
    if (typeof updates.aadhaar_number === 'string') {
        authMetadataUpdates.aadhaar_number = updates.aadhaar_number.replace(/\D/g, '').slice(0, 12);
    }
    if (updates.role) {
        authMetadataUpdates.role = updates.role;
    }

    if (Object.keys(authMetadataUpdates).length > 0) {
        void supabase.auth.updateUser({
            data: authMetadataUpdates
        }).then(({ error: authUpdateError }) => {
            if (authUpdateError) {
                console.warn("API: Auth metadata update failed, continuing with profile row as source of truth.", authUpdateError);
            }
        });
    }

    if (!persistedProfile) {
        throw new Error('Profile update completed without returning profile data.');
    }

    return {
        ...persistedProfile,
        aadhaar_number: authMetadataUpdates.aadhaar_number || updates.aadhaar_number || persistedProfile.aadhaar_number
    };
};

export const updateUserRole = async (role: UserRole): Promise<Profile> => {
    if (!role) throw new Error("A role must be selected.");
    return updateUserProfile({ role });
};

export const updatePaymentMethods = async (methods: PaymentMethods): Promise<Profile> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('profiles')
        .update({ payment_methods: methods })
        .eq('id', user.id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const uploadIdProof = async (file: File): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Math.random()}.${fileExt}`;
    const filePath = `id-proofs/${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('id-proofs')
        .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
        .from('id-proofs')
        .getPublicUrl(filePath);

    // Update profile with the URL
    await updateUserProfile({ id_proof_url: publicUrl });
    
    return publicUrl;
};

const sanitizeStorageFileName = (fileName: string) => fileName.replace(/[^a-zA-Z0-9._-]/g, '_');

export const uploadPropertyImages = async (files: File[]): Promise<string[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const uploadedUrls: string[] = [];

    for (const file of files) {
        const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}-${sanitizeStorageFileName(file.name)}`;
        const { error: uploadError } = await supabase.storage
            .from('property_images')
            .upload(filePath, file, { upsert: false });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('property_images')
            .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
    }

    return uploadedUrls;
};

export const getNotifications = async (): Promise<AppNotification[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const isTenant = user.user_metadata?.role === 'tenant';
    const baseNotifications: AppNotification[] = [
        {
            id: 'system-update',
            title: 'System Update',
            message: 'Nilayam operations desk is ready with billing, agreements, and reminders.',
            type: 'system',
            priority: 'medium',
            timestamp: new Date().toISOString()
        }
    ];

    let houses: any[] = [];
    if (isTenant) {
        const { data } = await supabase
            .from('houses')
            .select('id, tenant_id, tenant_name, house_number, lease_end_date, rent_amount, building_id, buildings(name)')
            .eq('tenant_id', user.id);
        houses = data || [];
    } else {
        const { data } = await supabase
            .from('houses')
            .select('id, tenant_id, tenant_name, house_number, lease_end_date, rent_amount, building_id, buildings!inner(name, owner_id)')
            .eq('buildings.owner_id', user.id);
        houses = data || [];
    }

    const opsNotifications = houses.flatMap((house: any) => {
        const ops = getStoredOperations(house.id);
        const reminders = (ops.reminders || [])
            .filter((record) => {
                const scheduled = new Date(record.scheduled_for).getTime();
                const withinWindow = scheduled <= Date.now() + 1000 * 60 * 60 * 24 * 7;
                return record.status === 'scheduled' && withinWindow;
            })
            .map(toReminderNotification);

        const dueUtilities = (ops.ledger || [])
            .filter((entry) => entry.category !== 'rent' && normalizeChargeStatus(entry) !== 'paid')
            .slice(0, 3)
            .map((entry) => ({
                id: `charge-${entry.id}`,
                title: `${titleCase(entry.category)} bill pending`,
                message: `Unit ${house.house_number}: ${entry.label} of ₹${Number(entry.amount || 0).toLocaleString('en-IN')} is due on ${new Date(entry.due_date).toLocaleDateString()}.`,
                type: 'billing',
                priority: normalizeChargeStatus(entry) === 'overdue' ? 'high' : 'medium',
                timestamp: entry.due_date,
                meta: { house_id: house.id }
            }));

        const leaseDays = house.lease_end_date
            ? Math.ceil((new Date(house.lease_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : null;
        const leaseNotice = leaseDays !== null && leaseDays <= 45
            ? [{
                id: `lease-${house.id}`,
                title: 'Agreement action due',
                message: `Unit ${house.house_number} agreement expires in ${Math.max(leaseDays, 0)} day(s). Start renewal or vacate closure.`,
                type: 'agreement',
                priority: leaseDays <= 15 ? 'high' : 'medium',
                timestamp: house.lease_end_date,
                meta: { house_id: house.id }
            }]
            : [];

        return [...reminders, ...dueUtilities, ...leaseNotice];
    });

    return [...opsNotifications, ...baseNotifications]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 12);
};

// --- Owner Dashboard ---

const getAuthenticatedUserId = async (providedUserId?: string): Promise<string> => {
    if (providedUserId) return providedUserId;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    return user.id;
};

export const getDashboardSummary = async (ownerId?: string): Promise<DashboardSummary> => {
    const resolvedOwnerId = await getAuthenticatedUserId(ownerId);

    const [
        propertiesResult,
        unitsResult,
        occupiedUnitsResult,
        maintenanceResult,
        paymentsResult,
        housesResult
    ] = await Promise.all([
        supabase.from('buildings').select('*', { count: 'exact', head: true }).eq('owner_id', resolvedOwnerId),
        supabase.from('houses').select('id, buildings!inner(owner_id)', { count: 'exact', head: true }).eq('buildings.owner_id', resolvedOwnerId),
        supabase.from('houses').select('id, buildings!inner(owner_id)', { count: 'exact', head: true }).eq('buildings.owner_id', resolvedOwnerId).not('tenant_name', 'is', null),
        supabase.from('maintenance_requests').select('id', { count: 'exact', head: true }).eq('owner_id', resolvedOwnerId).eq('status', 'open'),
        supabase.from('payments').select('amount, created_at, houses!inner(buildings!inner(owner_id))').eq('status', 'completed').eq('houses.buildings.owner_id', resolvedOwnerId),
        supabase.from('houses').select('rent_amount, buildings!inner(owner_id)').eq('buildings.owner_id', resolvedOwnerId).not('tenant_name', 'is', null)
    ]);

    if (propertiesResult.error) throw propertiesResult.error;
    if (unitsResult.error) throw unitsResult.error;
    if (occupiedUnitsResult.error) throw occupiedUnitsResult.error;
    if (maintenanceResult.error) throw maintenanceResult.error;
    if (paymentsResult.error) throw paymentsResult.error;
    if (housesResult.error) throw housesResult.error;

    const propertyCount = propertiesResult.count || 0;
    const unitCount = unitsResult.count || 0;
    const occupiedCount = occupiedUnitsResult.count || 0;
    const maintenanceCount = maintenanceResult.count || 0;
    const payments = paymentsResult.data || [];
    const houses = housesResult.data || [];

    // Calculate total monthly rent expected
    const totalExpectedRent = houses.reduce((sum, h: any) => sum + Number(h.rent_amount || 0), 0);
    
    // Calculate rent received this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const revenue = payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
    const revenueThisMonth = payments
        .filter((p: any) => new Date(p.created_at) >= startOfMonth)
        .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

    const outstanding = Math.max(0, totalExpectedRent - revenueThisMonth);

    return {
        totalProperties: propertyCount || 0,
        totalUnits: unitCount || 0,
        occupancyRate: unitCount ? Math.round(((occupiedCount || 0) / unitCount) * 100) : 0,
        totalRevenue: revenue,
        outstandingPayments: outstanding,
        maintenanceRequests: maintenanceCount || 0
    };
};

export const getFinancialSummary = async (ownerId?: string): Promise<FinancialDataPoint[]> => {
    const resolvedOwnerId = await getAuthenticatedUserId(ownerId);

    const transactionsResult = await supabase
        .from('transactions')
        .select('date, amount, type')
        .eq('owner_id', resolvedOwnerId)
        .order('date', { ascending: true });

    let groups: { [key: string]: FinancialDataPoint } = {};

    if (!transactionsResult.error && (transactionsResult.data || []).length > 0) {
        (transactionsResult.data || []).forEach((t: any) => {
            const month = new Date(t.date).toLocaleString('default', { month: 'short' });
            if (!groups[month]) groups[month] = { month, income: 0, expenses: 0 };
            if (t.type === 'income') groups[month].income += Number(t.amount || 0);
            else groups[month].expenses += Number(t.amount || 0);
        });

        return Object.values(groups);
    }

    const paymentsResult = await supabase
        .from('payments')
        .select('created_at, amount, houses!inner(buildings!inner(owner_id))')
        .eq('status', 'completed')
        .eq('houses.buildings.owner_id', resolvedOwnerId)
        .order('created_at', { ascending: true });

    if (paymentsResult.error) {
        throw transactionsResult.error || paymentsResult.error;
    }

    (paymentsResult.data || []).forEach((payment: any) => {
        const month = new Date(payment.created_at).toLocaleString('default', { month: 'short' });
        if (!groups[month]) groups[month] = { month, income: 0, expenses: 0 };
        groups[month].income += Number(payment.amount || 0);
    });

    return Object.values(groups);
};

export const getMonthlyFinancialsForInsights = getFinancialSummary;

export const getOccupancySummary = async (ownerId?: string): Promise<OccupancyDataPoint[]> => {
    const resolvedOwnerId = await getAuthenticatedUserId(ownerId);

    const totalResult = await supabase
        .from('houses')
        .select('id, buildings!inner(owner_id)', { count: 'exact', head: true })
        .eq('buildings.owner_id', resolvedOwnerId);

    const occupiedResult = await supabase
        .from('houses')
        .select('id, buildings!inner(owner_id)', { count: 'exact', head: true })
        .eq('buildings.owner_id', resolvedOwnerId)
        .not('tenant_name', 'is', null);

    if (totalResult.error) throw totalResult.error;
    if (occupiedResult.error) throw occupiedResult.error;

    const total = totalResult.count || 0;
    const occupied = occupiedResult.count || 0;

    const occupiedVal = occupied || 0;
    const vacantVal = (total || 0) - occupiedVal;

    return [
        { name: OccupancyStatus.Occupied, value: occupiedVal },
        { name: OccupancyStatus.Vacant, value: vacantVal }
    ];
};

// --- Properties & Units ---

export const getProperties = async (page: number, limit: number, filters?: any): Promise<{ data: Property[], count: number }> => {
    let query = supabase.from('buildings').select('*, houses(count)', { count: 'exact' });
    const { data, error, count } = await query.range((page - 1) * limit, page * limit - 1);
    if (error) throw error;

    const mapped: Property[] = (data || []).map((b: any) => ({
        ...b,
        unit_count: b.houses?.[0]?.count || 0
    }));

    return { data: mapped, count: count || 0 };
};

export const getAllPropertiesForDropdown = async (): Promise<{ id: string, name: string }[]> => {
    const { data, error } = await supabase.from('buildings').select('id, name');
    if (error) throw error;
    return data || [];
};

export const createPropertyWithUnits = async (buildingData: any, units: any[]): Promise<Property> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not found");

    // Check subscription tier and current properties count
    const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
    if (profile?.subscription_tier === 'basic' || !profile?.subscription_tier) {
        const { count } = await supabase.from('buildings').select('*', { count: 'exact', head: true }).eq('owner_id', user.id);
        // Allow ONLY 2 properties on the basic tier
        if (count && count >= 2) {
            throw new Error("Basic plan allows up to 2 properties. Please upgrade to Pro.");
        }
    }

    const { data: building, error: bError } = await supabase
        .from('buildings')
        .insert([{ ...buildingData, owner_id: user.id }])
        .select()
        .single();

    if (bError) throw bError;

    const unitsWithId = units.map(u => ({ ...u, building_id: building.id }));
    const { error: uError } = await supabase.from('houses').insert(unitsWithId);
    if (uError) throw uError;

    return { ...building, unit_count: units.length };
};

export const updateProperty = async (id: string, updates: any): Promise<void> => {
    const { error } = await supabase.from('buildings').update(updates).eq('id', id);
    if (error) throw error;
};

export const deleteProperty = async (id: string): Promise<void> => {
    const { error } = await supabase.from('buildings').delete().eq('id', id);
    if (error) throw error;
};

export const getUnitsForProperty = async (propertyId: string): Promise<any[]> => {
    const { data, error } = await supabase.from('houses').select('*').eq('building_id', propertyId);
    if (error) throw error;
    return data || [];
};

export const getVacantUnitsForProperty = async (propertyId: string): Promise<VacantUnit[]> => {
    const { data, error } = await supabase
        .from('houses')
        .select('id, house_number, rent_amount, buildings(id, name)')
        .eq('building_id', propertyId)
        .is('tenant_name', null);
    if (error) throw error;

    return (data || []).map((h: any) => ({
        id: h.id,
        house_number: h.house_number,
        rent_amount: h.rent_amount,
        buildings: Array.isArray(h.buildings) ? h.buildings[0] : h.buildings
    }));
};

export const getVacantUnits = async (): Promise<VacantUnit[]> => {
    const { data, error } = await supabase
        .from('houses')
        .select('id, house_number, rent_amount, buildings(id, name)')
        .is('tenant_name', null);
    if (error) throw error;

    return (data || []).map((h: any) => ({
        id: h.id,
        house_number: h.house_number,
        rent_amount: h.rent_amount,
        buildings: Array.isArray(h.buildings) ? h.buildings[0] : h.buildings
    }));
};

export const getUnlistedVacantUnits = async (): Promise<DetailedVacantUnit[]> => {
    const { data, error } = await supabase
        .from('houses')
        .select('id, house_number, rent_amount, building_id, buildings(id, name, address, property_type)')
        .is('tenant_name', null)
        .eq('is_listed_on_marketplace', false);
    if (error) throw error;
    return (data || []).map((d: any) => ({
        ...d,
        buildings: d.buildings
    }));
};

export const updateHouse = async (id: string, updates: any): Promise<void> => {
    const { error } = await supabase.from('houses').update(updates).eq('id', id);
    if (error) throw error;
};

// --- Tenants & Payments ---

export const getTenants = async (page: number, limit: number, search: string = ''): Promise<{ data: Tenant[], count: number }> => {
    let query = supabase
        .from('houses')
        .select('id, tenant_name, tenant_phone_number, house_number, buildings(name)', { count: 'exact' })
        .not('tenant_name', 'is', null);

    if (search) query = query.ilike('tenant_name', `%${search}%`);

    const { data, error, count } = await query.range((page - 1) * limit, page * limit - 1);
    if (error) throw error;

    const tenants: Tenant[] = (data || []).map((h: any) => {
        const lifecycle = buildDefaultLifecycle(h, getStoredOperations(h.id).lifecycle);
        return {
            id: h.id,
            name: h.tenant_name,
            phone_number: h.tenant_phone_number,
            building_name: h.buildings?.name,
            house_number: h.house_number,
            tenant_score: Number(lifecycle.tenant_score || 0)
        };
    });

    return { data: tenants, count: count || 0 };
};

export const assignTenantToUnit = async (
    unitId: string,
    tenantData: {
        name: string,
        phone: string,
        leaseEnd?: string,
        moveInDate?: string,
        advanceAmount?: number,
        advanceReceivedOn?: string,
        possessionHandoverOn?: string
        aadhaarNumber?: string,
    }
): Promise<void> => {
    const { error } = await supabase.from('houses').update({
        tenant_name: tenantData.name,
        tenant_phone_number: normalizePhoneNumber(tenantData.phone),
        lease_end_date: tenantData.leaseEnd || null
    }).eq('id', unitId);
    if (error) throw error;

    const stored = getStoredOperations(unitId);
    const normalizedAadhaar = tenantData.aadhaarNumber?.replace(/\D/g, '') || '';
    const registry = getTenantIdentityRegistry();
    const matchedScore = normalizedAadhaar ? Number(registry[normalizedAadhaar]?.tenant_score || 0) : 0;

    setStoredOperations(unitId, {
        ...stored,
        lifecycle: {
            ...(stored.lifecycle || {}),
            move_in_date: tenantData.moveInDate || stored.lifecycle?.move_in_date || null,
            advance_amount: Number(tenantData.advanceAmount || stored.lifecycle?.advance_amount || 0),
            advance_received_on: tenantData.advanceReceivedOn || stored.lifecycle?.advance_received_on || null,
            possession_handover_on: tenantData.possessionHandoverOn || stored.lifecycle?.possession_handover_on || tenantData.moveInDate || null,
            aadhaar_number: normalizedAadhaar || stored.lifecycle?.aadhaar_number || null,
            tenant_score: matchedScore,
        }
    });

    if (normalizedAadhaar) {
        setTenantIdentityRegistry({
            ...registry,
            [normalizedAadhaar]: {
                aadhaar_number: normalizedAadhaar,
                tenant_score: matchedScore,
                name: tenantData.name,
                phone: normalizePhoneNumber(tenantData.phone)
            }
        });
    }
};

const resolveTenantAssignmentMatch = async (userId: string, normalizedPhone: string, normalizedAadhaar: string): Promise<string | null> => {
    const operationEntries = getAllStoredOperationEntries();
    const aadhaarMatchedEntry = normalizedAadhaar
        ? operationEntries.find((entry) => normalizeAadhaarNumber(entry.data.lifecycle?.aadhaar_number) === normalizedAadhaar)
        : null;

    const { data: possibleHouses, error: housesError } = await supabase
        .from('houses')
        .select('id, tenant_phone_number, tenant_id, tenant_name')
        .not('tenant_name', 'is', null);

    if (housesError) throw housesError;

    const normalizedHouses = (possibleHouses || []).filter((house: any) => !house.tenant_id || house.tenant_id === userId);
    const phoneMatchedHouse = normalizedPhone
        ? normalizedHouses.find((house: any) => normalizePhoneNumber(house.tenant_phone_number) === normalizedPhone)
        : null;

    return aadhaarMatchedEntry?.houseId || phoneMatchedHouse?.id || null;
};

const attachTenantToMatchedHouse = async (userId: string, houseId: string, normalizedPhone: string, normalizedAadhaar: string) => {
    const { error: attachError } = await supabase
        .from('houses')
        .update({
            tenant_id: userId,
            tenant_phone_number: normalizedPhone
        })
        .eq('id', houseId);

    if (attachError) throw attachError;

    const stored = getStoredOperations(houseId);
    const matchedScore = normalizedAadhaar ? await lookupTenantScoreByAadhaar(normalizedAadhaar) : 0;
    setStoredOperations(houseId, {
        ...stored,
        lifecycle: {
            ...(stored.lifecycle || {}),
            aadhaar_number: normalizedAadhaar || stored.lifecycle?.aadhaar_number || null,
            tenant_score: Number(stored.lifecycle?.tenant_score || matchedScore || 0),
        }
    });

    return matchedScore;
};

export const completeTenantOnboarding = async (payload: { phoneNumber: string; aadhaarNumber: string }): Promise<{ matchedHouseId: string | null }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const normalizedPhone = normalizePhoneNumber(payload.phoneNumber);
    const normalizedAadhaar = payload.aadhaarNumber.replace(/\D/g, '').slice(0, 12);

    if (!normalizedPhone || normalizedPhone.length < 10) {
        throw new Error('Please enter a valid mobile number.');
    }

    if (!normalizedAadhaar || normalizedAadhaar.length !== 12) {
        throw new Error('Please enter a valid 12-digit Aadhaar number.');
    }

    const updatedProfile = await updateUserProfile({
        phone_number: normalizedPhone,
        aadhaar_number: normalizedAadhaar
    });
    const matchedHouseId = await resolveTenantAssignmentMatch(user.id, normalizedPhone, normalizedAadhaar);

    if (matchedHouseId) {
        await attachTenantToMatchedHouse(user.id, matchedHouseId, normalizedPhone, normalizedAadhaar);
    }

    const registry = getTenantIdentityRegistry();
    const matchedScore = await lookupTenantScoreByAadhaar(normalizedAadhaar);
    setTenantIdentityRegistry({
        ...registry,
        [normalizedAadhaar]: {
            aadhaar_number: normalizedAadhaar,
            tenant_score: Number(registry[normalizedAadhaar]?.tenant_score || matchedScore || 0),
            name: updatedProfile.full_name,
            phone: normalizedPhone
        }
    });

    return { matchedHouseId };
};

export const reconcileTenantAssignment = async (): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: existingHouse } = await supabase
        .from('houses')
        .select('id')
        .eq('tenant_id', user.id)
        .maybeSingle();

    if (existingHouse?.id) {
        return existingHouse.id;
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('phone_number, aadhaar_number')
        .eq('id', user.id)
        .maybeSingle();

    const normalizedPhone = normalizePhoneNumber(profile?.phone_number || (user.user_metadata?.phone_number as string | undefined));
    const normalizedAadhaar = normalizeAadhaarNumber(String(profile?.aadhaar_number || user.user_metadata?.aadhaar_number || ''));

    if (!normalizedPhone && !normalizedAadhaar) {
        return null;
    }

    const matchedHouseId = await resolveTenantAssignmentMatch(user.id, normalizedPhone, normalizedAadhaar);
    if (!matchedHouseId) {
        return null;
    }

    await attachTenantToMatchedHouse(user.id, matchedHouseId, normalizedPhone, normalizedAadhaar);
    return matchedHouseId;
};

const tenantHouseSelect = `
    id,
    rent_amount,
    lease_end_date,
    house_number,
    building_id,
    buildings (
        name,
        address,
        cctv_url,
        owner_id
    )
`;

const getTenantHouseByIdentity = async (user: User): Promise<any | null> => {
    let normalizedPhone = normalizePhoneNumber(user.user_metadata?.phone_number as string | undefined);
    let normalizedAadhaar = normalizeAadhaarNumber(user.user_metadata?.aadhaar_number as string | undefined);

    if (!normalizedPhone || !normalizedAadhaar) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('phone_number, aadhaar_number')
            .eq('id', user.id)
            .maybeSingle();

        normalizedPhone = normalizedPhone || normalizePhoneNumber(profile?.phone_number);
        normalizedAadhaar = normalizedAadhaar || normalizeAadhaarNumber(profile?.aadhaar_number);
    }

    const matchedHouseId = await resolveTenantAssignmentMatch(user.id, normalizedPhone, normalizedAadhaar);

    if (!matchedHouseId) {
        return null;
    }

    if (normalizedPhone || normalizedAadhaar) {
        await attachTenantToMatchedHouse(user.id, matchedHouseId, normalizedPhone, normalizedAadhaar);
    }

    const { data: houseData, error: houseError } = await supabase
        .from('houses')
        .select(tenantHouseSelect)
        .eq('id', matchedHouseId)
        .single();

    if (houseError) throw houseError;
    return houseData;
};

export const getTenantDetailsWithPayments = async (tenantId: string): Promise<any> => {
    const { data, error } = await supabase
        .from('houses')
        .select('*, buildings(name, id, owner_id)')
        .eq('id', tenantId)
        .single();
    if (error) throw error;

    const { data: paymentRows, error: paymentsError } = await supabase
        .from('payments')
        .select('id, payment_type, created_at, due_date, paid_date, amount, status, receipt_url, razorpay_payment_id')
        .eq('house_id', tenantId)
        .order('due_date', { ascending: false });

    if (paymentsError) throw paymentsError;

    const payments = await Promise.all((paymentRows || []).map(async (payment: any) => ({
        id: payment.id,
        payment_type: payment.payment_type,
        created_at: payment.created_at,
        due_date: payment.due_date,
        paid_date: payment.paid_date || undefined,
        amount: Number(payment.amount || 0),
        status: normalizePaymentStatus(payment.status),
        proof_url: await resolveReceiptUrl(payment.receipt_url),
        payment_mode: payment.razorpay_payment_id ? 'razorpay' : payment.receipt_url ? 'manual' : undefined,
        razorpay_payment_id: payment.razorpay_payment_id || undefined
    })));

    const { data: maintenanceRows } = await supabase
        .from('maintenance_requests')
        .select('id, description, created_at, status')
        .eq('house_id', tenantId)
        .order('created_at', { ascending: false });

    const baseOperations = getTenantOperationalData(data, paymentRows || []);
    const scorecard = buildTenantScoreSummary({
        lifecycle: baseOperations.lifecycle,
        payments: paymentRows || [],
        reminders: baseOperations.reminders,
        openMaintenanceCount: (maintenanceRows || []).filter((row: any) => row.status !== 'resolved' && row.status !== 'closed').length
    });
    const operations: TenantOperationalData = {
        ...baseOperations,
        lifecycle: {
            ...baseOperations.lifecycle,
            tenant_score: scorecard.score
        },
        scorecard,
        activityLog: buildTenantActivityLog({
            houseId: data.id,
            payments,
            reminders: baseOperations.reminders,
            agreement: baseOperations.agreement,
            lifecycle: {
                ...baseOperations.lifecycle,
                tenant_score: scorecard.score
            },
            openMaintenanceRequests: maintenanceRows || []
        })
    };
    const ownerId = data.buildings?.owner_id;
    let ownerProfile: { full_name?: string | null; phone_number?: string | null } | null = null;

    if (ownerId) {
        const { data: ownerData, error: ownerError } = await supabase
            .from('profiles')
            .select('full_name, phone_number')
            .eq('id', ownerId)
            .maybeSingle();

        if (ownerError && ownerError.code !== 'PGRST116') throw ownerError;
        ownerProfile = ownerData;
    }

    return {
        ...data,
        building_name: data.buildings?.name,
        building_id: data.buildings?.id,
        owner_name: ownerProfile?.full_name || 'Property Owner',
        owner_phone_number: ownerProfile?.phone_number || null,
        payments,
        operations,
        lifecycle: operations.lifecycle,
        tenant_score: Number(operations.lifecycle?.tenant_score || 0),
        scorecard: operations.scorecard,
        activityLog: operations.activityLog
    };
};

export const addTenantCharge = async (
    houseId: string,
    charge: Omit<ChargeLedgerEntry, 'id' | 'house_id' | 'source' | 'status'>
): Promise<ChargeLedgerEntry> => {
    const stored = getStoredOperations(houseId);
    const entry: ChargeLedgerEntry = {
        ...charge,
        id: `charge_${houseId}_${Date.now()}`,
        house_id: houseId,
        source: 'manual',
        status: normalizeChargeStatus({
            ...charge,
            id: '',
            house_id: houseId,
            source: 'manual',
            status: 'due'
        } as ChargeLedgerEntry)
    };

    setStoredOperations(houseId, {
        ...stored,
        ledger: [...(stored.ledger || []), entry]
    });

    return entry;
};

export const updateTenantAgreement = async (houseId: string, agreement: Partial<AgreementWorkflow>): Promise<AgreementWorkflow> => {
    const stored = getStoredOperations(houseId);
    const nextAgreement: AgreementWorkflow = {
        ...(stored.agreement || buildDefaultAgreement({ id: houseId, lease_end_date: agreement.agreement_end_date || null, tenant_id: agreement.tenant_id || null })),
        ...agreement,
        special_clauses: agreement.special_clauses ?? stored.agreement?.special_clauses ?? [],
        house_id: houseId,
        last_updated_at: new Date().toISOString()
    };

    setStoredOperations(houseId, {
        ...stored,
        agreement: nextAgreement
    });

    return nextAgreement;
};

const buildAgreementDocumentTemplate = (payload: {
    ownerName?: string | null;
    tenantName?: string | null;
    buildingName?: string | null;
    houseNumber?: string | null;
    agreement: AgreementWorkflow;
}) => {
    const {
        ownerName = 'Property Owner',
        tenantName = 'Tenant',
        buildingName = 'Property',
        houseNumber = 'Unit',
        agreement
    } = payload;

    const clauses = (agreement.special_clauses || []).filter(Boolean);
    const extraClauses = clauses.length
        ? clauses.map((clause, index) => `${index + 1}. ${clause}`).join('\n')
        : '1. The parties will follow standard house rules, payment timelines, and possession obligations recorded in the Nilayam workflow.';

    return [
        `${agreement.template_name || 'Rental Agreement Draft'}`,
        ``,
        `Agreement Type: ${titleCase(agreement.agreement_type)}`,
        `Status: ${titleCase(agreement.status)}`,
        `Owner / Licensor: ${ownerName}`,
        `Tenant / Occupant: ${tenantName}`,
        `Premises: ${buildingName}, Unit ${houseNumber}`,
        `Agreement Start Date: ${agreement.agreement_start_date || 'To be finalized'}`,
        `Agreement End Date: ${agreement.agreement_end_date || 'To be finalized'}`,
        `Monthly Rent: INR ${Number(agreement.monthly_rent || 0).toLocaleString('en-IN')}`,
        `Security Deposit: INR ${Number(agreement.security_deposit || 0).toLocaleString('en-IN')}`,
        `Notice Period: ${agreement.notice_period_days || 30} days`,
        `Renewal Notice Window: ${agreement.renewal_notice_days} days`,
        ``,
        `Owner Requirements`,
        `${agreement.owner_requirements || 'No additional owner requirements recorded.'}`,
        ``,
        `Tenant Requirements`,
        `${agreement.tenant_requirements || 'No additional tenant requirements recorded.'}`,
        ``,
        `Special Clauses`,
        `${extraClauses}`,
        ``,
        `Legal Advisory Notes`,
        `${agreement.legal_notes || 'This workflow draft should be reviewed with a qualified legal professional before execution, stamp duty payment, registration, or notarization.'}`,
        ``,
        `Operational Guidance`,
        `1. Rent shall be payable on or before the due date agreed between both parties.`,
        `2. Any move-in handover, maintenance allocation, and closure settlement should be documented inside Nilayam.`,
        `3. Renewal, vacate, and deposit settlement decisions should be acknowledged by both parties in writing.`,
        ``,
        `Drafted in Nilayam on ${new Date().toLocaleString('en-IN')}.`
    ].join('\n');
};

export const generateAgreementDraft = async (payload: {
    houseId: string;
    ownerName?: string | null;
    tenantName?: string | null;
    buildingName?: string | null;
    houseNumber?: string | null;
    agreement: AgreementWorkflow;
}): Promise<AgreementWorkflow> => {
    const fallbackDocument = buildAgreementDocumentTemplate(payload);
    let draftedDocument = fallbackDocument;

    try {
        const apiKey = getGeminiApiKey();
        if (apiKey) {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({
                model: 'gemini-1.5-flash',
                systemInstruction: 'Act as an Indian real-estate legal drafting assistant. Produce clear agreement text for workflow support. Do not claim final legal enforceability.'
            });
            const response = await model.generateContent(`
Draft a clear Indian property agreement workflow document.
Owner: ${payload.ownerName || 'Property Owner'}
Tenant: ${payload.tenantName || 'Tenant'}
Property: ${payload.buildingName || 'Property'}, Unit ${payload.houseNumber || 'Unit'}
Agreement Type: ${payload.agreement.agreement_type}
Start Date: ${payload.agreement.agreement_start_date || 'To be finalized'}
End Date: ${payload.agreement.agreement_end_date || 'To be finalized'}
Monthly Rent: INR ${Number(payload.agreement.monthly_rent || 0)}
Security Deposit: INR ${Number(payload.agreement.security_deposit || 0)}
Owner Requirements: ${payload.agreement.owner_requirements || 'None provided'}
Tenant Requirements: ${payload.agreement.tenant_requirements || 'None provided'}
Special Clauses: ${(payload.agreement.special_clauses || []).join(' | ') || 'None'}
Legal Notes: ${payload.agreement.legal_notes || 'Standard local compliance note'}

Structure the response with sections for parties, premises, commercial terms, use restrictions, maintenance responsibility, deposit handling, renewal/vacate workflow, and advisory note. Plain text only.
            `);
            const aiText = response.response.text()?.trim();
            if (aiText) {
                draftedDocument = aiText;
            }
        }
    } catch (error) {
        console.warn('API: Agreement AI drafting failed. Falling back to local template.', error);
    }

    return updateTenantAgreement(payload.houseId, {
        ...payload.agreement,
        drafted_document: draftedDocument,
        drafted_at: new Date().toISOString(),
        status: payload.agreement.status === 'draft' ? 'active' : payload.agreement.status
    });
};

export const getOwnerAgreementWorkspaces = async (): Promise<AgreementWorkspaceItem[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();

    const { data: houses, error } = await supabase
        .from('houses')
        .select('id, tenant_id, tenant_name, house_number, rent_amount, lease_end_date, buildings!inner(id, name, owner_id)')
        .eq('buildings.owner_id', user.id)
        .not('tenant_id', 'is', null)
        .order('house_number', { ascending: true });

    if (error) throw error;

    return (houses || []).map((house: any) => {
        const operations = getTenantOperationalData(house, []);
        return {
            house_id: house.id,
            tenant_id: house.tenant_id || null,
            tenant_name: house.tenant_name || 'Tenant',
            building_id: house.buildings?.id,
            building_name: house.buildings?.name || 'Property',
            house_number: house.house_number,
            rent_amount: Number(house.rent_amount || 0),
            lease_end_date: house.lease_end_date,
            agreement: {
                ...operations.agreement,
                legal_notes: operations.agreement.legal_notes || `Owner of record: ${ownerProfile?.full_name || 'Property Owner'}. Review stamp duty and registration requirements based on the property's jurisdiction.`
            },
            lifecycle: operations.lifecycle
        } as AgreementWorkspaceItem;
    });
};

export const getTenantAgreementWorkspace = async (): Promise<AgreementWorkspaceItem | null> => {
    const dashboard = await getTenantDashboardData();
    if (!dashboard?.agreement) return null;

    const { data: { user } } = await supabase.auth.getUser();

    return {
        house_id: dashboard.tenancyDetails.house_id,
        tenant_id: user?.id || null,
        tenant_name: user?.user_metadata?.full_name || 'Tenant',
        building_name: dashboard.tenancyDetails.building_name,
        house_number: dashboard.tenancyDetails.house_number,
        rent_amount: Number(dashboard.tenancyDetails.rent_amount || 0),
        lease_end_date: dashboard.tenancyDetails.lease_end_date,
        agreement: dashboard.agreement,
        lifecycle: dashboard.lifecycle
    };
};

export const scheduleTenantReminder = async (
    houseId: string,
    reminder: Omit<ReminderRecord, 'id' | 'house_id' | 'created_at' | 'status'>
): Promise<ReminderRecord> => {
    const stored = getStoredOperations(houseId);
    const record: ReminderRecord = {
        ...reminder,
        id: `reminder_${houseId}_${Date.now()}`,
        house_id: houseId,
        created_at: new Date().toISOString(),
        status: 'scheduled'
    };

    setStoredOperations(houseId, {
        ...stored,
        reminders: [...(stored.reminders || []), record]
    });

    return record;
};

export const updateTenantLifecycle = async (houseId: string, lifecycle: Partial<TenantLifecycleData>): Promise<TenantLifecycleData> => {
    const stored = getStoredOperations(houseId);
    const nextLifecycle = {
        ...(stored.lifecycle || {}),
        ...lifecycle
    };

    setStoredOperations(houseId, {
        ...stored,
        lifecycle: nextLifecycle
    });

    return buildDefaultLifecycle({ id: houseId }, nextLifecycle);
};

export const acknowledgeTenantAgreement = async (houseId: string, note?: string): Promise<TenantLifecycleData> => {
    return updateTenantLifecycle(houseId, {
        agreement_acknowledged_at: new Date().toISOString(),
        agreement_acceptance_note: note || 'Agreement acknowledged by tenant.'
    });
};

export const markReminderAsSent = async (houseId: string, reminderId: string): Promise<void> => {
    const stored = getStoredOperations(houseId);
    const reminders: ReminderRecord[] = (stored.reminders || []).map((record) =>
        record.id === reminderId
            ? { ...record, status: 'sent', sent_at: new Date().toISOString() }
            : record
    );

    setStoredOperations(houseId, {
        ...stored,
        reminders
    });
};

export const markPaymentAsPaid = async (paymentId: string): Promise<void> => {
    const remote = await invokeEdgeFunction('payment-authority', {
        action: 'mark_paid',
        paymentId
    });
    if (remote) return;

    const { error } = await supabase
        .from('payments')
        .update({
            status: 'completed',
            paid_date: new Date().toISOString().slice(0, 10)
        })
        .eq('id', paymentId)
        .in('status', ['pending', 'due', 'failed']);

    if (error) throw error;
};

export const submitManualPaymentProof = async (payload: {
    paymentId?: string;
    tenantId: string;
    houseId: string;
    amount: number;
    paymentType: 'rent' | 'maintenance' | 'security_deposit' | 'subscription';
    proofFile: File;
}): Promise<void> => {
    const remote = await invokeEdgeFunction('payment-authority', {
        action: 'submit_manual_proof',
        tenantId: payload.tenantId,
        houseId: payload.houseId,
        paymentId: payload.paymentId || null,
        amount: payload.amount,
        paymentType: payload.paymentType,
        fileName: payload.proofFile.name
    });

    const filePath = `${payload.tenantId}/${Date.now()}-${sanitizeFileName(payload.proofFile.name)}`;
    const { error: uploadError } = await supabase.storage
        .from(paymentProofsBucket)
        .upload(filePath, payload.proofFile, { upsert: false });

    if (uploadError) throw uploadError;

    const updatePayload = {
        tenant_id: payload.tenantId,
        house_id: payload.houseId,
        amount: payload.amount,
        payment_type: payload.paymentType,
        status: 'pending',
        receipt_url: filePath,
        paid_date: null
    };

    if (payload.paymentId) {
        const { error } = await supabase
            .from('payments')
            .update(updatePayload)
            .eq('id', payload.paymentId);
        if (error) throw error;
        if (!remote) {
            await supabase.from('approval_requests').insert({
                owner_id: null,
                request_type: 'manual_payment_review',
                entity_table: 'payments',
                entity_id: payload.paymentId,
                submitted_by: payload.tenantId,
                notes: 'Manual payment proof uploaded by tenant and awaiting owner review.'
            }).then(() => undefined).catch(() => undefined);
        }
        return;
    }

    const { data: insertedPayment, error } = await supabase
        .from('payments')
        .insert(updatePayload)
        .select('id')
        .single();

    if (error) throw error;
    if (!remote && insertedPayment?.id) {
        await supabase.from('approval_requests').insert({
            owner_id: null,
            request_type: 'manual_payment_review',
            entity_table: 'payments',
            entity_id: insertedPayment.id,
            submitted_by: payload.tenantId,
            notes: 'Manual payment proof uploaded by tenant and awaiting owner review.'
        }).then(() => undefined).catch(() => undefined);
    }
};

export const approveTenantPayment = async (paymentId: string): Promise<void> => {
    const remote = await invokeEdgeFunction('payment-authority', {
        action: 'approve_payment',
        paymentId
    });
    if (remote) return;

    const { error } = await supabase
        .from('payments')
        .update({
            status: 'completed',
            paid_date: new Date().toISOString().slice(0, 10)
        })
        .eq('id', paymentId);

    if (error) throw error;
};

export const rejectTenantPayment = async (paymentId: string): Promise<void> => {
    const remote = await invokeEdgeFunction('payment-authority', {
        action: 'reject_payment',
        paymentId
    });
    if (remote) return;

    const { error } = await supabase
        .from('payments')
        .update({
            status: 'failed',
            paid_date: null
        })
        .eq('id', paymentId);

    if (error) throw error;
};

export const getOwnerPaymentsDashboard = async (filters: OwnerPaymentFilters = {}): Promise<OwnerPaymentsDashboard> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: propertyRows, error: propertyError } = await supabase
        .from('buildings')
        .select('id, name')
        .eq('owner_id', user.id)
        .order('name', { ascending: true });

    if (propertyError) throw propertyError;

    const propertyOptions: OwnerPaymentPropertyOption[] = (propertyRows || []).map((property: any) => ({
        id: property.id,
        name: property.name
    }));

    let query = supabase
        .from('payments')
        .select(`
            id,
            payment_type,
            created_at,
            due_date,
            paid_date,
            amount,
            status,
            receipt_url,
            razorpay_payment_id,
            tenant_id,
            houses!inner(
                id,
                house_number,
                tenant_name,
                tenant_phone_number,
                buildings!inner(
                    id,
                    name,
                    owner_id
                )
            )
        `)
        .eq('houses.buildings.owner_id', user.id)
        .order('created_at', { ascending: false });

    if (filters.propertyId) {
        query = query.eq('houses.buildings.id', filters.propertyId);
    }

    const { data: paymentRows, error: paymentsError } = await query;
    if (paymentsError) throw paymentsError;

    const searchTerm = filters.search?.trim().toLowerCase() || '';
    const resolvedPayments = await Promise.all((paymentRows || []).map(async (payment: any) => {
        const status = normalizePaymentStatus(payment.status);
        return {
            id: payment.id,
            payment_type: payment.payment_type,
            created_at: payment.created_at,
            due_date: payment.due_date,
            paid_date: payment.paid_date || undefined,
            amount: Number(payment.amount || 0),
            status,
            proof_url: await resolveReceiptUrl(payment.receipt_url),
            payment_mode: payment.razorpay_payment_id ? 'razorpay' : payment.receipt_url ? 'manual' : undefined,
            razorpay_payment_id: payment.razorpay_payment_id || undefined,
            tenant_name: payment.houses?.tenant_name || null,
            tenant_phone_number: payment.houses?.tenant_phone_number || null,
            building_name: payment.houses?.buildings?.name || null,
            house_number: payment.houses?.house_number || null
        } as Payment;
    }));

    const filteredPayments = resolvedPayments.filter((payment) => {
        const matchesStatus = !filters.status || filters.status === 'all' || payment.status === filters.status;
        const matchesMode = !filters.paymentMode || filters.paymentMode === 'all' || payment.payment_mode === filters.paymentMode;
        const matchesSearch = !searchTerm || [
            payment.tenant_name,
            payment.tenant_phone_number,
            payment.building_name,
            payment.house_number,
            payment.payment_type
        ].some((value) => String(value || '').toLowerCase().includes(searchTerm));

        return matchesStatus && matchesMode && matchesSearch;
    });

    const pendingApprovals = filteredPayments.filter((payment) => payment.status === 'pending' && payment.payment_mode === 'manual');
    const recentPayments = [...filteredPayments].slice(0, 8);

    const summary = resolvedPayments.reduce((acc, payment) => {
        if (payment.status === 'paid') {
            acc.totalCollected += payment.amount;
            if (isCurrentMonth(payment.paid_date || payment.created_at)) {
                acc.collectionsThisMonth += payment.amount;
            }
        }

        if (payment.status === 'pending') {
            acc.pendingVerificationAmount += payment.amount;
            acc.pendingVerificationCount += 1;
            if (payment.payment_mode === 'manual') {
                acc.manualProofCount += 1;
            }
        }

        if (payment.status === 'due' || payment.status === 'failed') {
            acc.overdueAmount += payment.amount;
            acc.overdueCount += 1;
        }

        if (payment.payment_mode === 'razorpay') {
            acc.onlinePaymentCount += 1;
        }

        return acc;
    }, {
        totalCollected: 0,
        pendingVerificationAmount: 0,
        overdueAmount: 0,
        overdueCount: 0,
        collectionsThisMonth: 0,
        pendingVerificationCount: 0,
        manualProofCount: 0,
        onlinePaymentCount: 0
    });

    return {
        summary,
        payments: filteredPayments,
        pendingApprovals,
        recentPayments,
        propertyOptions
    };
};

// --- Transactions & Reports ---

// --- Transactions & Reports ---

export const getTransactions = async (page: number, limit: number, filters: any, sort: any): Promise<{ data: Transaction[], count: number }> => {
    let query = supabase.from('payments').select('*, houses(house_number, buildings(name))', { count: 'exact' });

    if (filters.type) query = query.eq('payment_type', filters.type);
    if (filters.startDate) query = query.gte('created_at', filters.startDate);
    if (filters.endDate) query = query.lte('created_at', filters.endDate);

    query = query.order('created_at', { ascending: sort.order === 'asc' });

    const { data, error, count } = await query.range((page - 1) * limit, page * limit - 1);
    if (error) throw error;

    const mapped: Transaction[] = (data || []).map((p: any) => ({
        id: p.id,
        date: p.created_at,
        description: `${p.payment_type.toUpperCase()} - ${p.houses?.buildings?.name} (Unit ${p.houses?.house_number})`,
        category: p.payment_type,
        amount: Number(p.amount),
        type: 'income'
    }));

    return { data: mapped, count: count || 0 };
};

export const getFinancialsOverview = async (): Promise<{ totalIncome: number, totalExpenses: number, netProfit: number }> => {
    const { data, error } = await supabase.from('transactions').select('amount, type');
    if (error) throw error;

    const totals = (data || []).reduce((acc, curr) => {
        if (curr.type === 'income') acc.totalIncome += curr.amount;
        else acc.totalExpenses += curr.amount;
        return acc;
    }, { totalIncome: 0, totalExpenses: 0 });

    return {
        ...totals,
        netProfit: totals.totalIncome - totals.totalExpenses
    };
};

export const getEnterpriseOpsSnapshot = async (): Promise<EnterpriseOpsSnapshot> => {
    const fallback = getStoredEnterpriseSnapshot();

    const counts = await Promise.all([
        safeCount('owner_linked_accounts', { eq: { kyc_status: 'pending' } }),
        safeCount('payout_retry_queue', { in: { status: ['queued', 'retrying'] } }),
        safeCount('razorpay_webhook_events', { in: { processing_status: ['received', 'failed'] } }),
        safeCount('accounting_adjustments', { eq: { approval_status: 'pending' } }),
        safeCount('tenant_lifecycle_tasks', { in: { status: ['pending', 'in_progress'] } }),
        safeCount('approval_requests', { eq: { status: 'pending' } }),
        safeCount('marketplace_disputes', { in: { status: ['open', 'review'] } }),
        safeCount('notification_queue', { in: { status: ['queued', 'retrying'] } }),
        safeCount('document_verification_reviews', { eq: { status: 'pending' } }),
        safeCount('job_runs', { in: { status: ['failed', 'retrying'] } }),
        safeCount('analytics_snapshots'),
        safeCount('security_incidents', { in: { status: ['open', 'monitoring'] } })
    ]);

    if (counts.every((value) => value === null)) {
        if (!allowLocalFallback()) {
            throw new Error('Enterprise ops tables are not available. Apply the Supabase enterprise migrations before opening admin workspaces.');
        }
        const finance = await getFinanceERPWorkspace();
        const maintenance = await getMaintenanceERPWorkspace();
        const crm = await getCRMWorkspace();

        const derived: EnterpriseOpsSnapshot = {
            linkedAccountsPending: fallback.linkedAccountsPending,
            payoutRetriesQueued: finance.payouts.filter((payout) => payout.payout_status === 'failed' || payout.payout_status === 'processing').length,
            webhookEventsPending: fallback.webhookEventsPending,
            accountingExceptions: finance.reconciliations.filter((record) => record.status !== 'matched').length,
            tenantLifecycleTasks: crm.leads.filter((lead) => lead.stage !== 'won' && lead.stage !== 'lost').length,
            approvalTasks: fallback.approvalTasks,
            marketplaceDisputes: fallback.marketplaceDisputes,
            notificationsQueued: fallback.notificationsQueued,
            documentsPendingReview: fallback.documentsPendingReview,
            jobsFailing: fallback.jobsFailing,
            analyticsSnapshots: fallback.analyticsSnapshots,
            securityIncidentsOpen: fallback.securityIncidentsOpen
        };
        setStoredEnterpriseSnapshot(derived);
        return derived;
    }

    const snapshot: EnterpriseOpsSnapshot = {
        linkedAccountsPending: counts[0] ?? fallback.linkedAccountsPending,
        payoutRetriesQueued: counts[1] ?? fallback.payoutRetriesQueued,
        webhookEventsPending: counts[2] ?? fallback.webhookEventsPending,
        accountingExceptions: counts[3] ?? fallback.accountingExceptions,
        tenantLifecycleTasks: counts[4] ?? fallback.tenantLifecycleTasks,
        approvalTasks: counts[5] ?? fallback.approvalTasks,
        marketplaceDisputes: counts[6] ?? fallback.marketplaceDisputes,
        notificationsQueued: counts[7] ?? fallback.notificationsQueued,
        documentsPendingReview: counts[8] ?? fallback.documentsPendingReview,
        jobsFailing: counts[9] ?? fallback.jobsFailing,
        analyticsSnapshots: counts[10] ?? fallback.analyticsSnapshots,
        securityIncidentsOpen: counts[11] ?? fallback.securityIncidentsOpen
    };
    setStoredEnterpriseSnapshot(snapshot);
    return snapshot;
};

export const getSystemHealthWorkspace = async (): Promise<SystemHealthWorkspace> => {
    const snapshot = await getEnterpriseOpsSnapshot();

    const [jobsResponse, incidentsResponse, webhooksResponse, auditCount] = await Promise.all([
        supabase
            .from('job_runs')
            .select('id, job_type, status, attempts, next_run_at')
            .in('status', ['failed', 'retrying'])
            .order('updated_at', { ascending: false })
            .limit(8),
        supabase
            .from('security_incidents')
            .select('id, title, severity, status, created_at')
            .in('status', ['open', 'monitoring'])
            .order('created_at', { ascending: false })
            .limit(8),
        supabase
            .from('razorpay_webhook_events')
            .select('id, event_name, processing_status, created_at')
            .in('processing_status', ['received', 'failed'])
            .order('created_at', { ascending: false })
            .limit(8),
        safeCount('audit_log_entries')
    ]);

    if (jobsResponse.error) throw jobsResponse.error;
    if (incidentsResponse.error) throw incidentsResponse.error;
    if (webhooksResponse.error) throw webhooksResponse.error;

    return {
        snapshot,
        auditLogCount: auditCount ?? 0,
        failedJobs: ((jobsResponse.data as any) || []),
        securityIncidents: ((incidentsResponse.data as any) || []),
        webhookBacklog: ((webhooksResponse.data as any) || [])
    };
};

export const getIntegrationsWorkspace = async (): Promise<IntegrationStatus[]> => {
    const snapshot = await getEnterpriseOpsSnapshot();
    return [
        {
            id: 'razorpay-route',
            name: 'Razorpay Route',
            category: 'payments',
            status: snapshot.linkedAccountsPending > 0 ? 'pending_kyc' : 'connected',
            description: 'Owner linked accounts, direct settlements, transfer retries, and webhook-driven reconciliation.',
            action_label: 'Manage payouts'
        },
        {
            id: 'communications',
            name: 'WhatsApp / SMS / Email',
            category: 'communications',
            status: snapshot.notificationsQueued > 0 ? 'configuration_needed' : 'connected',
            description: 'Notification engine for reminders, alerts, escalations, and lifecycle messaging.',
            action_label: 'Configure channels'
        },
        {
            id: 'documents',
            name: 'Document Review Pipeline',
            category: 'documents',
            status: snapshot.documentsPendingReview > 0 ? 'configuration_needed' : 'connected',
            description: 'Agreement files, KYC reviews, signatures, and payment proof verification workflow.',
            action_label: 'Review documents'
        },
        {
            id: 'ops-monitoring',
            name: 'Ops Monitoring',
            category: 'ops',
            status: snapshot.jobsFailing > 0 || snapshot.securityIncidentsOpen > 0 ? 'configuration_needed' : 'connected',
            description: 'Audit logs, anomaly monitoring, retry workers, and operations alerts.',
            action_label: 'Open health desk'
        },
        {
            id: 'analytics',
            name: 'Analytics & BI',
            category: 'analytics',
            status: snapshot.analyticsSnapshots > 0 ? 'connected' : 'configuration_needed',
            description: 'Executive KPI snapshots, collections analytics, dispute tracking, and reporting exports.',
            action_label: 'View analytics'
        }
    ];
};

export const getAnalyticsWorkspace = async (): Promise<AnalyticsWorkspace> => {
    const snapshot = await getEnterpriseOpsSnapshot();
    const finance = await getFinanceERPWorkspace();
    const maintenance = await getMaintenanceERPWorkspace();

    return {
        snapshot,
        collections: {
            totalCollected: finance.payouts.filter((payout) => payout.payout_status === 'paid_out').reduce((sum, payout) => sum + payout.amount, 0),
            pendingPayouts: finance.payouts.filter((payout) => payout.payout_status !== 'paid_out').reduce((sum, payout) => sum + payout.amount, 0),
            overdueInvoices: finance.invoices.filter((invoice) => invoice.status === 'overdue').reduce((sum, invoice) => sum + invoice.outstanding_amount, 0),
            retryQueueAmount: finance.payouts.filter((payout) => payout.payout_status === 'failed').reduce((sum, payout) => sum + payout.amount, 0)
        },
        operations: {
            openWorkOrders: maintenance.workOrders.filter((order) => order.status !== 'completed').length,
            lifecycleTasks: snapshot.tenantLifecycleTasks,
            documentsPendingReview: snapshot.documentsPendingReview,
            disputeCount: snapshot.marketplaceDisputes
        }
    };
};

export const getAccountingExportRows = async (reportType: 'profit_loss' | 'expense_summary' | 'audit_compliance' | 'collections_control') => {
    const finance = await getFinanceERPWorkspace();

    if (reportType === 'collections_control') {
        return finance.reconciliations.map((record) => ({
            ReconciliationId: record.id,
            InvoiceId: record.invoice_id || '',
            PaymentId: record.payment_id || '',
            Status: record.status,
            Channel: record.channel,
            ExpectedAmount: record.expected_amount,
            DetectedAmount: record.detected_amount,
            VarianceAmount: record.variance_amount,
            DetectedOn: record.detected_on
        }));
    }

    if (reportType === 'expense_summary') {
        return finance.invoices.flatMap((invoice) =>
            invoice.line_items.map((item) => ({
                InvoiceNumber: invoice.invoice_number,
                BillingMonth: invoice.billing_month,
                Category: item.category,
                Label: item.label,
                Amount: item.amount,
                Status: invoice.status
            }))
        );
    }

    if (reportType === 'audit_compliance') {
        return finance.payouts.map((payout) => ({
            PayoutId: payout.id,
            PaymentId: payout.payment_id || '',
            SettlementMode: payout.settlement_mode,
            Destination: payout.destination_label,
            Amount: payout.amount,
            Status: payout.payout_status,
            InitiatedOn: payout.initiated_on,
            CompletedOn: payout.completed_on || ''
        }));
    }

    return finance.invoices.map((invoice) => ({
        InvoiceNumber: invoice.invoice_number,
        BillingMonth: invoice.billing_month,
        TotalAmount: invoice.total_amount,
        OutstandingAmount: invoice.outstanding_amount,
        Status: invoice.status,
        IssuedOn: invoice.issued_on,
        DueDate: invoice.due_date
    }));
};

const isSupabaseRelationUnavailable = (error: any) =>
    ['42P01', 'PGRST116', 'PGRST205'].includes(String(error?.code || '')) ||
    /does not exist|could not find|relation/i.test(String(error?.message || ''));

const safeCount = async (table: string, options?: { eq?: Record<string, string>; in?: Record<string, string[]>; notNull?: string }) => {
    let query = supabase.from(table).select('*', { count: 'exact', head: true });
    if (options?.eq) {
        Object.entries(options.eq).forEach(([key, value]) => {
            query = query.eq(key, value);
        });
    }
    if (options?.in) {
        Object.entries(options.in).forEach(([key, value]) => {
            query = query.in(key, value);
        });
    }
    if (options?.notNull) {
        query = query.not(options.notNull, 'is', null);
    }
    const { count, error } = await query;
    if (error) {
        if (isSupabaseRelationUnavailable(error)) return null;
        throw error;
    }
    return count || 0;
};

const getPersistedFinanceWorkspace = async (): Promise<FinanceERPWorkspace | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const [invoiceResponse, reconciliationResponse, payoutResponse] = await Promise.all([
        supabase
            .from('invoice_records')
            .select('id, invoice_number, tenant_id, house_id, building_id, billing_month, issued_on, due_date, total_amount, outstanding_amount, status, line_items, notes')
            .eq('owner_id', user.id)
            .order('issued_on', { ascending: false }),
        supabase
            .from('payment_reconciliations')
            .select('id, payment_id, invoice_id, detected_amount, expected_amount, variance_amount, status, channel, detected_on, notes')
            .eq('owner_id', user.id)
            .order('detected_on', { ascending: false }),
        supabase
            .from('owner_payouts')
            .select('id, owner_id, building_id, payment_id, amount, payout_status, settlement_mode, destination_label, initiated_on, completed_on, notes')
            .eq('owner_id', user.id)
            .order('initiated_on', { ascending: false })
    ]);

    if (invoiceResponse.error || reconciliationResponse.error || payoutResponse.error) {
        if (
            isSupabaseRelationUnavailable(invoiceResponse.error)
            || isSupabaseRelationUnavailable(reconciliationResponse.error)
            || isSupabaseRelationUnavailable(payoutResponse.error)
        ) {
            return null;
        }
        throw invoiceResponse.error || reconciliationResponse.error || payoutResponse.error;
    }

    const invoices = (invoiceResponse.data || []).map((invoice: any) => ({
        ...invoice,
        total_amount: Number(invoice.total_amount || 0),
        outstanding_amount: Number(invoice.outstanding_amount || 0),
        line_items: Array.isArray(invoice.line_items) ? invoice.line_items : []
    })) as InvoiceRecord[];
    const reconciliations = (reconciliationResponse.data || []).map((record: any) => ({
        ...record,
        detected_amount: Number(record.detected_amount || 0),
        expected_amount: Number(record.expected_amount || 0),
        variance_amount: Number(record.variance_amount || 0)
    })) as ReconciliationRecord[];
    const payouts = (payoutResponse.data || []).map((payout: any) => ({
        ...payout,
        amount: Number(payout.amount || 0)
    })) as OwnerPayoutRecord[];

    if (invoices.length === 0 && reconciliations.length === 0 && payouts.length === 0) {
        return null;
    }

    return { invoices, reconciliations, payouts };
};

const buildFinanceWorkspace = async (): Promise<FinanceERPWorkspace> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const stored = shouldUseLocalErpPersistence() ? getStoredFinanceWorkspace() : { invoices: [], reconciliations: [], payouts: [] };
    const { data: houses, error: houseError } = await supabase
        .from('houses')
        .select('id, building_id, house_number, rent_amount, tenant_id, lease_end_date, buildings!inner(id, name, owner_id)')
        .eq('buildings.owner_id', user.id);
    if (houseError) throw houseError;

    const { data: paymentRows, error: paymentError } = await supabase
        .from('payments')
        .select('id, tenant_id, house_id, amount, payment_type, status, due_date, paid_date, created_at, razorpay_payment_id')
        .in('house_id', (houses || []).map((house: any) => house.id).length ? (houses || []).map((house: any) => house.id) : ['00000000-0000-0000-0000-000000000000']);
    if (paymentError && paymentError.code !== 'PGRST116') throw paymentError;

    const existingInvoices = stored.invoices || [];
    const generatedInvoices: InvoiceRecord[] = (houses || []).flatMap((house: any) => {
        if (!house.tenant_id) return [];
        const months = Array.from({ length: 3 }, (_v, index) => {
            const date = new Date();
            date.setMonth(date.getMonth() - index);
            return formatBillingMonth(date);
        });

        return months.map((month) => {
            const matchingPayment = (paymentRows || []).find((payment: any) => payment.house_id === house.id && formatBillingMonth(payment.due_date || payment.created_at) === month);
            const baseTotal = Number(matchingPayment?.amount || house.rent_amount || 0);
            const outstanding = normalizePaymentStatus(matchingPayment?.status) === 'paid' ? 0 : baseTotal;
            const existing = existingInvoices.find((invoice) => invoice.house_id === house.id && invoice.billing_month === month);
            return existing || {
                id: `invoice_${house.id}_${month}`,
                invoice_number: `INV-${month.replace('-', '')}-${house.house_number}`,
                tenant_id: house.tenant_id,
                house_id: house.id,
                building_id: house.building_id,
                billing_month: month,
                issued_on: new Date(`${month}-01`).toISOString(),
                due_date: new Date(new Date(`${month}-01`).getFullYear(), new Date(`${month}-01`).getMonth(), 5).toISOString(),
                total_amount: baseTotal,
                outstanding_amount: outstanding,
                status: outstanding === 0 ? 'paid' : new Date().toISOString().slice(0, 7) > month ? 'overdue' : 'issued',
                line_items: [
                    {
                        id: `line_${house.id}_${month}`,
                        category: 'rent',
                        label: `Monthly rent for Unit ${house.house_number}`,
                        amount: baseTotal
                    }
                ],
                payment_ids: matchingPayment ? [matchingPayment.id] : [],
                notes: `Auto-generated invoice for ${house.buildings?.name || 'Property'}`
            } as InvoiceRecord;
        });
    });

    const reconciliations: ReconciliationRecord[] = generatedInvoices.map((invoice) => {
        const payment = (paymentRows || []).find((entry: any) => invoice.payment_ids?.includes(entry.id));
        const detected = Number(payment?.amount || 0);
        const variance = detected - Number(invoice.total_amount || 0);
        return {
            id: `reco_${invoice.id}`,
            payment_id: payment?.id || null,
            invoice_id: invoice.id,
            detected_amount: detected,
            expected_amount: Number(invoice.total_amount || 0),
            variance_amount: variance,
            status: payment ? (variance === 0 ? 'matched' : 'review_required') : 'unmatched',
            channel: payment?.razorpay_payment_id ? 'razorpay' : 'manual',
            detected_on: payment?.paid_date || payment?.created_at || invoice.issued_on,
            notes: payment ? 'Matched against recorded payment.' : 'Awaiting settlement or proof verification.'
        };
    });

    const payouts: OwnerPayoutRecord[] = (paymentRows || []).filter((payment: any) => normalizePaymentStatus(payment.status) === 'paid').map((payment: any) => ({
        id: `payout_${payment.id}`,
        owner_id: user.id,
        payment_id: payment.id,
        amount: Number(payment.amount || 0),
        payout_status: payment.razorpay_payment_id ? 'processing' : 'paid_out',
        settlement_mode: payment.razorpay_payment_id ? 'platform_to_owner' : 'direct_owner',
        destination_label: payment.razorpay_payment_id ? 'Owner linked payout / platform transfer' : 'Owner direct collection',
        initiated_on: payment.created_at || new Date().toISOString(),
        completed_on: payment.razorpay_payment_id ? null : payment.paid_date || payment.created_at,
        notes: payment.razorpay_payment_id ? 'Awaiting or assuming linked-account transfer confirmation.' : 'Tenant paid owner directly through manual rail.'
    }));

    const workspace = {
        invoices: generatedInvoices,
        reconciliations,
        payouts
    };
    setStoredFinanceWorkspace(workspace);
    return workspace;
};

export const getFinanceERPWorkspace = async (): Promise<FinanceERPWorkspace> => {
    const persisted = await getPersistedFinanceWorkspace();
    if (persisted) return persisted;
    if (!allowLocalFallback()) {
        throw new Error('Finance ERP tables are not available. Apply the ERP Supabase migrations before using this workspace.');
    }
    return buildFinanceWorkspace();
};

export const runFinancialReconciliation = async (): Promise<ReconciliationRecord[]> => {
    const workspace = await getPersistedFinanceWorkspace() || await buildFinanceWorkspace();
    return workspace.reconciliations;
};

export const getRentRollData = async (): Promise<any[]> => {
    const { data, error } = await supabase.from('houses').select('house_number, tenant_name, rent_amount, buildings(name)');
    if (error) throw error;
    return (data || []).map((h: any) => ({
        Property: h.buildings?.name,
        Unit: h.house_number,
        Tenant: h.tenant_name || 'Vacant',
        Rent: h.rent_amount
    }));
};

const getPersistedMaintenanceWorkspace = async (): Promise<MaintenanceERPWorkspace | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const requests = await getAllMaintenanceRequests();
    const { data, error } = await supabase
        .from('vendor_work_orders')
        .select('id, maintenance_request_id, provider_id, priority, status, sla_due_at, assigned_at, started_at, completed_at, estimated_cost, actual_cost, notes, service_providers(name, phone_number, category)')
        .eq('owner_id', user.id)
        .order('sla_due_at', { ascending: true });

    if (error) {
        if (isSupabaseRelationUnavailable(error)) return null;
        throw error;
    }

    if (!data?.length) return null;

    const workOrders = (data || []).map((entry: any) => ({
        id: entry.id,
        maintenance_request_id: entry.maintenance_request_id,
        provider_id: entry.provider_id,
        provider_name: entry.service_providers?.name || null,
        provider_phone_number: entry.service_providers?.phone_number || null,
        service_category: entry.service_providers?.category || null,
        priority: entry.priority,
        sla_due_at: entry.sla_due_at,
        assigned_at: entry.assigned_at,
        started_at: entry.started_at,
        completed_at: entry.completed_at,
        status: entry.status,
        estimated_cost: entry.estimated_cost ? Number(entry.estimated_cost) : null,
        actual_cost: entry.actual_cost ? Number(entry.actual_cost) : null,
        notes: entry.notes
    })) as VendorWorkOrder[];

    return {
        openRequests: requests.filter((request) => request.status !== 'closed' && request.status !== 'resolved'),
        overdueWorkOrders: workOrders.filter((entry) => new Date(entry.sla_due_at).getTime() < Date.now() && entry.status !== 'completed'),
        workOrders
    };
};

export const getMaintenanceERPWorkspace = async (): Promise<MaintenanceERPWorkspace> => {
    const persisted = await getPersistedMaintenanceWorkspace();
    if (persisted) return persisted;
    if (!allowLocalFallback()) {
        throw new Error('Maintenance ERP tables are not available. Apply the ERP Supabase migrations before using this workspace.');
    }

    const requests = await getAllMaintenanceRequests();
    const providers = await getServiceProviders('All');
    const storedWorkOrders = getStoredWorkOrders();
    const workOrders = requests.map((request, index) => {
        const existing = storedWorkOrders.find((entry) => entry.maintenance_request_id === request.id);
        if (existing) return existing;
        const matchingProvider = providers[index % Math.max(providers.length, 1)] || null;
        const createdAt = new Date(request.created_at);
        const dueAt = new Date(createdAt.getTime() + (request.status === 'open' ? 24 : 12) * 60 * 60 * 1000);
        return {
            id: `wo_${request.id}`,
            maintenance_request_id: request.id,
            provider_id: matchingProvider?.id || null,
            provider_name: matchingProvider?.name || null,
            provider_phone_number: matchingProvider?.phone_number || null,
            service_category: matchingProvider?.category || 'General',
            priority: request.status === 'open' ? 'high' : 'medium',
            sla_due_at: dueAt.toISOString(),
            assigned_at: matchingProvider ? createdAt.toISOString() : null,
            status: matchingProvider ? (request.status === 'open' ? 'assigned' : 'in_progress') : 'unassigned',
            estimated_cost: matchingProvider ? 1500 + index * 250 : null,
            actual_cost: null,
            notes: matchingProvider ? `Auto-assigned to ${matchingProvider.name}.` : 'Awaiting owner dispatch.'
        } as VendorWorkOrder;
    });
    setStoredWorkOrders(workOrders);
    return {
        openRequests: requests.filter((request) => request.status !== 'closed' && request.status !== 'resolved'),
        overdueWorkOrders: workOrders.filter((entry) => new Date(entry.sla_due_at).getTime() < Date.now() && entry.status !== 'completed'),
        workOrders
    };
};

export const updateVendorWorkOrderStatus = async (workOrderId: string, status: VendorWorkOrder['status']): Promise<VendorWorkOrder | null> => {
    const patch: Record<string, string> = { status };
    if (status === 'in_progress') patch.started_at = new Date().toISOString();
    if (status === 'completed') patch.completed_at = new Date().toISOString();

    const { data: remoteUpdated, error } = await supabase
        .from('vendor_work_orders')
        .update(patch)
        .eq('id', workOrderId)
        .select('id, maintenance_request_id, provider_id, priority, status, sla_due_at, assigned_at, started_at, completed_at, estimated_cost, actual_cost, notes, service_providers(name, phone_number, category)')
        .maybeSingle();

    if (!error && remoteUpdated) {
        return {
            id: remoteUpdated.id,
            maintenance_request_id: remoteUpdated.maintenance_request_id,
            provider_id: remoteUpdated.provider_id,
            provider_name: (remoteUpdated as any).service_providers?.name || null,
            provider_phone_number: (remoteUpdated as any).service_providers?.phone_number || null,
            service_category: (remoteUpdated as any).service_providers?.category || null,
            priority: remoteUpdated.priority,
            sla_due_at: remoteUpdated.sla_due_at,
            assigned_at: remoteUpdated.assigned_at,
            started_at: remoteUpdated.started_at,
            completed_at: remoteUpdated.completed_at,
            status: remoteUpdated.status,
            estimated_cost: remoteUpdated.estimated_cost ? Number(remoteUpdated.estimated_cost) : null,
            actual_cost: remoteUpdated.actual_cost ? Number(remoteUpdated.actual_cost) : null,
            notes: remoteUpdated.notes
        };
    }

    if (error && !isSupabaseRelationUnavailable(error)) {
        throw error;
    }

    if (!allowLocalFallback()) {
        throw new Error('Maintenance ERP updates require the vendor_work_orders table to be available in Supabase.');
    }

    const entries = getStoredWorkOrders();
    let updated: VendorWorkOrder | null = null;
    const next = entries.map((entry) => {
        if (entry.id !== workOrderId) return entry;
        updated = {
            ...entry,
            status,
            started_at: status === 'in_progress' && !entry.started_at ? new Date().toISOString() : entry.started_at,
            completed_at: status === 'completed' ? new Date().toISOString() : entry.completed_at
        };
        return updated;
    });
    setStoredWorkOrders(next);
    return updated;
};

const getPersistedCRMWorkspace = async (): Promise<CRMWorkspace | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const leadResponse = await supabase
        .from('crm_leads')
        .select('id, building_id, house_id, owner_id, full_name, phone_number, email, source, stage, interested_in, budget, move_in_date, notes, created_at, updated_at')
        .eq('owner_id', user.id)
        .order('updated_at', { ascending: false });

    if (leadResponse.error) {
        if (isSupabaseRelationUnavailable(leadResponse.error)) return null;
        throw leadResponse.error;
    }

    const leads = (leadResponse.data || []) as LeadRecord[];
    if (!leads.length) return null;

    const leadIds = leads.map((lead) => lead.id);
    const [visitResponse, bookingResponse] = await Promise.all([
        supabase
            .from('crm_visits')
            .select('id, lead_id, building_id, house_id, scheduled_for, status, notes')
            .in('lead_id', leadIds)
            .order('scheduled_for', { ascending: true }),
        supabase
            .from('crm_bookings')
            .select('id, lead_id, building_id, house_id, booking_type, amount, status, created_at, notes')
            .in('lead_id', leadIds)
            .order('created_at', { ascending: false })
    ]);

    if (visitResponse.error || bookingResponse.error) {
        if (isSupabaseRelationUnavailable(visitResponse.error) || isSupabaseRelationUnavailable(bookingResponse.error)) {
            return { leads, visits: [], bookings: [] };
        }
        throw visitResponse.error || bookingResponse.error;
    }

    return {
        leads,
        visits: (visitResponse.data || []) as PropertyVisit[],
        bookings: (bookingResponse.data || []).map((booking: any) => ({
            ...booking,
            amount: Number(booking.amount || 0)
        })) as BookingRecord[]
    };
};

export const getCRMWorkspace = async (): Promise<CRMWorkspace> => {
    const persisted = await getPersistedCRMWorkspace();
    if (persisted) return persisted;
    if (!allowLocalFallback()) {
        throw new Error('CRM ERP tables are not available. Apply the ERP Supabase migrations before using this workspace.');
    }

    const stored = getStoredCRMWorkspace();
    if (stored.leads.length > 0 || stored.visits.length > 0 || stored.bookings.length > 0) {
        return stored;
    }

    const listings = await getMarketplaceListings();
    const seededLeads: LeadRecord[] = listings.slice(0, 4).map((listing, index) => ({
        id: `lead_${listing.id}`,
        building_id: listing.building_id,
        house_id: null,
        owner_id: listing.owner_id,
        full_name: ['Aarav Sharma', 'Saanvi Reddy', 'Rahul Verma', 'Keerthi Nair'][index] || `Lead ${index + 1}`,
        phone_number: `98765000${index + 1}`,
        email: null,
        source: index % 2 === 0 ? 'marketplace' : 'referral',
        stage: (['new', 'contacted', 'visit_scheduled', 'booking_token'] as const)[index] || 'new',
        interested_in: listing.listing_type,
        budget: Number(listing.price || 0),
        move_in_date: new Date(Date.now() + (index + 7) * 86400000).toISOString(),
        notes: `Interested in ${listing.building_name}.`,
        created_at: new Date(Date.now() - index * 86400000).toISOString(),
        updated_at: new Date().toISOString()
    }));

    const visits: PropertyVisit[] = seededLeads
        .filter((lead) => lead.stage === 'visit_scheduled')
        .map((lead, index) => ({
            id: `visit_${lead.id}`,
            lead_id: lead.id,
            building_id: lead.building_id,
            house_id: lead.house_id,
            scheduled_for: new Date(Date.now() + (index + 1) * 86400000).toISOString(),
            status: 'scheduled',
            notes: 'Confirm availability and security access before visit.'
        }));

    const bookings: BookingRecord[] = seededLeads
        .filter((lead) => lead.stage === 'booking_token')
        .map((lead) => ({
            id: `booking_${lead.id}`,
            lead_id: lead.id,
            building_id: lead.building_id,
            house_id: lead.house_id,
            booking_type: 'token',
            amount: Math.round(Number(lead.budget || 0) * 0.1),
            status: 'received',
            created_at: new Date().toISOString(),
            notes: 'Booking token received, pending agreement and KYC.'
        }));

    const workspace = { leads: seededLeads, visits, bookings };
    setStoredCRMWorkspace(workspace);
    return workspace;
};

export const updateLeadStage = async (leadId: string, stage: LeadRecord['stage']): Promise<LeadRecord | null> => {
    const { data: remoteUpdated, error } = await supabase
        .from('crm_leads')
        .update({ stage, updated_at: new Date().toISOString() })
        .eq('id', leadId)
        .select('id, building_id, house_id, owner_id, full_name, phone_number, email, source, stage, interested_in, budget, move_in_date, notes, created_at, updated_at')
        .maybeSingle();

    if (!error && remoteUpdated) {
        return remoteUpdated as LeadRecord;
    }

    if (error && !isSupabaseRelationUnavailable(error)) {
        throw error;
    }

    if (!allowLocalFallback()) {
        throw new Error('CRM stage updates require the crm_leads table to be available in Supabase.');
    }

    const workspace = getStoredCRMWorkspace();
    let updated: LeadRecord | null = null;
    const leads = workspace.leads.map((lead) => {
        if (lead.id !== leadId) return lead;
        updated = { ...lead, stage, updated_at: new Date().toISOString() };
        return updated;
    });
    setStoredCRMWorkspace({ ...workspace, leads });
    return updated;
};

// --- Maintenance ---

export const getMaintenanceRequests = async (page: number, limit: number, status?: MaintenanceStatus): Promise<{ data: MaintenanceRequest[], count: number }> => {
    const e2eMaintenance = getE2EState()?.api?.maintenanceRequests as MaintenanceRequest[] | undefined;
    if (e2eMaintenance) {
        const filtered = status ? e2eMaintenance.filter((request) => request.status === status) : e2eMaintenance;
        const startIndex = (page - 1) * limit;
        return {
            data: filtered.slice(startIndex, startIndex + limit),
            count: filtered.length
        };
    }

    let query = supabase.from('maintenance_requests').select('*, houses(house_number, buildings(name))', { count: 'exact' });
    if (status) query = query.eq('status', status);
    const { data, error, count } = await query.range((page - 1) * limit, page * limit - 1);
    if (error) throw error;

    const mappedData = (data as any[] || []).map(d => ({
        ...d,
        building_name: d.houses?.buildings?.name || 'N/A',
        house_number: d.houses?.house_number || 'N/A'
    }));
    return { data: mappedData, count: count || 0 };
};

export const getAllMaintenanceRequests = async (): Promise<MaintenanceRequest[]> => {
    const { data } = await getMaintenanceRequests(1, 100);
    return data;
};

export const analyzeMaintenanceForSuggestions = async (requests: MaintenanceRequest[]): Promise<AiSuggestion[]> => {
    return [{ title: "Preventative Pipe Check", description: "Recurring leaks in Building A suggests pipe aging.", priority: "High" }];
};

export const getTenantMaintenanceRequests = async (): Promise<MaintenanceRequest[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
        .from('maintenance_requests')
        .select('*, houses(house_number, buildings(name))')
        .eq('tenant_id', user.id)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as any[] || []).map((request) => ({
        ...request,
        building_name: request.houses?.buildings?.name || 'N/A',
        house_number: request.houses?.house_number || 'N/A'
    }));
};

export const createTenantMaintenanceRequest = async (description: string, files: File[]): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not found");

    // Fetch the tenant's house info
    const { data: house, error: hError } = await supabase
        .from('houses')
        .select('id, building_id, buildings(owner_id)')
        .eq('tenant_id', user.id)
        .single();

    if (hError || !house) throw new Error("Tenant is not assigned to a house.");

    const imageUrls: string[] = [];
    for (const file of files) {
        const filePath = `${user.id}/maintenance/${Date.now()}-${sanitizeFileName(file.name)}`;
        const { error: uploadError } = await supabase.storage
            .from('tenant_documents')
            .upload(filePath, file, { upsert: false });

        if (uploadError) {
            console.warn('Maintenance attachment upload skipped:', uploadError.message);
            continue;
        }

        const { data: signed } = await supabase.storage
            .from('tenant_documents')
            .createSignedUrl(filePath, 60 * 60 * 24 * 30);

        if (signed?.signedUrl) {
            imageUrls.push(signed.signedUrl);
        }
    }

    const { error } = await supabase.from('maintenance_requests').insert({
        description,
        status: 'open',
        tenant_id: user.id,
        house_id: house.id,
        owner_id: (house.buildings as any).owner_id,
        image_urls: imageUrls
    });

    if (error) throw error;
};

// --- Marketplace ---

export const getMarketplaceListings = async (): Promise<Listing[]> => {
    const { data, error } = await supabase.from('marketplace_view').select('*');

    if (error) {
        console.error("Marketplace Fetch Error:", error);
        // FIX: Ensure only the error message is stringified, not the whole object.
        // This prevents the "[object Object]" error message in the UI.
        throw new Error(`Failed to fetch listings: ${error.message || 'An unknown database error occurred.'}`);
    }

    return data || [];
};

export const getMarketplaceListingById = async (listingId: number | string): Promise<Listing | null> => {
    const parsedId = Number(listingId);
    if (!Number.isFinite(parsedId)) throw new Error('Invalid property listing id.');

    const publicPayload = await invokeEdgeFunction<Listing>('public-marketplace', {
        action: 'property_by_id',
        listingId: parsedId
    });
    if (publicPayload) {
        return publicPayload;
    }

    const { data, error } = await supabase.from('marketplace_view').select('*').eq('id', parsedId).maybeSingle();
    if (error) {
        throw new Error(`Failed to fetch property listing: ${error.message || 'Unknown database error.'}`);
    }

    return (data as Listing | null) || null;
};

export const createMarketplaceListings = async (listings: NewListingData[]): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not found");
    const payload = listings.map(l => ({ ...l, owner_id: user.id }));
    await supabase.from('listings').insert(payload);
};

export const getProductMarketplaceListings = async (): Promise<ProductListing[]> => {
    const { data, error } = await supabase
        .from('marketplace_product_listings')
        .select('id, created_at, seller_id, seller_name, seller_role, title, description, price, category, condition, contact_info, location, images')
        .order('created_at', { ascending: false });

    if (!error) {
        return ((data as any[]) || []).map((entry) => ({
            ...entry,
            price: Number(entry.price || 0)
        })) as ProductListing[];
    }

    if (!isSupabaseRelationUnavailable(error) || !allowLocalFallback()) {
        throw new Error(`Failed to fetch product listings: ${error.message || 'Unknown database error.'}`);
    }

    return getStoredProductMarketplaceListings()
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

export const getProductMarketplaceListingById = async (productId: string): Promise<ProductListing | null> => {
    if (!productId) throw new Error('Invalid product listing id.');

    const publicPayload = await invokeEdgeFunction<ProductListing>('public-marketplace', {
        action: 'product_by_id',
        productId
    });
    if (publicPayload) {
        return publicPayload;
    }

    const { data, error } = await supabase
        .from('marketplace_product_listings')
        .select('id, created_at, seller_id, seller_name, seller_role, title, description, price, category, condition, contact_info, location, images')
        .eq('id', productId)
        .maybeSingle();

    if (!error) {
        return data ? ({ ...data, price: Number((data as any).price || 0) } as ProductListing) : null;
    }

    if (isSupabaseRelationUnavailable(error) && allowLocalFallback()) {
        return getStoredProductMarketplaceListings().find((entry) => entry.id === productId) || null;
    }

    throw new Error(`Failed to fetch product listing: ${error.message || 'Unknown database error.'}`);
};

export const createProductMarketplaceListing = async (
    payload: Omit<ProductListing, 'id' | 'created_at' | 'seller_id' | 'seller_name' | 'seller_role'>
): Promise<ProductListing> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not found');

    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .maybeSingle();

    const entry: ProductListing = {
        ...payload,
        id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `product_${Date.now()}`,
        created_at: new Date().toISOString(),
        seller_id: user.id,
        seller_name: profile?.full_name || user.user_metadata?.full_name || 'Nilayam Seller',
        seller_role: (profile?.role as UserRole | null | undefined) || (user.user_metadata?.role as UserRole | null | undefined) || null
    };

    const { data, error } = await supabase
        .from('marketplace_product_listings')
        .insert({
            id: entry.id,
            seller_id: entry.seller_id,
            seller_name: entry.seller_name,
            seller_role: entry.seller_role,
            title: entry.title,
            description: entry.description,
            price: entry.price,
            category: entry.category,
            condition: entry.condition,
            contact_info: entry.contact_info,
            location: entry.location || null,
            images: entry.images || []
        })
        .select('id, created_at, seller_id, seller_name, seller_role, title, description, price, category, condition, contact_info, location, images')
        .single();

    if (!error && data) {
        return {
            ...(data as any),
            price: Number((data as any).price || 0)
        } as ProductListing;
    }

    if (!isSupabaseRelationUnavailable(error) || !allowLocalFallback()) {
        throw new Error(error?.message || 'Unable to create product listing in Supabase.');
    }

    const current = getStoredProductMarketplaceListings();
    setStoredProductMarketplaceListings([entry, ...current]);
    return entry;
};

export const sendMarketplaceOffer = async (listingId: number, amount: number, message: string): Promise<void> => {
    // Placeholder
};

// --- Community ---

export const getAnnouncements = async (page: number, limit: number): Promise<{ data: Announcement[], count: number }> => {
    const { data, error, count } = await supabase
        .from('announcements')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);
    if (error) throw error;
    return { data: data || [], count: count || 0 };
};

export const createAnnouncement = async (announcement: Partial<Announcement>): Promise<Announcement> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not found");
    const { data, error } = await supabase.from('announcements').insert({ ...announcement, owner_id: user.id }).select().single();
    if (error) throw error;
    return data;
};

export const getVisitors = async (propertyId: string): Promise<Visitor[]> => {
    const { data, error } = await supabase
        .from('gate_passes')
        .select('*')
        .eq('building_id', propertyId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(v => ({
        id: v.id,
        name: v.visitor_name,
        type: v.visitor_type || 'Guest',
        building_id: v.building_id,
        access_code: v.access_code,
        valid_until: v.valid_until,
        status: v.status === 'active' ? 'active' : 'expired'
    }));
};

export const createVisitorPass = async (name: string, type: string, propertyId: string): Promise<Visitor> => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const validUntil = new Date();
    validUntil.setHours(validUntil.getHours() + 24);

    const { data, error } = await supabase
        .from('gate_passes')
        .insert({
            visitor_name: name,
            visitor_type: type,
            building_id: propertyId,
            access_code: code,
            valid_until: validUntil.toISOString(),
            status: 'active'
        })
        .select()
        .single();

    if (error) throw error;
    return {
        id: data.id,
        name: data.visitor_name,
        type: data.visitor_type,
        building_id: data.building_id,
        access_code: data.access_code,
        valid_until: data.valid_until,
        status: 'active'
    };
};

export const getAmenities = async (propertyId: string): Promise<Amenity[]> => {
    const { data, error } = await supabase
        .from('amenities')
        .select('*')
        .eq('building_id', propertyId);
    if (error) throw error;
    return data || [];
};

export const createAmenity = async (amenity: any, propertyId: string): Promise<Amenity> => {
    const { data, error } = await supabase
        .from('amenities')
        .insert({ ...amenity, building_id: propertyId })
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const getActivePolls = async (propertyId: string): Promise<Poll[]> => {
    const { data, error } = await supabase
        .from('polls')
        .select('*')
        .eq('building_id', propertyId)
        .eq('status', 'active');
    if (error) throw error;
    return data || [];
};

export const createPoll = async (question: string, options: string[], propertyId: string): Promise<Poll> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not found");

    const formattedOptions = options.map((o, i) => ({ id: (i + 1).toString(), text: o, votes: 0 }));

    const { data, error } = await supabase
        .from('polls')
        .insert({
            question,
            options: formattedOptions,
            building_id: propertyId,
            status: 'active',
            created_by: user.id,
            total_votes: 0
        })
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const getChatMessages = async (propertyId: string): Promise<ChatMessage[]> => {
    const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('building_id', propertyId)
        .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
};

export const sendCommunityMessage = async (propertyId: string, text: string, replyTo?: any): Promise<ChatMessage> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not found");

    const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single();

    const { data, error } = await supabase
        .from('chat_messages')
        .insert({
            building_id: propertyId,
            sender_id: user.id,
            sender_name: profile?.full_name || 'User',
            sender_role: profile?.role || 'tenant',
            text,
            reply_to: replyTo,
            created_at: new Date().toISOString()
        })
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const getCommunityMembers = async (propertyId: string): Promise<{ id: string, name: string, role: string }[]> => {
    // Fetch tenants assigned to houses in this building
    const { data, error } = await supabase
        .from('houses')
        .select('profiles(id, full_name, role)')
        .eq('building_id', propertyId)
        .not('tenant_id', 'is', null);

    if (error) throw error;
    return (data || []).map((h: any) => ({
        id: h.profiles?.id,
        name: h.profiles?.full_name,
        role: h.profiles?.role
    }));
};

export const getAccessibleCommunityProperties = async (): Promise<Array<{ id: string; name: string; address?: string; unit_count?: number }>> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const role = user.user_metadata?.role;

    if (role === 'tenant') {
        const { data, error } = await supabase
            .from('houses')
            .select('building_id, buildings(name, address)')
            .eq('tenant_id', user.id)
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        if (!data?.building_id) return [];

        return [{
            id: data.building_id,
            name: (data as any).buildings?.name || 'My Community',
            address: (data as any).buildings?.address || ''
        }];
    }

    const { data, error } = await supabase
        .from('buildings')
        .select('id, name, address, houses(count)')
        .eq('owner_id', user.id)
        .order('name', { ascending: true });

    if (error) throw error;

    return (data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        address: item.address,
        unit_count: Array.isArray(item.houses) ? item.houses.length : 0
    }));
};

export const getCommunityEvents = async (propertyId: string): Promise<CommunityEvent[]> => {
    const stored = getStoredCommunityEvents().filter((event) => event.building_id === propertyId);
    return stored.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
};

export const createCommunityEvent = async (payload: Omit<CommunityEvent, 'id' | 'created_at' | 'attendees' | 'status'>): Promise<CommunityEvent> => {
    const startsAt = new Date(payload.starts_at);
    const now = new Date();
    const status: CommunityEvent['status'] = startsAt.getTime() <= now.getTime() ? 'live' : 'upcoming';
    const event: CommunityEvent = {
        ...payload,
        id: `event_${payload.building_id}_${Date.now()}`,
        created_at: new Date().toISOString(),
        attendees: [],
        status
    };

    const stored = getStoredCommunityEvents();
    setStoredCommunityEvents([...stored, event]);
    return event;
};

export const respondToCommunityEvent = async (eventId: string, attendee: { user_id: string; name: string; role: string; status: 'going' | 'interested' }): Promise<CommunityEvent | null> => {
    const stored = getStoredCommunityEvents();
    let updatedEvent: CommunityEvent | null = null;

    const updated = stored.map((event) => {
        if (event.id !== eventId) return event;
        const existing = event.attendees || [];
        const nextAttendees = [
            ...existing.filter((entry) => entry.user_id !== attendee.user_id),
            attendee
        ];
        updatedEvent = {
            ...event,
            attendees: nextAttendees
        };
        return updatedEvent;
    });

    setStoredCommunityEvents(updated);
    return updatedEvent;
};

// --- AI & Generation ---

const getGeminiApiKey = () => {
    return import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.API_KEY : '');
};

const validateApiKey = () => {
    if (!getGeminiApiKey()) {
        console.warn("Gemini API key is not configured. AI features may be disabled.");
    }
};

export const getAiSuggestions = async (context: any): Promise<AiSuggestion[]> => {
    validateApiKey();
    const apiKey = getGeminiApiKey();
    if (!apiKey) return [];
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        systemInstruction: "You are the Nilayam AI Architect. Your goal is to provide powerful, accurate, and professional property management insights. Use Indian real estate context (INR, standard lease terms, local amenities). Be concise, assertive, and highly accurate in your data analysis."
    });
    const response = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: `Analyze this property data and suggest high-impact strategies: ${JSON.stringify(context)}. Return a JSON array of {title, description, priority}. Focus on increasing revenue and tenant satisfaction.` }] }],
        generationConfig: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.response.text() || '[]');
};

export const getRealEstateMarketTrends = async () => {
    validateApiKey();
    const apiKey = getGeminiApiKey();
    if (!apiKey) return { content: "Market insights unavailable.", sources: [] };

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const response = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: "Current property rental trends in India 2024." }] }],
        tools: [{ googleSearchRetrieval: {} } as any]
    });
    return { content: response.response.text(), sources: (response.response.candidates?.[0]?.groundingMetadata as any)?.groundingChunks || [] };
};

export const getTodaysFocusSuggestions = async (): Promise<TodaysFocusItem[]> => {
    return [{ title: "Welcome to Nilayam", description: "You are all set. Add your first property to start tracking revenue.", priority: "Medium", link: "/properties" }];
};

export const getUpcomingLeaseExpiries = async (): Promise<LeaseExpiry[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const today = new Date();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + 90);

    const { data, error } = await supabase
        .from('houses')
        .select('id, tenant_name, house_number, lease_end_date, building_id, buildings!inner(name, owner_id)')
        .eq('buildings.owner_id', user.id)
        .not('lease_end_date', 'is', null)
        .order('lease_end_date', { ascending: true });

    if (error) throw error;

    return (data || [])
        .filter((house: any) => {
            const endDate = new Date(house.lease_end_date);
            return endDate >= today && endDate <= cutoff;
        })
        .map((house: any) => ({
            house_id: house.id,
            tenant_name: house.tenant_name || 'Tenant',
            building_name: house.buildings?.name || 'Property',
            building_id: house.building_id,
            house_number: house.house_number,
            lease_end_date: house.lease_end_date
        }));
};

export const generatePropertyStructure = async (description: string): Promise<any> => {
    validateApiKey();
    const apiKey = getGeminiApiKey();
    if (!apiKey) throw new Error("AI not configured");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const response = await model.generateContent([description, "Extract structure. Return JSON with building object and units array."]);
    return JSON.parse(response.response.text() || '{}');
};

export const generateRevenueForecast = async (history: any): Promise<ForecastDataPoint[]> => {
    const monthlyHistory = (history || [])
        .filter((point: FinancialDataPoint) => Number.isFinite(point.income))
        .map((point: FinancialDataPoint) => Number(point.income));

    if (monthlyHistory.length === 0) {
        return [];
    }

    const windowed = monthlyHistory.slice(-6);
    const weightedSum = windowed.reduce((sum: number, value: number, index: number) => sum + value * (index + 1), 0);
    const weightTotal = windowed.reduce((sum: number, _value: number, index: number) => sum + index + 1, 0);
    const weightedAverage = weightedSum / weightTotal;

    const trendSamples = windowed.slice(1).map((value: number, index: number) => value - windowed[index]);
    const averageTrend = trendSamples.length
        ? trendSamples.reduce((sum: number, value: number) => sum + value, 0) / trendSamples.length
        : 0;

    const baseDate = new Date();
    const volatility = trendSamples.length
        ? Math.abs(trendSamples.reduce((sum: number, value: number) => sum + Math.abs(value - averageTrend), 0) / trendSamples.length)
        : 0;

    return Array.from({ length: 3 }, (_value, index) => {
        const monthDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + index + 1, 1);
        const projectedIncome = Math.max(0, Math.round(weightedAverage + averageTrend * (index + 1)));
        const confidence = Math.max(55, Math.min(95, Math.round(92 - (volatility / Math.max(projectedIncome || 1, 1)) * 100)));
        const trend: ForecastDataPoint['trend'] = averageTrend > 0 ? 'up' : averageTrend < 0 ? 'down' : 'stable';

        return {
            month: monthDate.toLocaleString('default', { month: 'short' }),
            predictedIncome: projectedIncome,
            confidence,
            trend
        };
    });
};

export const analyzeImageWithPrompt = async (base64: string, mimeType: string, prompt: string): Promise<string> => {
    validateApiKey();
    const apiKey = getGeminiApiKey();
    if (!apiKey) return "";

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const response = await model.generateContent([
        { inlineData: { mimeType, data: base64 } },
        { text: prompt }
    ]);
    return response.response.text() || "";
};

export const getQuickAiResponse = async (input: string): Promise<string> => {
    validateApiKey();
    const apiKey = getGeminiApiKey();
    if (!apiKey) return "AI unavailable";

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const response = await model.generateContent(input);
    return response.response.text() || "";
};

export const generatePropertyVideo = async (prompt: string, startImageBase64?: string): Promise<string> => {
    validateApiKey();
    const apiKey = getGeminiApiKey();
    if (!apiKey) throw new Error("AI not configured");

    return "https://example.com/placeholder-video.mp4"; // Placeholder for VEO integration
};

export const getTenantDashboardData = async (): Promise<TenantDashboardData | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    let { data: houseData, error: houseError } = await supabase
        .from('houses')
        .select(tenantHouseSelect)
        .eq('tenant_id', user.id)
        .limit(1)
        .maybeSingle();

    if (houseError || !houseData) {
        const reconciledHouseId = await reconcileTenantAssignment();
        if (reconciledHouseId) {
            const retryResult = await supabase
                .from('houses')
                .select(tenantHouseSelect)
                .eq('id', reconciledHouseId)
                .maybeSingle();

            houseData = retryResult.data;
            houseError = retryResult.error;
        }

        if (!houseData) {
            houseData = await getTenantHouseByIdentity(user);
            houseError = null;
        }

        if (!houseData) {
            if (houseError && houseError.code !== 'PGRST116') {
                throw houseError;
            }
            return null;
        }
    }

    const building: any = houseData.buildings;
    if (!building) throw new Error("Building data is missing for the assigned house.");

    const { start, end } = currentMonthBounds();
    const [
        { data: ownerProfile, error: ownerError },
        { data: existingPayments, error: paymentsError },
        { data: recentAnnouncements },
        { data: openMaintenanceRequests }
    ] = await Promise.all([
        supabase
            .from('profiles')
            .select('payment_methods, full_name, phone_number')
            .eq('id', building.owner_id)
            .maybeSingle(),
        supabase
            .from('payments')
            .select('id, amount, due_date, status, created_at, receipt_url, razorpay_payment_id')
            .eq('tenant_id', user.id)
            .eq('house_id', houseData.id)
            .eq('payment_type', 'rent')
            .gte('created_at', start.toISOString())
            .lt('created_at', end.toISOString())
            .order('created_at', { ascending: false }),
        supabase
            .from('announcements')
            .select('*')
            .or(`audience.eq.all_tenants,target_id.eq.${houseData.building_id}`)
            .order('created_at', { ascending: false })
            .limit(5),
        supabase
            .from('maintenance_requests')
            .select('*')
            .eq('tenant_id', user.id)
            .eq('status', 'open')
            .order('created_at', { ascending: false })
    ]);

    if (paymentsError) throw paymentsError;
    if (ownerError && ownerError.code !== 'PGRST116') throw ownerError;

    const completedPayment = (existingPayments || []).find((payment: any) => payment.status === 'completed');
    const duePayment = (existingPayments || []).find((payment: any) => ['pending', 'due', 'failed'].includes(payment.status));
    let nextPayment: TenantDashboardData['nextPayment'] = null;

    if (!completedPayment) {
        const nextDueDate = new Date();
        nextDueDate.setDate(5);
        if (new Date().getDate() > 5) {
            nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        }

        nextPayment = duePayment ? {
            id: duePayment.id,
            due_date: duePayment.due_date ? new Date(duePayment.due_date).toISOString() : nextDueDate.toISOString(),
            amount: Number(duePayment.amount || houseData.rent_amount),
            status: duePayment.status === 'completed' ? 'paid' : duePayment.status === 'failed' ? 'failed' : duePayment.status === 'pending' ? 'pending' : 'due',
            payment_mode: duePayment.razorpay_payment_id ? 'razorpay' : duePayment.receipt_url ? 'manual' : undefined,
            proof_url: await resolveReceiptUrl(duePayment.receipt_url)
        } : {
            id: `rent_due_${houseData.id}_${start.toISOString().slice(0, 7)}`,
            due_date: nextDueDate.toISOString(),
            amount: Number(houseData.rent_amount),
        };
    }

    const baseOperations = getTenantOperationalData(houseData, existingPayments || []);
    const scorecard = buildTenantScoreSummary({
        lifecycle: baseOperations.lifecycle,
        payments: existingPayments || [],
        reminders: baseOperations.reminders,
        openMaintenanceCount: (openMaintenanceRequests || []).length
    });
    const operations: TenantOperationalData = {
        ...baseOperations,
        lifecycle: {
            ...baseOperations.lifecycle,
            tenant_score: scorecard.score
        },
        scorecard,
        activityLog: buildTenantActivityLog({
            houseId: houseData.id,
            payments: (existingPayments || []).map((payment: any) => ({
                id: payment.id,
                payment_type: payment.payment_type || 'rent',
                created_at: payment.created_at,
                due_date: payment.due_date,
                paid_date: payment.paid_date,
                amount: Number(payment.amount || 0),
                status: normalizePaymentStatus(payment.status)
            })),
            reminders: baseOperations.reminders,
            agreement: baseOperations.agreement,
            lifecycle: {
                ...baseOperations.lifecycle,
                tenant_score: scorecard.score
            },
            openMaintenanceRequests: (openMaintenanceRequests as any) || []
        })
    };

    return {
        tenancyDetails: {
            building_name: building.name,
            house_number: houseData.house_number,
            house_id: houseData.id,
            lease_end_date: houseData.lease_end_date,
            rent_amount: houseData.rent_amount,
            cctv_url: building.cctv_url,
            lifecycle: operations.lifecycle
        },
        nextPayment,
        recentAnnouncements: recentAnnouncements || [],
        openMaintenanceRequests: (openMaintenanceRequests as any) || [],
        landlordPaymentDetails: { ...(ownerProfile?.payment_methods || {}), payeeName: ownerProfile?.full_name || 'Property Owner' },
        landlordContact: {
            name: ownerProfile?.full_name || 'Property Owner',
            phone_number: ownerProfile?.phone_number || ownerProfile?.payment_methods?.mobileNumber || null
        },
        chargeLedger: operations.ledger,
        agreement: operations.agreement,
        reminders: operations.reminders,
        lifecycle: operations.lifecycle,
        scorecard: operations.scorecard,
        activityLog: operations.activityLog
    };
};

export const submitFeedback = async (feedback: any): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    const entries = getStoredFeedback();
    entries.unshift({
        id: `feedback_${Date.now()}`,
        user_id: user?.id || null,
        rating: Number(feedback.rating || 0),
        comments: String(feedback.comments || ''),
        created_at: new Date().toISOString()
    });
    setStoredFeedback(entries);
};

export const verifyAndUploadTenantDocument = async (file: File, type: string): Promise<TenantDocument> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const filePath = `${user.id}/${Date.now()}-${sanitizeFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage
        .from('id-proofs')
        .upload(filePath, file, { upsert: false });

    if (uploadError) throw uploadError;

    const { data: signed } = await supabase.storage
        .from('id-proofs')
        .createSignedUrl(filePath, 60 * 60 * 24 * 7);

    let verification_notes = "Document appears valid and clear.";
    let status: TenantDocument['status'] = 'verified';
    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

    if (!supportedTypes.includes(file.type)) {
        verification_notes = "Unsupported document format. Please upload JPG, PNG, WEBP, or PDF.";
        status = 'rejected';
    } else if (file.size > 5 * 1024 * 1024) {
        verification_notes = "Image quality is low. Please re-upload a clearer image.";
        status = 'rejected';
    } else if (type === 'ID Proof') {
        await updateUserProfile({ id_proof_url: signed?.signedUrl || filePath });
    }

    return {
        id: filePath,
        name: file.name,
        type,
        status: status,
        verification_notes,
        uploaded_at: new Date().toISOString(),
        url: signed?.signedUrl
    };
};

export const getServiceProviders = async (category: string): Promise<ServiceProvider[]> => {
    let query = supabase
        .from('service_providers')
        .select('*')
        .order('is_verified', { ascending: false })
        .order('created_at', { ascending: false });

    if (category !== 'All') {
        query = query.eq('category', category);
    }

    const { data: providers, error } = await query;
    if (error) throw error;

    const providerIds = (providers || []).map((provider: any) => provider.id);
    let reviewsByProvider = new Map<string, { total: number; count: number }>();

    if (providerIds.length > 0) {
        const { data: reviews, error: reviewsError } = await supabase
            .from('service_reviews')
            .select('provider_id, rating')
            .in('provider_id', providerIds);

        if (reviewsError) throw reviewsError;

        reviewsByProvider = (reviews || []).reduce((map: Map<string, { total: number; count: number }>, review: any) => {
            const current = map.get(review.provider_id) || { total: 0, count: 0 };
            current.total += Number(review.rating || 0);
            current.count += 1;
            map.set(review.provider_id, current);
            return map;
        }, new Map<string, { total: number; count: number }>());
    }

    return (providers || []).map((provider: any) => {
        const aggregate = reviewsByProvider.get(provider.id);
        return {
            id: provider.id,
            name: provider.name,
            category: provider.category,
            phone_number: provider.phone_number,
            location: provider.location,
            rating: aggregate ? Number((aggregate.total / aggregate.count).toFixed(1)) : Number(provider.rating || 0),
            jobs_completed: Number(provider.jobs_completed || 0),
            is_verified: Boolean(provider.is_verified),
            description: provider.description,
            availability: provider.availability || 'Available',
            catalogs: provider.catalogs || []
        };
    });
};

export const registerServiceProvider = async (data: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const payload = {
        ...data,
        user_id: user.id,
        is_verified: false,
        jobs_completed: 0,
        rating: 0,
        catalogs: []
    };

    const { error } = await supabase.from('service_providers').insert(payload);
    if (error) throw error;
};

export const addServiceReview = async (id: string, rating: number, comment: string, name: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('service_reviews').insert({
        provider_id: id,
        reviewer_id: user?.id || null,
        reviewer_name: name,
        rating,
        comment
    });
    if (error) throw error;
};

export const getDocuments = async (id: string) => {
    const { data, error } = await supabase.storage
        .from('tenant_documents')
        .list(id, {
            limit: 100,
            sortBy: { column: 'created_at', order: 'desc' }
        });

    if (error) throw error;

    const documents = await Promise.all((data || []).filter((item) => item.name).map(async (item) => {
        const path = `${id}/${item.name}`;
        const { data: signed } = await supabase.storage
            .from('tenant_documents')
            .createSignedUrl(path, 60 * 60);

        return {
            id: path,
            name: item.name,
            size: item.metadata?.size || 0,
            created_at: item.created_at || new Date().toISOString(),
            publicUrl: signed?.signedUrl || ''
        };
    }));

    return documents;
};

export const uploadDocument = async (id: string, file: File) => {
    const filePath = `${id}/${Date.now()}-${sanitizeFileName(file.name)}`;
    const { error } = await supabase.storage
        .from('tenant_documents')
        .upload(filePath, file, { upsert: false });

    if (error) throw error;
};

export const deleteDocument = async (id: string, name: string) => {
    const { error } = await supabase.storage
        .from('tenant_documents')
        .remove([`${id}/${name}`]);

    if (error) throw error;
};
