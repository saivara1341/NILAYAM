import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    AgreementWorkflow,
    ChargeCategory,
    ChargeLedgerEntry,
    Payment,
    ReminderRecord,
    TenantProfile
} from '../types';
import {
    acknowledgeTenantAgreement,
    addTenantCharge,
    createAnnouncement,
    getTenantDetailsWithPayments,
    markReminderAsSent,
    scheduleTenantReminder,
    updateTenantLifecycle,
    updateTenantAgreement
} from '../services/api';
import Card from '../components/ui/Card';
import DocumentManager from '../components/tenants/DocumentManager';
import LeaseGeneratorModal from '../components/tenants/LeaseGeneratorModal';
import Spinner from '../components/ui/Spinner';

const paymentStatusStyles: Record<Payment['status'], string> = {
    paid: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    due: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

const chargeStatusStyles: Record<ChargeLedgerEntry['status'], string> = {
    paid: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    due: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    overdue: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
};

const agreementStatuses: AgreementWorkflow['status'][] = ['draft', 'active', 'renewal_due', 'renewal_in_progress', 'vacate_notice_received', 'closure_in_progress', 'closed'];
const agreementTypes: AgreementWorkflow['agreement_type'][] = ['residential_rental', 'leave_and_license', 'commercial_lease', 'pg_hostel', 'company_lease'];
const chargeCategories: ChargeCategory[] = ['electricity', 'water', 'maintenance', 'internet', 'parking', 'other'];

const formatLabel = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
const monthKey = (value: Date | string) => {
    const date = typeof value === 'string' ? new Date(value) : value;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const TenantScorecard: React.FC<{ tenant: TenantProfile }> = ({ tenant }) => (
    <Card>
        <h3 className="text-xl font-semibold mb-4 text-neutral-800 dark:text-neutral-200">Tenant Scorecard</h3>
        <div className="text-center mb-4">
            <div className="inline-block relative p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-full">
                <div className="text-5xl font-bold text-blue-600 dark:text-blue-400">{tenant.tenant_score ?? 0}</div>
                <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Trust Score</div>
            </div>
        </div>
        <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center p-2 rounded-md bg-neutral-50 dark:bg-neutral-800/50"><span className="text-neutral-500 dark:text-neutral-400">Payment Reliability</span><span className="font-bold text-green-600">Excellent</span></div>
            <div className="flex justify-between items-center p-2 rounded-md bg-neutral-50 dark:bg-neutral-800/50"><span className="text-neutral-500 dark:text-neutral-400">Complaint History</span><span className="font-bold text-green-600">Low</span></div>
            <div className="flex justify-between items-center p-2 rounded-md bg-neutral-50 dark:bg-neutral-800/50"><span className="text-neutral-500 dark:text-neutral-400">ID Verification</span><span className="font-bold text-green-600">Verified</span></div>
        </div>
        <p className="text-xs text-neutral-400 mt-4 text-center">Score is generated from payment consistency, complaint trend, and document readiness.</p>
    </Card>
);

const PaymentHistory: React.FC<{ payments: Payment[] }> = ({ payments }) => (
    <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Due Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Paid Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Status</th>
                </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {payments.map((payment) => (
                    <tr key={payment.id}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{new Date(payment.due_date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{payment.paid_date ? new Date(payment.paid_date).toLocaleDateString() : 'N/A'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">₹{payment.amount.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${paymentStatusStyles[payment.status]}`}>{payment.status.toUpperCase()}</span>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const ChargeLedgerTable: React.FC<{ ledger: ChargeLedgerEntry[] }> = ({ ledger }) => (
    <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
            <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Charge</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Billing Month</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Due</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Status</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {ledger.map((entry) => (
                    <tr key={entry.id}>
                        <td className="px-4 py-3">
                            <p className="text-sm font-semibold text-neutral-900 dark:text-white">{entry.label}</p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">{formatLabel(entry.category)}{entry.units_consumed ? ` • ${entry.units_consumed} units` : ''}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">{entry.billing_month}</td>
                        <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">{new Date(entry.due_date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-neutral-900 dark:text-white">₹{entry.amount.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${chargeStatusStyles[entry.status]}`}>{formatLabel(entry.status)}</span>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const TenantDetailPage: React.FC = () => {
    const { tenantId } = useParams<{ tenantId: string }>();
    const [tenant, setTenant] = useState<TenantProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [isLeaseModalOpen, setIsLeaseModalOpen] = useState(false);
    const [agreementDraft, setAgreementDraft] = useState<AgreementWorkflow | null>(null);
    const [chargeForm, setChargeForm] = useState({
        category: 'electricity' as ChargeCategory,
        label: 'Electricity Bill',
        billingMonth: monthKey(new Date()),
        amount: '',
        dueDate: new Date().toISOString().slice(0, 10),
        notes: '',
        meterReading: '',
        unitsConsumed: ''
    });
    const [reminderForm, setReminderForm] = useState({
        type: 'utility' as ReminderRecord['type'],
        title: '',
        message: '',
        scheduledFor: new Date().toISOString().slice(0, 16),
        channel: 'in_app' as ReminderRecord['channel']
    });
    const [lifecycleForm, setLifecycleForm] = useState({
        moveInDate: '',
        advanceAmount: '',
        advanceReceivedOn: '',
        possessionHandoverOn: '',
        agreementAcceptanceNote: ''
    });

    useEffect(() => {
        if (!tenantId) return;
        const refreshTenant = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await getTenantDetailsWithPayments(tenantId);
                setTenant(data);
                setAgreementDraft(data.operations?.agreement || null);
                setLifecycleForm({
                    moveInDate: data.lifecycle?.move_in_date || '',
                    advanceAmount: data.lifecycle?.advance_amount ? String(data.lifecycle.advance_amount) : '',
                    advanceReceivedOn: data.lifecycle?.advance_received_on || '',
                    possessionHandoverOn: data.lifecycle?.possession_handover_on || '',
                    agreementAcceptanceNote: data.lifecycle?.agreement_acceptance_note || ''
                });
            } catch (err: any) {
                setError(err.message || 'Failed to fetch tenant details.');
            } finally {
                setLoading(false);
            }
        };
        refreshTenant();
    }, [tenantId]);

    const paymentSummary = useMemo(() => {
        if (!tenant) return { totalPaid: 0, totalDue: 0, status: 'N/A' };
        const totalPaid = tenant.payments.filter((payment) => payment.status === 'paid').reduce((sum, payment) => sum + payment.amount, 0);
        const totalDue = tenant.payments.filter((payment) => payment.status === 'due').reduce((sum, payment) => sum + payment.amount, 0);
        return { totalPaid, totalDue, status: totalDue > 0 ? 'Overdue' : 'Up to Date' };
    }, [tenant]);

    const ledgerSummary = useMemo(() => {
        const ledger = tenant?.operations?.ledger || [];
        return ledger.reduce((acc, entry) => {
            if (entry.status === 'paid') acc.collected += entry.amount;
            else acc.pending += entry.amount;
            if (entry.category !== 'rent') acc.utilities += entry.amount;
            return acc;
        }, { collected: 0, pending: 0, utilities: 0 });
    }, [tenant]);

    const handleAnnouncement = async (title: string, message: string) => {
        if (!tenant) return;
        await createAnnouncement({
            title,
            message,
            audience: 'specific_building',
            target_id: tenant.building_id
        });
    };

    const handleSendReminder = async () => {
        if (!tenant) return;
        setIsSending(true);
        setError(null);
        try {
            await handleAnnouncement(
                `Rent Reminder: Unit ${tenant.house_number}`,
                `Rent of ₹${tenant.rent_amount?.toLocaleString('en-IN')} for Unit ${tenant.house_number} is due. Please clear the amount on time to keep the ledger current.`
            );
        } catch (err: any) {
            setError(err.message || 'Failed to send reminder.');
        } finally {
            setIsSending(false);
        }
    };

    const handleSaveAgreement = async () => {
        if (!tenant || !agreementDraft) return;
        setIsSending(true);
        setError(null);
        try {
            const next = await updateTenantAgreement(tenant.id, agreementDraft);
            setAgreementDraft(next);
            setTenant((current) => current ? { ...current, operations: { ...current.operations!, agreement: next } } : current);
        } catch (err: any) {
            setError(err.message || 'Failed to save agreement workflow.');
        } finally {
            setIsSending(false);
        }
    };

    const handleAgreementAction = async (status: AgreementWorkflow['status'], title: string, message: string, extra?: Partial<AgreementWorkflow>) => {
        if (!tenant || !agreementDraft) return;
        setIsSending(true);
        setError(null);
        try {
            await handleAnnouncement(title, message);
            const next = await updateTenantAgreement(tenant.id, {
                ...agreementDraft,
                ...extra,
                status
            });
            setAgreementDraft(next);
            setTenant((current) => current ? { ...current, operations: { ...current.operations!, agreement: next } } : current);
        } catch (err: any) {
            setError(err.message || 'Failed to update agreement workflow.');
        } finally {
            setIsSending(false);
        }
    };

    const handleAddCharge = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!tenant) return;
        setIsSending(true);
        setError(null);
        try {
            const entry = await addTenantCharge(tenant.id, {
                tenant_id: tenant.tenant_id || null,
                category: chargeForm.category,
                label: chargeForm.label,
                billing_month: chargeForm.billingMonth,
                amount: Number(chargeForm.amount || 0),
                due_date: chargeForm.dueDate,
                notes: chargeForm.notes || undefined,
                meter_reading: chargeForm.meterReading ? Number(chargeForm.meterReading) : undefined,
                units_consumed: chargeForm.unitsConsumed ? Number(chargeForm.unitsConsumed) : undefined
            });
            setTenant((current) => current ? {
                ...current,
                operations: { ...current.operations!, ledger: [entry, ...(current.operations?.ledger || [])] }
            } : current);
            setChargeForm({
                category: 'electricity',
                label: 'Electricity Bill',
                billingMonth: monthKey(new Date()),
                amount: '',
                dueDate: new Date().toISOString().slice(0, 10),
                notes: '',
                meterReading: '',
                unitsConsumed: ''
            });
        } catch (err: any) {
            setError(err.message || 'Failed to add charge.');
        } finally {
            setIsSending(false);
        }
    };

    const handleScheduleReminder = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!tenant) return;
        setIsSending(true);
        setError(null);
        try {
            const record = await scheduleTenantReminder(tenant.id, {
                tenant_id: tenant.tenant_id || null,
                type: reminderForm.type,
                title: reminderForm.title,
                message: reminderForm.message,
                scheduled_for: new Date(reminderForm.scheduledFor).toISOString(),
                channel: reminderForm.channel
            });
            setTenant((current) => current ? {
                ...current,
                operations: { ...current.operations!, reminders: [...(current.operations?.reminders || []), record] }
            } : current);
            setReminderForm({
                type: 'utility',
                title: '',
                message: '',
                scheduledFor: new Date().toISOString().slice(0, 16),
                channel: 'in_app'
            });
        } catch (err: any) {
            setError(err.message || 'Failed to schedule reminder.');
        } finally {
            setIsSending(false);
        }
    };

    const handleSendScheduledReminder = async (record: ReminderRecord) => {
        if (!tenant) return;
        setIsSending(true);
        setError(null);
        try {
            await handleAnnouncement(record.title, record.message);
            await markReminderAsSent(tenant.id, record.id);
            setTenant((current) => current ? {
                ...current,
                operations: {
                    ...current.operations!,
                    reminders: (current.operations?.reminders || []).map((item) =>
                        item.id === record.id ? { ...item, status: 'sent', sent_at: new Date().toISOString() } : item
                    )
                }
            } : current);
        } catch (err: any) {
            setError(err.message || 'Failed to send reminder.');
        } finally {
            setIsSending(false);
        }
    };

    const handleSaveLifecycle = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!tenant) return;
        setIsSending(true);
        setError(null);
        try {
            const lifecycle = await updateTenantLifecycle(tenant.id, {
                move_in_date: lifecycleForm.moveInDate || null,
                advance_amount: Number(lifecycleForm.advanceAmount || 0),
                advance_received_on: lifecycleForm.advanceReceivedOn || null,
                possession_handover_on: lifecycleForm.possessionHandoverOn || null,
                agreement_acceptance_note: lifecycleForm.agreementAcceptanceNote || null
            });
            setTenant((current) => current ? {
                ...current,
                lifecycle,
                operations: current.operations ? { ...current.operations, lifecycle } : current.operations
            } : current);
        } catch (err: any) {
            setError(err.message || 'Failed to save tenant lifecycle details.');
        } finally {
            setIsSending(false);
        }
    };

    const handleAcknowledgeAgreement = async () => {
        if (!tenant) return;
        setIsSending(true);
        setError(null);
        try {
            const lifecycle = await acknowledgeTenantAgreement(tenant.id, lifecycleForm.agreementAcceptanceNote || undefined);
            setTenant((current) => current ? {
                ...current,
                lifecycle,
                operations: current.operations ? { ...current.operations, lifecycle } : current.operations
            } : current);
        } catch (err: any) {
            setError(err.message || 'Failed to record agreement acknowledgement.');
        } finally {
            setIsSending(false);
        }
    };

    if (loading) return <div className="text-center p-8"><Spinner /></div>;
    if (error && !tenant) return <div className="text-red-500 bg-red-100 p-4 rounded-md">Error: {error}</div>;
    if (!tenant) return <div className="text-center p-8">Tenant not found.</div>;

    return (
        <div className="space-y-6 animate-fade-in">
            <LeaseGeneratorModal isOpen={isLeaseModalOpen} onClose={() => setIsLeaseModalOpen(false)} tenant={tenant} />
            <div>
                <Link to="/tenants" className="text-primary hover:text-primary-dark dark:text-primary-light dark:hover:text-white text-sm">&larr; Back to All Tenants</Link>
                <h2 className="text-3xl font-bold text-neutral-800 dark:text-neutral-200 mt-2">{tenant.name}</h2>
                <p className="text-neutral-500 dark:text-neutral-400 mt-1">Owner operations desk for rent, utilities, agreement lifecycle, reminders, and move-out planning.</p>
            </div>

            {error && <div className="rounded-2xl bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 px-4 py-3 text-sm">{error}</div>}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Collection Status</p>
                    <p className={`text-2xl font-bold ${paymentSummary.status === 'Overdue' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{paymentSummary.status}</p>
                </Card>
                <Card>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Collected</p>
                    <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-200">₹{ledgerSummary.collected.toLocaleString('en-IN')}</p>
                </Card>
                <Card>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Pending</p>
                    <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-200">₹{ledgerSummary.pending.toLocaleString('en-IN')}</p>
                </Card>
                <Card>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Utility Exposure</p>
                    <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-200">₹{ledgerSummary.utilities.toLocaleString('en-IN')}</p>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <h3 className="text-xl font-semibold mb-4 text-neutral-800 dark:text-neutral-200">Tenant Information</h3>
                        <div className="space-y-3 text-sm">
                            <p><strong className="text-neutral-500 dark:text-neutral-400">Property:</strong> {tenant.building_name}</p>
                            <p><strong className="text-neutral-500 dark:text-neutral-400">Unit:</strong> {tenant.house_number}</p>
                            <p><strong className="text-neutral-500 dark:text-neutral-400">Parking Slot:</strong> {tenant.parking_slot || 'N/A'}</p>
                            <p><strong className="text-neutral-500 dark:text-neutral-400">Phone:</strong> {tenant.phone_number}</p>
                            <p><strong className="text-neutral-500 dark:text-neutral-400">Rent:</strong> ₹{tenant.rent_amount?.toLocaleString('en-IN')}/month</p>
                            <p><strong className="text-neutral-500 dark:text-neutral-400">Move-In:</strong> {tenant.lifecycle?.move_in_date ? new Date(tenant.lifecycle.move_in_date).toLocaleDateString() : 'Not recorded'}</p>
                            <p><strong className="text-neutral-500 dark:text-neutral-400">Advance / Deposit:</strong> ₹{Number(tenant.lifecycle?.advance_amount || 0).toLocaleString('en-IN')}</p>
                            <p><strong className="text-neutral-500 dark:text-neutral-400">Advance Received:</strong> {tenant.lifecycle?.advance_received_on ? new Date(tenant.lifecycle.advance_received_on).toLocaleDateString() : 'Not recorded'}</p>
                            <p><strong className="text-neutral-500 dark:text-neutral-400">Lease Ends:</strong> {tenant.lease_end_date ? new Date(tenant.lease_end_date).toLocaleDateString() : 'N/A'}</p>
                            <p><strong className="text-neutral-500 dark:text-neutral-400">Agreement Ack:</strong> {tenant.lifecycle?.agreement_acknowledged_at ? new Date(tenant.lifecycle.agreement_acknowledged_at).toLocaleString() : 'Pending acknowledgement'}</p>
                        </div>
                        <div className="mt-6 grid grid-cols-1 gap-3">
                            <button onClick={handleSendReminder} disabled={isSending} className="w-full btn btn-primary">
                                {isSending ? 'Working...' : 'Send Rent Reminder'}
                            </button>
                            <button onClick={() => setIsLeaseModalOpen(true)} className="w-full rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 px-4 py-3 text-sm font-black transition hover:opacity-90">
                                Draft Agreement
                            </button>
                        </div>
                    </Card>

                    <TenantScorecard tenant={tenant} />
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <div className="flex items-center justify-between gap-4 mb-4">
                            <div>
                                <h3 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200">Monthly Charge Ledger</h3>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">Track rent, electricity, water, internet, maintenance, and other recoveries month by month.</p>
                            </div>
                        </div>
                        <ChargeLedgerTable ledger={tenant.operations?.ledger || []} />
                    </Card>

                    <Card>
                        <h3 className="text-xl font-semibold mb-4 text-neutral-800 dark:text-neutral-200">Payment History</h3>
                        {tenant.payments.length > 0 ? <PaymentHistory payments={tenant.payments} /> : <p className="text-neutral-500 dark:text-neutral-400 text-center py-8">No payment history found for this tenant.</p>}
                    </Card>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <h3 className="text-xl font-semibold mb-4 text-neutral-800 dark:text-neutral-200">Move-In, Deposit & Handover</h3>
                        <form className="space-y-3" onSubmit={handleSaveLifecycle}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <input type="date" value={lifecycleForm.moveInDate} onChange={(event) => setLifecycleForm((current) => ({ ...current, moveInDate: event.target.value }))} className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-sm" />
                                <input type="number" value={lifecycleForm.advanceAmount} onChange={(event) => setLifecycleForm((current) => ({ ...current, advanceAmount: event.target.value }))} className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-sm" placeholder="Advance amount" />
                                <input type="date" value={lifecycleForm.advanceReceivedOn} onChange={(event) => setLifecycleForm((current) => ({ ...current, advanceReceivedOn: event.target.value }))} className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-sm" />
                                <input type="date" value={lifecycleForm.possessionHandoverOn} onChange={(event) => setLifecycleForm((current) => ({ ...current, possessionHandoverOn: event.target.value }))} className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-sm" />
                            </div>
                            <textarea value={lifecycleForm.agreementAcceptanceNote} onChange={(event) => setLifecycleForm((current) => ({ ...current, agreementAcceptanceNote: event.target.value }))} className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-sm min-h-[88px]" placeholder="Agreement note or tenant acceptance remarks" />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <button type="submit" disabled={isSending} className="rounded-xl bg-blue-600 text-white px-4 py-3 text-sm font-black transition hover:bg-blue-700 disabled:opacity-60">Save Lifecycle</button>
                                <button type="button" onClick={handleAcknowledgeAgreement} disabled={isSending} className="rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white px-4 py-3 text-sm font-black transition hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-60">Mark Agreement Acknowledged</button>
                            </div>
                        </form>
                    </Card>

                    <Card>
                        <h3 className="text-xl font-semibold mb-4 text-neutral-800 dark:text-neutral-200">Add Utility / Charge</h3>
                    <form className="space-y-3" onSubmit={handleAddCharge}>
                        <div className="grid grid-cols-2 gap-3">
                            <select value={chargeForm.category} onChange={(event) => setChargeForm((current) => ({ ...current, category: event.target.value as ChargeCategory, label: `${formatLabel(event.target.value)} Bill` }))} className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-sm">
                                {chargeCategories.map((category) => <option key={category} value={category}>{formatLabel(category)}</option>)}
                            </select>
                            <input value={chargeForm.billingMonth} onChange={(event) => setChargeForm((current) => ({ ...current, billingMonth: event.target.value }))} className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-sm" placeholder="YYYY-MM" />
                        </div>
                        <input value={chargeForm.label} onChange={(event) => setChargeForm((current) => ({ ...current, label: event.target.value }))} className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-sm" placeholder="Charge label" />
                        <div className="grid grid-cols-2 gap-3">
                            <input type="number" value={chargeForm.amount} onChange={(event) => setChargeForm((current) => ({ ...current, amount: event.target.value }))} className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-sm" placeholder="Amount" />
                            <input type="date" value={chargeForm.dueDate} onChange={(event) => setChargeForm((current) => ({ ...current, dueDate: event.target.value }))} className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-sm" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <input type="number" value={chargeForm.meterReading} onChange={(event) => setChargeForm((current) => ({ ...current, meterReading: event.target.value }))} className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-sm" placeholder="Meter reading" />
                            <input type="number" value={chargeForm.unitsConsumed} onChange={(event) => setChargeForm((current) => ({ ...current, unitsConsumed: event.target.value }))} className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-sm" placeholder="Units consumed" />
                        </div>
                        <textarea value={chargeForm.notes} onChange={(event) => setChargeForm((current) => ({ ...current, notes: event.target.value }))} className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-sm min-h-[88px]" placeholder="Billing notes or reconciliation remarks" />
                        <button type="submit" disabled={isSending} className="w-full rounded-xl bg-blue-600 text-white px-4 py-3 text-sm font-black transition hover:bg-blue-700 disabled:opacity-60">Add Charge to Ledger</button>
                    </form>
                </Card>

                <Card>
                    <div className="flex items-center justify-between gap-4 mb-4">
                        <div>
                            <h3 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200">Agreement Lifecycle</h3>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">Manage agreement type, renewal stage, vacate notice, and closure readiness.</p>
                        </div>
                    </div>
                    {agreementDraft && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <select value={agreementDraft.agreement_type} onChange={(event) => setAgreementDraft((current) => current ? { ...current, agreement_type: event.target.value as AgreementWorkflow['agreement_type'] } : current)} className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-sm">
                                    {agreementTypes.map((type) => <option key={type} value={type}>{formatLabel(type)}</option>)}
                                </select>
                                <select value={agreementDraft.status} onChange={(event) => setAgreementDraft((current) => current ? { ...current, status: event.target.value as AgreementWorkflow['status'] } : current)} className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-sm">
                                    {agreementStatuses.map((status) => <option key={status} value={status}>{formatLabel(status)}</option>)}
                                </select>
                                <input type="date" value={agreementDraft.agreement_start_date || ''} onChange={(event) => setAgreementDraft((current) => current ? { ...current, agreement_start_date: event.target.value } : current)} className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-sm" />
                                <input type="date" value={agreementDraft.agreement_end_date || ''} onChange={(event) => setAgreementDraft((current) => current ? { ...current, agreement_end_date: event.target.value } : current)} className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-sm" />
                                <input type="number" value={agreementDraft.renewal_notice_days} onChange={(event) => setAgreementDraft((current) => current ? { ...current, renewal_notice_days: Number(event.target.value || 0) } : current)} className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-sm" placeholder="Renewal notice days" />
                                <input type="number" value={agreementDraft.notice_period_days || 30} onChange={(event) => setAgreementDraft((current) => current ? { ...current, notice_period_days: Number(event.target.value || 0) } : current)} className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-sm" placeholder="Vacate notice days" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                <button onClick={handleSaveAgreement} disabled={isSending} className="rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 px-4 py-3 text-sm font-black transition hover:opacity-90 disabled:opacity-60">Save Workflow</button>
                                <button onClick={() => handleAgreementAction('renewal_in_progress', `Lease Renewal Planning: Unit ${tenant.house_number}`, `Lease renewal planning has started for Unit ${tenant.house_number}. Please review the agreement timeline and confirm your renewal preference.`)} disabled={isSending} className="rounded-xl bg-blue-600 text-white px-4 py-3 text-sm font-black transition hover:bg-blue-700 disabled:opacity-60">Send Renewal Alert</button>
                                <button onClick={() => handleAgreementAction('vacate_notice_received', `Vacate Planning Notice: Unit ${tenant.house_number}`, `If you plan to vacate Unit ${tenant.house_number}, please inform management in advance so settlement, utilities, and agreement closure can be prepared on time.`, { vacate_notice_date: new Date().toISOString().slice(0, 10) })} disabled={isSending} className="rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white px-4 py-3 text-sm font-black transition hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-60">Start Vacate Workflow</button>
                                <button onClick={() => handleAgreementAction('closure_in_progress', `Agreement Closure Started: Unit ${tenant.house_number}`, `Agreement closure and final reconciliation are being prepared for Unit ${tenant.house_number}. Please review outstanding payments and utilities.`)} disabled={isSending} className="rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white px-4 py-3 text-sm font-black transition hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-60">Begin Closure</button>
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            <Card>
                <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                        <h3 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200">Reminder Automation & Owner Notification Center</h3>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Schedule rent, utility, renewal, and vacate follow-ups. Due items appear in the header inbox.</p>
                    </div>
                </div>
                <form className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5" onSubmit={handleScheduleReminder}>
                    <select value={reminderForm.type} onChange={(event) => setReminderForm((current) => ({ ...current, type: event.target.value as ReminderRecord['type'] }))} className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-sm">
                        <option value="rent">Rent</option>
                        <option value="utility">Utility</option>
                        <option value="agreement_renewal">Agreement Renewal</option>
                        <option value="vacate_followup">Vacate Follow-up</option>
                    </select>
                    <select value={reminderForm.channel} onChange={(event) => setReminderForm((current) => ({ ...current, channel: event.target.value as ReminderRecord['channel'] }))} className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-sm">
                        <option value="in_app">In-app</option>
                        <option value="email">Email</option>
                        <option value="whatsapp">WhatsApp</option>
                    </select>
                    <input value={reminderForm.title} onChange={(event) => setReminderForm((current) => ({ ...current, title: event.target.value }))} className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-sm" placeholder="Reminder title" />
                    <input type="datetime-local" value={reminderForm.scheduledFor} onChange={(event) => setReminderForm((current) => ({ ...current, scheduledFor: event.target.value }))} className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-sm" />
                    <textarea value={reminderForm.message} onChange={(event) => setReminderForm((current) => ({ ...current, message: event.target.value }))} className="md:col-span-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-sm min-h-[90px]" placeholder="Reminder message shown in owner inbox and tenant announcement." />
                    <button type="submit" disabled={isSending} className="md:col-span-2 rounded-xl bg-blue-600 text-white px-4 py-3 text-sm font-black transition hover:bg-blue-700 disabled:opacity-60">Schedule Reminder</button>
                </form>
                <div className="space-y-3">
                    {(tenant.operations?.reminders || []).length === 0 ? (
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">No reminders scheduled for this tenant yet.</p>
                    ) : (
                        tenant.operations?.reminders.map((record) => (
                            <div key={record.id} className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-bold text-neutral-900 dark:text-white">{record.title}</p>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${record.status === 'sent' ? chargeStatusStyles.paid : chargeStatusStyles.scheduled}`}>{formatLabel(record.status)}</span>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200">{formatLabel(record.channel)}</span>
                                    </div>
                                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{record.message}</p>
                                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">Scheduled for {new Date(record.scheduled_for).toLocaleString()}</p>
                                </div>
                                {record.status === 'scheduled' && (
                                    <button onClick={() => handleSendScheduledReminder(record)} disabled={isSending} className="rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 px-4 py-3 text-sm font-black transition hover:opacity-90 disabled:opacity-60">
                                        Send Now
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </Card>

            <Card>
                <h3 className="text-xl font-semibold mb-4 text-neutral-800 dark:text-neutral-200">Digital Document Vault</h3>
                <DocumentManager houseId={tenant.id} />
            </Card>
        </div>
    );
};

export default TenantDetailPage;
