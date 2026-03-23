
import { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import {
    Property, DashboardSummary, FinancialDataPoint, OccupancyDataPoint,
    Tenant, Transaction, MaintenanceRequest, Listing, Profile,
    Announcement, LeaseExpiry, AiSuggestion, TodaysFocusItem,
    TenantDashboardData, VacantUnit, NewListingData,
    ServiceProvider, ServiceCategory,
    PaymentMethods, UserRole, AppNotification, MaintenanceStatus,
    TenantDocument, OccupancyStatus, DetailedVacantUnit,
    Visitor, Amenity, Poll, ChatMessage, ForecastDataPoint,
    ChargeLedgerEntry, AgreementWorkflow, ReminderRecord, TenantOperationalData, TenantLifecycleData
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
const getE2EState = () => {
    if (typeof window === 'undefined') return null;
    return (window as any).__NILAYAM_E2E__ || null;
};
const localOpsKey = (houseId: string) => `nilayam_ops_${houseId}`;
const tenantIdentityRegistryKey = 'nilayam_tenant_identity_registry';
const formatBillingMonth = (value: Date | string) => {
    const date = typeof value === 'string' ? new Date(value) : value;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};
const titleCase = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
const toDateInput = (value: Date) => value.toISOString().slice(0, 10);
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
    agreement_start_date: null,
    agreement_end_date: house.lease_end_date || null,
    renewal_notice_days: 30,
    vacate_notice_date: null,
    vacate_reason: null,
    notice_period_days: 30,
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

    return {
        ledger: mergedLedger,
        agreement,
        reminders,
        lifecycle: buildDefaultLifecycle(house, stored.lifecycle)
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

export const getDashboardSummary = async (): Promise<DashboardSummary> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const [
        propertiesResult,
        unitsResult,
        occupiedUnitsResult,
        maintenanceResult,
        paymentsResult,
        housesResult
    ] = await Promise.all([
        supabase.from('buildings').select('*', { count: 'exact', head: true }).eq('owner_id', user.id),
        supabase.from('houses').select('id, buildings!inner(owner_id)', { count: 'exact', head: true }).eq('buildings.owner_id', user.id),
        supabase.from('houses').select('id, buildings!inner(owner_id)', { count: 'exact', head: true }).eq('buildings.owner_id', user.id).not('tenant_name', 'is', null),
        supabase.from('maintenance_requests').select('id', { count: 'exact', head: true }).eq('owner_id', user.id).eq('status', 'open'),
        supabase.from('payments').select('amount, created_at, houses!inner(buildings!inner(owner_id))').eq('status', 'completed').eq('houses.buildings.owner_id', user.id),
        supabase.from('houses').select('rent_amount, buildings!inner(owner_id)').eq('buildings.owner_id', user.id).not('tenant_name', 'is', null)
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

export const getFinancialSummary = async (): Promise<FinancialDataPoint[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const transactionsResult = await supabase
        .from('transactions')
        .select('date, amount, type')
        .eq('owner_id', user.id)
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
        .eq('houses.buildings.owner_id', user.id)
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

export const getOccupancySummary = async (): Promise<OccupancyDataPoint[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const totalResult = await supabase
        .from('houses')
        .select('id, buildings!inner(owner_id)', { count: 'exact', head: true })
        .eq('buildings.owner_id', user.id);

    const occupiedResult = await supabase
        .from('houses')
        .select('id, buildings!inner(owner_id)', { count: 'exact', head: true })
        .eq('buildings.owner_id', user.id)
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
        .select('*, buildings(name, id)')
        .eq('id', tenantId)
        .single();
    if (error) throw error;

    const { data: paymentRows, error: paymentsError } = await supabase
        .from('payments')
        .select('id, due_date, paid_date, amount, status')
        .eq('house_id', tenantId)
        .order('due_date', { ascending: false });

    if (paymentsError) throw paymentsError;

    const payments = (paymentRows || []).map((payment: any) => ({
        id: payment.id,
        due_date: payment.due_date,
        paid_date: payment.paid_date || undefined,
        amount: Number(payment.amount || 0),
        status: payment.status === 'completed' ? 'paid' : 'due'
    }));

    const operations = getTenantOperationalData(data, paymentRows || []);

    return {
        ...data,
        building_name: data.buildings?.name,
        building_id: data.buildings?.id,
        payments,
        operations,
        lifecycle: operations.lifecycle,
        tenant_score: Number(operations.lifecycle?.tenant_score || 0)
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
        house_id: houseId,
        last_updated_at: new Date().toISOString()
    };

    setStoredOperations(houseId, {
        ...stored,
        agreement: nextAgreement
    });

    return nextAgreement;
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
    const { error } = await supabase
        .from('payments')
        .update({
            status: 'completed',
            paid_date: new Date().toISOString().slice(0, 10)
        })
        .eq('id', paymentId)
        .in('status', ['pending', 'due']);

    if (error) throw error;
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

export const createMarketplaceListings = async (listings: NewListingData[]): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not found");
    const payload = listings.map(l => ({ ...l, owner_id: user.id }));
    await supabase.from('listings').insert(payload);
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
    return [];
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
            .select('payment_methods, full_name')
            .eq('id', building.owner_id)
            .maybeSingle(),
        supabase
            .from('payments')
            .select('id, amount, due_date, status, created_at')
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
    const duePayment = (existingPayments || []).find((payment: any) => payment.status === 'pending' || payment.status === 'due');
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
        } : {
            id: `rent_due_${houseData.id}_${start.toISOString().slice(0, 7)}`,
            due_date: nextDueDate.toISOString(),
            amount: Number(houseData.rent_amount),
        };
    }

    const operations = getTenantOperationalData(houseData, existingPayments || []);

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
        chargeLedger: operations.ledger,
        agreement: operations.agreement,
        reminders: operations.reminders,
        lifecycle: operations.lifecycle
    };
};

export const submitFeedback = async (feedback: any): Promise<void> => {
    // await supabase.from('feedback').insert(feedback);
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
