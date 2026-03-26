import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import { approveTenantPayment, getOwnerPaymentsDashboard, rejectTenantPayment } from '@/services/api';
import { OwnerPaymentsDashboard, Payment } from '@/types';
import { BankIcon, CheckCircleIcon, CreditCardIcon, DollarSignIcon, QrCodeIcon, SearchIcon, ShieldCheckIcon } from '@/constants';
import { Check, Copy } from 'lucide-react';
import { copyText, openPhoneDialer, openWhatsAppChat } from '@/utils/sharing';
import { getShellPlatform } from '@/utils/platform';

const currency = (value: number) => `₹${value.toLocaleString('en-IN')}`;

const statusClasses: Record<Payment['status'], string> = {
    paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    pending: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    due: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
};

const modeLabel = (payment: Payment) => {
    if (payment.payment_mode === 'manual') return 'Manual proof';
    if (payment.payment_mode === 'razorpay') return 'Online';
    return 'Pending';
};

const TenantContactActions: React.FC<{ payment: Payment }> = ({ payment }) => {
    const [copied, setCopied] = useState(false);

    if (!payment.tenant_phone_number) return null;

    const handleCopy = async () => {
        const ok = await copyText(payment.tenant_phone_number);
        if (ok) {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1200);
        }
    };

    return (
        <div className="flex flex-wrap gap-2">
            <button onClick={() => openPhoneDialer(payment.tenant_phone_number)} className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs font-black text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white">
                Call Tenant
            </button>
            <button onClick={() => openWhatsAppChat(payment.tenant_phone_number, `Hi ${payment.tenant_name || 'there'}, this is from Nilayam regarding your ${payment.payment_type?.replace(/_/g, ' ') || 'payment'} for ${payment.building_name || 'your property'}${payment.house_number ? `, Unit ${payment.house_number}` : ''}.`)} className="rounded-xl bg-green-600 px-3 py-2 text-xs font-black text-white hover:bg-green-700">
                WhatsApp
            </button>
            <button onClick={() => void handleCopy()} className="inline-flex items-center gap-1 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs font-black text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy'}
            </button>
        </div>
    );
};

const SummaryCard: React.FC<{ title: string; value: string; subtext: string; icon: React.ReactNode; tone?: string }> = ({ title, value, subtext, icon, tone = 'from-white to-slate-50 dark:from-neutral-900 dark:to-neutral-950' }) => (
    <Card className={`bg-gradient-to-br ${tone}`}>
        <div className="flex items-start justify-between gap-4">
            <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">{title}</p>
                <p className="mt-3 text-3xl font-black tracking-tight text-neutral-900 dark:text-white">{value}</p>
                <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{subtext}</p>
            </div>
            <div className="rounded-2xl border border-white/60 bg-white/70 p-3 text-blue-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-blue-300">
                {React.cloneElement(icon as React.ReactElement<any>, { className: 'h-6 w-6' })}
            </div>
        </div>
    </Card>
);

const EmptyState: React.FC<{ title: string; message: string }> = ({ title, message }) => (
    <div className="rounded-[1.8rem] border border-dashed border-neutral-200 bg-neutral-50 px-6 py-10 text-center dark:border-neutral-800 dark:bg-neutral-900/50">
        <p className="text-lg font-black text-neutral-900 dark:text-white">{title}</p>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{message}</p>
    </div>
);

const PaymentsPage: React.FC = () => {
    const [dashboard, setDashboard] = useState<OwnerPaymentsDashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<'all' | Payment['status']>('all');
    const [paymentMode, setPaymentMode] = useState<'all' | NonNullable<Payment['payment_mode']>>('all');
    const [propertyId, setPropertyId] = useState('');
    const [search, setSearch] = useState('');
    const [busyPaymentId, setBusyPaymentId] = useState<string | null>(null);
    const shellPlatform = React.useMemo(() => getShellPlatform(), []);
    const isAppShell = shellPlatform === 'app';

    const loadDashboard = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getOwnerPaymentsDashboard({
                status,
                paymentMode,
                propertyId: propertyId || undefined,
                search
            });
            setDashboard(data);
        } catch (err: any) {
            setError(err.message || 'Unable to load payment management data.');
        } finally {
            setLoading(false);
        }
    }, [paymentMode, propertyId, search, status]);

    useEffect(() => {
        void loadDashboard();
    }, [loadDashboard]);

    const handleDecision = async (paymentId: string, action: 'approve' | 'reject') => {
        setBusyPaymentId(paymentId);
        setError(null);
        try {
            if (action === 'approve') {
                await approveTenantPayment(paymentId);
            } else {
                await rejectTenantPayment(paymentId);
            }
            await loadDashboard();
        } catch (err: any) {
            setError(err.message || 'Unable to update payment status.');
        } finally {
            setBusyPaymentId(null);
        }
    };

    const pendingApprovals = useMemo(() => dashboard?.pendingApprovals || [], [dashboard]);
    const recentPayments = useMemo(() => dashboard?.recentPayments || [], [dashboard]);

    if (loading && !dashboard) {
        return <div className="flex min-h-[50vh] items-center justify-center"><Spinner /></div>;
    }

    return (
        <div className={`animate-fade-in ${isAppShell ? 'space-y-6 pb-20 md:pb-0' : 'space-y-8 pb-6'}`}>
            <section className={`overflow-hidden rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_45%,#f0fdf4_100%)] dark:border-slate-800 dark:bg-[linear-gradient(135deg,rgba(30,41,59,0.96),rgba(15,23,42,1))] ${isAppShell ? 'p-5' : 'p-6 xl:p-8'}`}>
            <div className={`flex gap-4 ${isAppShell ? 'flex-col' : 'flex-col lg:flex-row lg:items-end lg:justify-between'}`}>
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-600 dark:text-blue-300">Collections command</p>
                    <h2 className="text-3xl font-black tracking-tight text-neutral-900 dark:text-white">Payments</h2>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                        Review rent collections, verify manual proofs, and keep owner cash flow visible in one place.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => void loadDashboard()}
                    className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-black text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                >
                    Refresh
                </button>
            </div>
            </section>

            {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
                    {error}
                </div>
            )}

            {dashboard && (
                <>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <SummaryCard title="Total Collected" value={currency(dashboard.summary.totalCollected)} subtext={`This month ${currency(dashboard.summary.collectionsThisMonth)}`} icon={<DollarSignIcon />} tone="from-emerald-50 to-white dark:from-emerald-950/20 dark:to-neutral-950" />
                        <SummaryCard title="Pending Verification" value={currency(dashboard.summary.pendingVerificationAmount)} subtext={`${dashboard.summary.pendingVerificationCount} payment${dashboard.summary.pendingVerificationCount === 1 ? '' : 's'} waiting`} icon={<ShieldCheckIcon />} tone="from-blue-50 to-white dark:from-blue-950/20 dark:to-neutral-950" />
                        <SummaryCard title="Overdue Exposure" value={currency(dashboard.summary.overdueAmount)} subtext={`${dashboard.summary.overdueCount} unpaid or rejected item${dashboard.summary.overdueCount === 1 ? '' : 's'}`} icon={<CreditCardIcon />} tone="from-amber-50 to-white dark:from-amber-950/20 dark:to-neutral-950" />
                        <SummaryCard title="Collection Mix" value={`${dashboard.summary.onlinePaymentCount} online`} subtext={`${dashboard.summary.manualProofCount} manual proof${dashboard.summary.manualProofCount === 1 ? '' : 's'} awaiting`} icon={<BankIcon />} tone="from-violet-50 to-white dark:from-violet-950/20 dark:to-neutral-950" />
                    </div>

                    <Card className={isAppShell ? '' : 'rounded-[1.8rem]'}>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                            <div className="relative md:col-span-2">
                                <SearchIcon className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-neutral-400" />
                                <input
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Search tenant, property, unit, or payment type"
                                    className="w-full rounded-xl border border-neutral-200 bg-white py-3 pl-11 pr-4 text-sm text-neutral-900 outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                                />
                            </div>
                            <select value={status} onChange={(event) => setStatus(event.target.value as 'all' | Payment['status'])} className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white">
                                <option value="all">All statuses</option>
                                <option value="paid">Paid</option>
                                <option value="pending">Pending</option>
                                <option value="due">Due</option>
                                <option value="failed">Failed</option>
                            </select>
                            <div className="grid grid-cols-2 gap-3">
                                <select value={paymentMode} onChange={(event) => setPaymentMode(event.target.value as 'all' | NonNullable<Payment['payment_mode']>)} className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white">
                                    <option value="all">All modes</option>
                                    <option value="manual">Manual</option>
                                    <option value="razorpay">Online</option>
                                </select>
                                <select value={propertyId} onChange={(event) => setPropertyId(event.target.value)} className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white">
                                    <option value="">All properties</option>
                                    {dashboard.propertyOptions.map((property) => (
                                        <option key={property.id} value={property.id}>{property.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </Card>

                    <div className={`grid grid-cols-1 gap-6 ${isAppShell ? '' : '2xl:grid-cols-[1.18fr_0.82fr]'} xl:grid-cols-[1.1fr_0.9fr]`}>
                        <Card>
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-xl font-black text-neutral-900 dark:text-white">Manual Proof Verification</h3>
                                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Approve bank and UPI transfers after you confirm the credit in your account.</p>
                                </div>
                                <div className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                    {pendingApprovals.length} open
                                </div>
                            </div>
                            <div className="mt-5 space-y-4">
                                {pendingApprovals.length === 0 ? (
                                    <EmptyState title="No pending manual proofs" message="Manual uploads waiting for owner approval will appear here." />
                                ) : pendingApprovals.map((payment) => (
                                    <div key={payment.id} className="rounded-[1.6rem] border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/60">
                                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="text-sm font-black text-neutral-900 dark:text-white">{payment.tenant_name || 'Tenant'} • {payment.building_name || 'Property'} • Unit {payment.house_number || 'N/A'}</p>
                                                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${statusClasses[payment.status]}`}>{payment.status}</span>
                                                </div>
                                                {payment.tenant_phone_number && (
                                                    <p className="mt-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400">{payment.tenant_phone_number}</p>
                                                )}
                                                <p className="mt-2 text-2xl font-black tracking-tight text-neutral-900 dark:text-white">{currency(payment.amount)}</p>
                                                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                                                    Due {new Date(payment.due_date).toLocaleDateString()} • {payment.payment_type?.replace(/_/g, ' ') || 'payment'} • {modeLabel(payment)}
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <TenantContactActions payment={payment} />
                                                {payment.proof_url && (
                                                    <a href={payment.proof_url} target="_blank" rel="noreferrer" className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-bold text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white">
                                                        View Proof
                                                    </a>
                                                )}
                                                <button onClick={() => void handleDecision(payment.id, 'approve')} disabled={busyPaymentId === payment.id} className="rounded-xl bg-green-600 px-4 py-2 text-sm font-black text-white hover:bg-green-700 disabled:opacity-60">
                                                    {busyPaymentId === payment.id ? 'Saving...' : 'Approve'}
                                                </button>
                                                <button onClick={() => void handleDecision(payment.id, 'reject')} disabled={busyPaymentId === payment.id} className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-black text-amber-800 dark:border-amber-800 dark:bg-neutral-950 dark:text-amber-300 disabled:opacity-60">
                                                    Reject
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        <Card>
                            <div className="flex items-center gap-2">
                                <QrCodeIcon className="h-5 w-5 text-indigo-600" />
                                <h3 className="text-xl font-black text-neutral-900 dark:text-white">Recent Payment Activity</h3>
                            </div>
                            <div className="mt-5 space-y-3">
                                {recentPayments.length === 0 ? (
                                    <EmptyState title="No payment activity yet" message="As tenants start paying rent, the latest activity will show up here." />
                                ) : recentPayments.map((payment) => (
                                    <div key={payment.id} className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900/60">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-bold text-neutral-900 dark:text-white">{payment.tenant_name || 'Tenant'} • {payment.building_name || 'Property'}</p>
                                            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                                                Unit {payment.house_number || 'N/A'} • {modeLabel(payment)} • {new Date(payment.created_at || payment.due_date).toLocaleDateString()}
                                            </p>
                                            {payment.tenant_phone_number && (
                                                <div className="mt-2">
                                                    <TenantContactActions payment={payment} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-neutral-900 dark:text-white">{currency(payment.amount)}</p>
                                            <span className={`mt-1 inline-flex rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${statusClasses[payment.status]}`}>{payment.status}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                    <Card className={isAppShell ? '' : 'rounded-[1.8rem]'}>
                        <div className="flex items-center gap-2">
                            <CheckCircleIcon className="h-5 w-5 text-emerald-600" />
                            <h3 className="text-xl font-black text-neutral-900 dark:text-white">All Matching Payments</h3>
                        </div>
                        <div className="mt-5 overflow-x-auto">
                            {dashboard.payments.length === 0 ? (
                                <EmptyState title="No matching payments" message="Try widening the filters or clear the search to see more records." />
                            ) : (
                                <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
                                    <thead className="bg-neutral-50 dark:bg-neutral-800/60">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">Tenant</th>
                                            <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">Property</th>
                                            <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">Type</th>
                                            <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">Due</th>
                                            <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">Amount</th>
                                            <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">Mode</th>
                                            <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                                        {dashboard.payments.map((payment) => (
                                            <tr key={payment.id}>
                                                <td className="px-4 py-3 text-sm font-semibold text-neutral-900 dark:text-white">
                                                    <div>{payment.tenant_name || 'Tenant'}</div>
                                                    {payment.tenant_phone_number && <div className="mt-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">{payment.tenant_phone_number}</div>}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-300">{payment.building_name || 'Property'} • {payment.house_number || 'N/A'}</td>
                                                <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-300">{payment.payment_type?.replace(/_/g, ' ') || 'payment'}</td>
                                                <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-300">{new Date(payment.due_date).toLocaleDateString()}</td>
                                                <td className="px-4 py-3 text-right text-sm font-black text-neutral-900 dark:text-white">{currency(payment.amount)}</td>
                                                <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-300">{modeLabel(payment)}</td>
                                                <td className="px-4 py-3 text-sm">
                                                    <div className="flex flex-col items-start gap-2">
                                                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${statusClasses[payment.status]}`}>{payment.status}</span>
                                                        <TenantContactActions payment={payment} />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
};

export default PaymentsPage;
