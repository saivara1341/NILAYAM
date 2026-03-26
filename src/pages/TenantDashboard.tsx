
import React, { useState, useEffect, useRef } from 'react';
import Card from '@/components/ui/Card';
import { acknowledgeTenantAgreement, canUseRazorpayForOwner, markPaymentAsPaid, submitManualPaymentProof, verifyAndUploadTenantDocument } from '@/services/api';
import { TenantDashboardData, MaintenanceRequest, Announcement, TenantDocument } from '@/types';
import Spinner from '@/components/ui/Spinner';
import { useAuth } from '@/contexts/AuthContext';
import { HomeIcon, CreditCardIcon, WrenchIcon, BellIcon, CameraIcon, ShieldCheckIcon, CloudUploadIcon, CheckCircleIcon, ShieldLockIcon, LeaseIcon, BankIcon, QrCodeIcon } from '@/constants';
import { RazorpayButton } from '@/components/payments/RazorpayButton';
import { EmptyInboxIllustration, EmptyLedgerIllustration, QuietMaintenanceIllustration, WaitingHomeIllustration } from '@/components/ui/StateIllustrations';
import { Link } from 'react-router-dom';
import { Copy, Check } from 'lucide-react';
import { copyText, openExternalIntent, openPhoneDialer, openWhatsAppChat } from '@/utils/sharing';

const InfoCard: React.FC<{ title: string; value: string | number; subtext?: string; icon: React.ReactNode; children?: React.ReactNode; delay: string }> = ({ title, value, subtext, icon, children, delay }) => (
    <Card className="animate-fade-in-up opacity-0" style={{ animationDelay: delay }}>
        <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center space-x-3 sm:space-x-4">
                <div className="rounded-2xl border border-blue-200/50 bg-blue-100 p-3 text-blue-600 shadow-sm dark:border-blue-800/50 dark:bg-blue-900/40 dark:text-blue-400 sm:p-4">
                    {React.cloneElement(icon as React.ReactElement<any>, { className: "w-6 h-6" })}
                </div>
                <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">{title}</p>
                    <p className="mt-1 truncate text-xl font-black tracking-tight text-neutral-900 dark:text-white sm:text-2xl">{value}</p>
                    {subtext && <p className="mt-1 text-xs font-medium leading-5 text-neutral-400 dark:text-neutral-500">{subtext}</p>}
                </div>
            </div>
            {children}
        </div>
    </Card>
);

const AnnouncementCard: React.FC<{ announcement: Pick<Announcement, 'id' | 'created_at' | 'title' | 'message'> }> = ({ announcement }) => (
    <div className="p-5 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-700/50 hover:border-blue-300 transition-all duration-300 group">
        <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 group-hover:animate-ping"></div>
                <h4 className="font-bold text-neutral-800 dark:text-neutral-200">{announcement.title}</h4>
            </div>
            <p className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">{new Date(announcement.created_at).toLocaleDateString()}</p>
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">{announcement.message}</p>
    </div>
);

const MaintenanceRequestCard: React.FC<{ request: Pick<MaintenanceRequest, 'id' | 'description' | 'status' | 'created_at'> }> = ({ request }) => (
    <div className="flex justify-between items-center p-4 bg-white dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-700 rounded-2xl shadow-sm hover:shadow-md transition-all">
        <div className="flex items-center gap-4">
            <div className="p-2.5 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 rounded-xl">
                <WrenchIcon className="w-5 h-5" />
            </div>
            <div>
                <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200">{request.description}</p>
                <p className="text-xs font-medium text-neutral-400 dark:text-neutral-500">Opened: {new Date(request.created_at).toLocaleDateString()}</p>
            </div>
        </div>
        <span className="px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700">
            {request.status.replace('_', ' ')}
        </span>
    </div>
);

const ChargeLedgerPreview: React.FC<{ entries: TenantDashboardData['chargeLedger'] }> = ({ entries }) => (
    <div className="space-y-3">
        {entries.slice(0, 4).map((entry) => (
            <div key={entry.id} className="flex items-center justify-between rounded-2xl border border-neutral-100 dark:border-neutral-700 bg-white dark:bg-neutral-800/50 px-4 py-3">
                <div>
                    <p className="text-sm font-bold text-neutral-900 dark:text-white">{entry.label}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{entry.billing_month} • Due {new Date(entry.due_date).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                    <p className="text-sm font-bold text-neutral-900 dark:text-white">₹{entry.amount.toLocaleString('en-IN')}</p>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${entry.status === 'paid' ? 'text-green-600 dark:text-green-400' : entry.status === 'overdue' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>{entry.status}</p>
                </div>
            </div>
        ))}
        {entries.length === 0 && (
            <div className="py-2 text-center">
                <EmptyLedgerIllustration />
                <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">No rent or utility charges have been posted yet.</p>
            </div>
        )}
    </div>
);

const ReminderPreview: React.FC<{ reminders: TenantDashboardData['reminders']; agreement: TenantDashboardData['agreement'] }> = ({ reminders, agreement }) => (
    <div className="space-y-3">
        {agreement && (
            <div className="rounded-2xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/70 dark:bg-blue-900/10 px-4 py-4">
                <p className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Agreement</p>
                <p className="mt-1 text-sm font-bold text-neutral-900 dark:text-white">{agreement.agreement_type.replace(/_/g, ' ')}</p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Status: {agreement.status.replace(/_/g, ' ')}</p>
                {agreement.agreement_end_date && (
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Ends on: {new Date(agreement.agreement_end_date).toLocaleDateString()}</p>
                )}
                <p className="mt-2 text-xs font-semibold text-blue-700 dark:text-blue-300">Your agreement is available in the app itself.</p>
            </div>
        )}
        {reminders.slice(0, 3).map((reminder) => (
            <div key={reminder.id} className="rounded-2xl border border-neutral-100 dark:border-neutral-700 bg-white dark:bg-neutral-800/50 px-4 py-4">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-neutral-900 dark:text-white">{reminder.title}</p>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${reminder.status === 'sent' ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`}>{reminder.status}</span>
                </div>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{reminder.message}</p>
            </div>
        ))}
        {reminders.length === 0 && <p className="text-sm text-neutral-500 dark:text-neutral-400">No reminders scheduled by your owner right now.</p>}
    </div>
);

const scoreBandStyles: Record<NonNullable<TenantDashboardData['scorecard']>['band'], string> = {
    excellent: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    good: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    watchlist: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    high_risk: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
};

const factorToneStyles: Record<'positive' | 'neutral' | 'negative', string> = {
    positive: 'text-green-600 dark:text-green-400',
    neutral: 'text-blue-600 dark:text-blue-400',
    negative: 'text-red-600 dark:text-red-400'
};

const TenantScorecardPreview: React.FC<{ scorecard?: TenantDashboardData['scorecard'] }> = ({ scorecard }) => {
    if (!scorecard) return null;

    return (
        <div className="space-y-4">
            <div className="flex items-start justify-between gap-4 rounded-2xl border border-neutral-100 dark:border-neutral-700 bg-white dark:bg-neutral-800/50 px-4 py-4">
                <div>
                    <p className="text-xs font-black uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Tenant score</p>
                    <p className="mt-2 text-4xl font-black tracking-tight text-neutral-900 dark:text-white">{scorecard.score}</p>
                    <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{scorecard.explanation}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${scoreBandStyles[scorecard.band]}`}>
                    {scorecard.band.replace('_', ' ')}
                </span>
            </div>
            <div className="space-y-3">
                {scorecard.factors.map((factor) => (
                    <div key={factor.label} className="rounded-2xl border border-neutral-100 dark:border-neutral-700 bg-white dark:bg-neutral-800/50 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-bold text-neutral-900 dark:text-white">{factor.label}</p>
                            <span className={`text-xs font-black uppercase tracking-widest ${factorToneStyles[factor.status]}`}>
                                {factor.impact > 0 ? '+' : ''}{factor.impact}
                            </span>
                        </div>
                        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{factor.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

const TenantActivityLogPreview: React.FC<{ entries?: TenantDashboardData['activityLog'] }> = ({ entries }) => {
    if (!entries?.length) {
        return <p className="text-sm text-neutral-500 dark:text-neutral-400">Payments, reminders, agreement actions, and maintenance events will appear here.</p>;
    }

    return (
        <div className="space-y-3">
            {entries.slice(0, 6).map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-neutral-100 dark:border-neutral-700 bg-white dark:bg-neutral-800/50 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-bold text-neutral-900 dark:text-white">{entry.title}</p>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                            entry.tone === 'success'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                : entry.tone === 'warning'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        }`}>
                            {entry.category}
                        </span>
                    </div>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{entry.description}</p>
                    <p className="mt-2 text-xs font-semibold text-neutral-400 dark:text-neutral-500">{new Date(entry.occurred_at).toLocaleString()}</p>
                </div>
            ))}
        </div>
    );
};

const buildUpiLink = (params: { upiId: string; payeeName?: string; amount: number; note: string }) => {
    const search = new URLSearchParams({
        pa: params.upiId,
        pn: params.payeeName || 'Property Owner',
        am: params.amount.toFixed(2),
        cu: 'INR',
        tn: params.note
    });
    return `upi://pay?${search.toString()}`;
};

const openUpiIntent = (app: 'gpay' | 'phonepe' | 'bhim' | 'paytm' | 'generic', link: string) => {
    if (typeof window === 'undefined') return;

    const query = link.split('?')[1] || '';
    const appLinks = {
        generic: link,
        gpay: `tez://upi/pay?${query}`,
        phonepe: `phonepe://pay?${query}`,
        bhim: `bhim://upi/pay?${query}`,
        paytm: `paytmmp://pay?${query}`
    };

    openExternalIntent(appLinks[app], link);
};

const ManualPaymentCard: React.FC<{
    data: TenantDashboardData;
    tenantId: string;
    onSubmitted: () => Promise<void>;
}> = ({ data, tenantId, onSubmitted }) => {
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const paymentMethods = data.landlordPaymentDetails;

    if (!data.nextPayment) return null;

    const upiLink = paymentMethods?.upiId
        ? buildUpiLink({
            upiId: paymentMethods.upiId,
            payeeName: paymentMethods.payeeName,
            amount: data.nextPayment.amount,
            note: `Rent for ${data.tenancyDetails.building_name} Unit ${data.tenancyDetails.house_number}`
        })
        : null;

    const copyValue = async (key: string, value?: string | null) => {
        const ok = await copyText(value);
        if (!ok) return;
        setCopiedField(key);
        window.setTimeout(() => setCopiedField(null), 1400);
    };

    const handleSubmit = async () => {
        if (!proofFile) {
            alert('Please upload payment proof after completing the transfer.');
            return;
        }

        setSubmitting(true);
        try {
            await submitManualPaymentProof({
                paymentId: data.nextPayment.id.startsWith('rent_due_') ? undefined : data.nextPayment.id,
                tenantId,
                houseId: data.tenancyDetails.house_id,
                amount: data.nextPayment.amount,
                paymentType: 'rent',
                proofFile
            });
            setProofFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            await onSubmitted();
            alert('Payment proof submitted. Your owner can verify it and mark it as received.');
        } catch (error) {
            console.error(error);
            alert('Unable to submit payment proof right now.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Card className="animate-fade-in-up opacity-0" style={{ animationDelay: '340ms' } as any}>
            <div className="flex items-center gap-2">
                <QrCodeIcon className="w-5 h-5 text-emerald-600" />
                <h3 className="text-xl font-bold text-neutral-900 dark:text-white">Manual Payment Options</h3>
            </div>
            <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                Complete the transfer using the owner details below, then upload your screenshot or receipt so the owner can verify the credit in their account.
            </p>
            <div className="mt-5 rounded-[1.6rem] border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-900/40 dark:bg-emerald-900/10">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">Next transfer</p>
                        <p className="mt-2 text-3xl font-black text-emerald-950 dark:text-emerald-100">₹{data.nextPayment.amount.toLocaleString('en-IN')}</p>
                    </div>
                    <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                        Due {new Date(data.nextPayment.due_date).toLocaleDateString()}
                    </p>
                </div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
                {paymentMethods?.upiId && (
                    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-black uppercase tracking-widest text-neutral-500 dark:text-neutral-400">UPI ID</p>
                            <button type="button" onClick={() => void copyValue('upi', paymentMethods.upiId)} className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-xs font-bold text-neutral-700 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200">
                                {copiedField === 'upi' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                {copiedField === 'upi' ? 'Copied' : 'Copy'}
                            </button>
                        </div>
                        <p className="mt-2 text-sm font-bold text-neutral-900 dark:text-white break-all">{paymentMethods.upiId}</p>
                        {upiLink && (
                            <div className="mt-4 grid grid-cols-2 gap-2">
                                <button type="button" onClick={() => openUpiIntent('gpay', upiLink)} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-700">Google Pay</button>
                                <button type="button" onClick={() => openUpiIntent('phonepe', upiLink)} className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-black text-white hover:bg-violet-700">PhonePe</button>
                                <button type="button" onClick={() => openUpiIntent('bhim', upiLink)} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700">BHIM</button>
                                <button type="button" onClick={() => openUpiIntent('paytm', upiLink)} className="rounded-xl bg-sky-600 px-3 py-2 text-xs font-black text-white hover:bg-sky-700">Paytm</button>
                                <a href={upiLink} className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-center text-xs font-black text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white md:col-span-2">Direct UPI Intent</a>
                            </div>
                        )}
                    </div>
                )}
                {paymentMethods?.mobileNumber && (
                    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-black uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Owner Mobile</p>
                            <button type="button" onClick={() => void copyValue('mobile', paymentMethods.mobileNumber)} className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-xs font-bold text-neutral-700 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200">
                                {copiedField === 'mobile' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                {copiedField === 'mobile' ? 'Copied' : 'Copy'}
                            </button>
                        </div>
                        <p className="mt-2 text-sm font-bold text-neutral-900 dark:text-white">{paymentMethods.mobileNumber}</p>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            <button type="button" onClick={() => openPhoneDialer(paymentMethods.mobileNumber)} className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs font-black text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white">
                                Call Owner
                            </button>
                            <button type="button" onClick={() => openWhatsAppChat(paymentMethods.mobileNumber, `Hi ${paymentMethods.payeeName || data.landlordContact?.name || 'Owner'}, I am contacting you from Nilayam regarding rent payment for ${data.tenancyDetails.building_name}, Unit ${data.tenancyDetails.house_number}.`)} className="rounded-xl bg-green-600 px-3 py-2 text-xs font-black text-white hover:bg-green-700">
                                WhatsApp Owner
                            </button>
                        </div>
                        {upiLink && (
                            <button type="button" onClick={() => openUpiIntent('generic', upiLink)} className="mt-4 rounded-xl border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                                Pay ₹{data.nextPayment.amount.toLocaleString('en-IN')} using any UPI app
                            </button>
                        )}
                    </div>
                )}
                {paymentMethods?.bankDetails?.accountNumber && (
                    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50 p-4 md:col-span-2">
                        <div className="flex items-center gap-2">
                            <BankIcon className="w-4 h-4 text-blue-600" />
                            <p className="text-xs font-black uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Bank Transfer</p>
                        </div>
                        <div className="mt-3 grid gap-2 md:grid-cols-2 text-sm">
                            <p className="text-neutral-700 dark:text-neutral-300"><span className="font-semibold">Account Holder:</span> {paymentMethods.bankDetails.accountHolder || paymentMethods.payeeName || 'Not set'}</p>
                            <p className="text-neutral-700 dark:text-neutral-300"><span className="font-semibold">Bank:</span> {paymentMethods.bankDetails.bankName || 'Not set'}</p>
                            <p className="text-neutral-700 dark:text-neutral-300"><span className="font-semibold">Account No:</span> {paymentMethods.bankDetails.accountNumber}</p>
                            <p className="text-neutral-700 dark:text-neutral-300"><span className="font-semibold">IFSC:</span> {paymentMethods.bankDetails.ifsc || 'Not set'}</p>
                        </div>
                    </div>
                )}
                {paymentMethods?.settlementPreference && (
                    <div className="rounded-2xl border border-sky-200 dark:border-sky-900/40 bg-sky-50 dark:bg-sky-900/10 p-4 md:col-span-2">
                        <p className="text-xs font-black uppercase tracking-widest text-sky-700 dark:text-sky-300">Settlement Flow</p>
                        <p className="mt-2 text-sm text-sky-900 dark:text-sky-100">
                            {paymentMethods.settlementPreference === 'direct_owner'
                                ? 'This tenancy is intended for direct owner settlement. Manual UPI and bank transfers already go straight to the owner details shown here.'
                                : 'This tenancy is configured for platform-side settlement review.'}
                        </p>
                        {paymentMethods.razorpayRouteEnabled && paymentMethods.razorpayLinkedAccountId && (
                            <p className="mt-2 text-xs font-semibold text-sky-700 dark:text-sky-300">
                                Linked account reference: {paymentMethods.razorpayLinkedAccountId}
                            </p>
                        )}
                        {paymentMethods.settlementNotes && (
                            <p className="mt-2 text-sm text-sky-800 dark:text-sky-200">{paymentMethods.settlementNotes}</p>
                        )}
                    </div>
                )}
                {paymentMethods?.qrCodeUrl && (
                    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900/50 p-4">
                        <p className="text-xs font-black uppercase tracking-widest text-neutral-500 dark:text-neutral-400">QR Code</p>
                        <img src={paymentMethods.qrCodeUrl} alt="Owner payment QR" className="mt-3 h-40 w-40 rounded-2xl border border-neutral-200 bg-white object-cover p-2" />
                    </div>
                )}
                {paymentMethods?.paymentInstructions && (
                    <div className="rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/10 p-4">
                        <p className="text-xs font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">Owner Instructions</p>
                        <p className="mt-2 text-sm text-amber-900 dark:text-amber-100 whitespace-pre-wrap">{paymentMethods.paymentInstructions}</p>
                    </div>
                )}
            </div>
            <div className="mt-5 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <input type="file" ref={fileInputRef} onChange={(event) => setProofFile(event.target.files?.[0] || null)} className="hidden" accept="image/*,application/pdf" />
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-3 text-sm font-bold text-neutral-900 dark:text-white">
                        {proofFile ? 'Change Payment Proof' : 'Upload Payment Proof'}
                    </button>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">{proofFile ? proofFile.name : 'Screenshot, UPI receipt, or bank transfer slip'}</p>
                    <button type="button" onClick={handleSubmit} disabled={submitting || !proofFile} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50 md:ml-auto">
                        {submitting ? 'Submitting...' : 'Submit for Verification'}
                    </button>
                </div>
            </div>
        </Card>
    );
};


const VerificationCard: React.FC<{ delay: string }> = ({ delay }) => {
    const [documents, setDocuments] = useState<TenantDocument[]>([]);
    const [uploading, setUploading] = useState(false);
    const [docType, setDocType] = useState<TenantDocument['type']>('ID Proof');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const result = await verifyAndUploadTenantDocument(file, docType);
            setDocuments(prev => [...prev, result]);
        } catch (error) {
            alert("Failed to upload/verify document.");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <Card className="animate-fade-in-up opacity-0" style={{ animationDelay: delay }}>
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2 mb-6">
                <ShieldCheckIcon className="w-6 h-6 text-green-600" /> Identity Safe
            </h3>
            <div className="space-y-4">
                <div className="bg-neutral-50 dark:bg-neutral-800/50 p-5 rounded-2xl border border-neutral-100 dark:border-neutral-700">
                    <div className="flex flex-col sm:flex-row gap-3 mb-3">
                        <select
                            value={docType}
                            onChange={(e) => setDocType(e.target.value as any)}
                            className="text-sm font-bold border-neutral-300 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-800 px-4 py-2.5 focus:ring-2 focus:ring-blue-500 transition-all"
                        >
                            <option>ID Proof</option>
                            <option>Address Proof</option>
                            <option>Income Proof</option>
                        </select>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,application/pdf" />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="flex-1 bg-blue-600 text-white text-sm font-black py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 transition-all active:scale-95"
                        >
                            {uploading ? <Spinner /> : <><CloudUploadIcon className="w-4 h-4" /> UPLOAD & VERIFY</>}
                        </button>
                    </div>
                    <p className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
                        AI-Powered instant verification
                    </p>
                </div>

                <div className="space-y-3">
                    {documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-4 bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl shadow-sm animate-fade-in">
                            <div className="flex items-center gap-4">
                                <div className={`p-2.5 rounded-xl ${doc.status === 'verified' ? 'bg-green-50 text-green-600 dark:bg-green-900/20' : 'bg-red-50 text-red-600'}`}>
                                    {doc.status === 'verified' ? <CheckCircleIcon className="w-5 h-5" /> : <ShieldLockIcon className="w-5 h-5" />}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200">{doc.type}</p>
                                    <p className="text-xs font-medium text-neutral-400">{doc.verification_notes || 'Successfully verified'}</p>
                                </div>
                            </div>
                            <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg ${doc.status === 'verified' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-700'
                                }`}>
                                {doc.status}
                            </span>
                        </div>
                    ))}
                    {documents.length === 0 && (
                        <p className="text-center text-xs font-bold text-neutral-400 py-4 uppercase tracking-[0.2em]">No verified docs</p>
                    )}
                </div>
            </div>
        </Card>
    );
};

import { useData } from '@/contexts/DataContext';

const TenantDashboard: React.FC = () => {
    const { profile } = useAuth();
    const { 
        tenantDashboardData: data, 
        loadingDashboard: loading, 
        refreshTenantDashboard: refreshData,
        dashboardError
    } = useData();
    const [isAcknowledgingAgreement, setIsAcknowledgingAgreement] = useState(false);
    const supportsRazorpay = canUseRazorpayForOwner(data?.landlordPaymentDetails);

    const handleConfirmPayment = async () => {
        if (!data?.nextPayment) return;
        try {
            await markPaymentAsPaid(data.nextPayment.id);
            await refreshData(true); // Forced refresh to show updated payment status
        } catch (err: any) {
            console.error(err);
        }
    };

    if (loading && !data) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    if (dashboardError && !data) return <div className="text-red-500 bg-red-50 p-6 rounded-3xl border border-red-100 m-4">{dashboardError}</div>;

    if (!data) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center p-4">
                <WaitingHomeIllustration />
                <h2 className="text-2xl font-bold text-neutral-800 dark:text-neutral-200">Your Dashboard is Waiting</h2>
                <p className="max-w-md mt-2 text-neutral-500 dark:text-neutral-400">
                    You have not been assigned to a property yet. Once a property owner adds you as a tenant, your dashboard with payment details, announcements, and more will appear here.
                </p>
                <div className="mt-6 grid w-full max-w-2xl gap-3 md:grid-cols-2">
                    <Link to="/marketplace" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-900/10 dark:text-emerald-200">
                        Explore marketplace to find homes, land, and properties
                    </Link>
                    <Link to="/services" className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm font-bold text-blue-800 transition hover:bg-blue-100 dark:border-blue-900/40 dark:bg-blue-900/10 dark:text-blue-200">
                        Are you a professional? List your services and get clients
                    </Link>
                </div>
            </div>
        );
    }

    const hasDuePayment = Boolean(data.nextPayment);
    const hasOpenMaintenance = data.openMaintenanceRequests.length > 0;
    const agreementPendingAck = Boolean(data.agreement && !data.lifecycle?.agreement_acknowledged_at);
    const firstName = profile?.full_name?.split(' ')[0] || 'Resident';
    const ownerContactNumber = data.landlordContact?.phone_number || data.landlordPaymentDetails?.mobileNumber;
    const ownerName = data.landlordContact?.name || data.landlordPaymentDetails?.payeeName || 'Property Owner';

    return (
            <div className="space-y-6 animate-fade-in md:space-y-7 xl:space-y-8">
            <div className="overflow-hidden rounded-[2rem] border border-neutral-200/80 bg-[linear-gradient(135deg,#eff6ff,#ffffff_52%,#ecfeff)] p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)] dark:border-neutral-800 dark:bg-[linear-gradient(135deg,rgba(30,41,59,0.95),rgba(15,23,42,0.98))] md:p-7">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between animate-fade-in-up">
                    <div className="max-w-2xl">
                        <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-600 dark:text-blue-300">Tenant dashboard</p>
                        <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight text-neutral-900 dark:text-white md:text-5xl">
                            Namaste, {firstName}!
                        </h2>
                        <p className="mt-2 text-sm font-medium leading-6 text-neutral-600 dark:text-neutral-300 md:text-lg">
                            Rent, updates, proof uploads, documents, and house details are arranged around what you need to do first.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:min-w-[260px]">
                        <div className="rounded-[1.4rem] border border-white/70 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">Next due</p>
                            <p className="mt-2 text-lg font-black text-neutral-900 dark:text-white">{data.nextPayment ? `₹${data.nextPayment.amount.toLocaleString('en-IN')}` : 'All clear'}</p>
                        </div>
                        <div className="rounded-[1.4rem] border border-white/70 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">Residence</p>
                            <p className="mt-2 text-lg font-black text-neutral-900 dark:text-white">{data.tenancyDetails.house_number}</p>
                        </div>
                    </div>
                </div>
                {loading && (
                    <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/10 dark:text-blue-300">
                        <Spinner />
                        Refreshing latest details
                    </div>
                )}
            </div>

            {(hasDuePayment || hasOpenMaintenance || agreementPendingAck) && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {hasDuePayment && (
                        <Card className="border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/10">
                            <p className="text-xs font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">Payment Alert</p>
                            <p className="mt-2 text-sm font-semibold text-neutral-900 dark:text-white">Rent of ₹{data.nextPayment?.amount.toLocaleString('en-IN')} is due on {data.nextPayment ? new Date(data.nextPayment.due_date).toLocaleDateString() : ''}.</p>
                        </Card>
                    )}
                    {hasOpenMaintenance && (
                        <Card className="border border-orange-200 bg-orange-50 dark:border-orange-900/40 dark:bg-orange-900/10">
                            <p className="text-xs font-black uppercase tracking-widest text-orange-700 dark:text-orange-300">Maintenance Alert</p>
                            <p className="mt-2 text-sm font-semibold text-neutral-900 dark:text-white">{data.openMaintenanceRequests.length} active maintenance request{data.openMaintenanceRequests.length === 1 ? '' : 's'} need follow-up.</p>
                        </Card>
                    )}
                    {agreementPendingAck && (
                        <Card className="border border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-900/10">
                            <p className="text-xs font-black uppercase tracking-widest text-blue-700 dark:text-blue-300">Agreement Action</p>
                            <p className="mt-2 text-sm font-semibold text-neutral-900 dark:text-white">Your owner has prepared the agreement workflow. Confirm once you are okay with it.</p>
                            <button
                                type="button"
                                onClick={async () => {
                                    setIsAcknowledgingAgreement(true);
                                    try {
                                        await acknowledgeTenantAgreement(data.tenancyDetails.house_id, 'Tenant confirmed agreement from dashboard.');
                                        await refreshData(true);
                                    } finally {
                                        setIsAcknowledgingAgreement(false);
                                    }
                                }}
                                disabled={isAcknowledgingAgreement}
                                className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-60"
                            >
                                {isAcknowledgingAgreement ? 'Saving...' : 'Acknowledge Agreement'}
                            </button>
                        </Card>
                    )}
                </div>
            )}

            {/* BhimPaymentGateway removed */}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5">
                <InfoCard
                    title="My Residence"
                    value={data.tenancyDetails.building_name}
                    subtext={`Unit No. ${data.tenancyDetails.house_number}`}
                    icon={<HomeIcon />}
                    delay="100ms"
                >
                    <div className="flex flex-col items-end gap-2 text-right">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">Owner</p>
                            <p className="mt-1 text-sm font-bold text-neutral-900 dark:text-white">{ownerName}</p>
                            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{ownerContactNumber || 'Contact not available'}</p>
                        </div>
                        {ownerContactNumber && (
                            <div className="flex flex-wrap justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => openPhoneDialer(ownerContactNumber)}
                                    className="rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-[11px] font-black text-neutral-900 dark:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800"
                                >
                                    Call
                                </button>
                                <button
                                    type="button"
                                    onClick={() => openWhatsAppChat(ownerContactNumber, `Hi ${ownerName}, I am reaching out from Nilayam about ${data.tenancyDetails.building_name}, Unit ${data.tenancyDetails.house_number}.`)}
                                    className="rounded-xl bg-green-600 px-3 py-2 text-[11px] font-black text-white hover:bg-green-700"
                                >
                                    WhatsApp
                                </button>
                            </div>
                        )}
                    </div>
                </InfoCard>
                <InfoCard
                    title="Next Payment"
                    value={data.nextPayment ? `₹${data.nextPayment.amount.toLocaleString()}` : 'All Clear!'}
                    subtext={
                        data.nextPayment
                            ? data.nextPayment.status === 'pending' && data.nextPayment.payment_mode === 'manual'
                                ? 'Proof submitted, waiting for owner verification'
                                : data.nextPayment.status === 'failed'
                                    ? 'Previous proof was not approved yet, please retry'
                                    : `Due ${new Date(data.nextPayment.due_date).toLocaleDateString()}`
                            : 'Payment cycle current'
                    }
                    icon={<CreditCardIcon />}
                    delay="200ms"
                >
                    {data.nextPayment && supportsRazorpay && (
                        <RazorpayButton
                            amount={data.nextPayment.amount}
                            paymentType="rent"
                            houseId={data.tenancyDetails.house_id}
                            tenantId={profile?.id || ''}
                            paymentId={data.nextPayment.id}
                            onSuccess={() => refreshData(true)}
                            buttonText="PAY NOW"
                            disabledReason="Razorpay needs a live backend API and frontend key configuration."
                            className="text-[10px] py-2 px-4"
                        />
                    )}
                </InfoCard>
                <InfoCard
                    title="Lease Expiry"
                    value={data.tenancyDetails.lease_end_date ? new Date(data.tenancyDetails.lease_end_date).toLocaleDateString() : 'Active'}
                    subtext={`Base Rent: ₹${data.tenancyDetails.rent_amount.toLocaleString()}/mo`}
                    icon={<LeaseIcon />}
                    delay="300ms"
                />
                <InfoCard
                    title="Advance / Deposit"
                    value={`₹${Number(data.lifecycle?.advance_amount || 0).toLocaleString('en-IN')}`}
                    subtext={data.lifecycle?.advance_received_on ? `Received ${new Date(data.lifecycle.advance_received_on).toLocaleDateString()}` : 'Awaiting owner record'}
                    icon={<ShieldCheckIcon />}
                    delay="320ms"
                />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr] xl:gap-8 2xl:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-6 xl:space-y-8">
                    {data.nextPayment && !supportsRazorpay && (
                        <ManualPaymentCard data={data} tenantId={profile?.id || ''} onSubmitted={() => refreshData(true)} />
                    )}

                    <Card className="animate-fade-in-up opacity-0" style={{ animationDelay: '400ms' } as any}>
                        <h3 className="text-xl font-bold mb-6 text-neutral-900 dark:text-white flex items-center gap-2">
                            <CameraIcon className="w-6 h-6 text-red-600 animate-pulse" /> Live Security
                        </h3>
                        {data.tenancyDetails.cctv_url ? (
                            <div className="aspect-video w-full bg-neutral-900 rounded-3xl overflow-hidden relative shadow-2xl border-4 border-white dark:border-neutral-800">
                                <div className="absolute top-4 left-4 bg-red-600 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg z-10 tracking-[0.2em]">LIVE HUD</div>
                                <iframe src={data.tenancyDetails.cctv_url} title="CCTV" className="w-full h-full border-0" allowFullScreen />
                            </div>
                        ) : (
                            <div className="aspect-video w-full bg-neutral-50 dark:bg-neutral-900 rounded-3xl flex flex-col items-center justify-center text-neutral-400 border-2 border-dashed border-neutral-200 dark:border-neutral-700">
                                <CameraIcon className="w-16 h-16 mb-4 opacity-20" />
                                <p className="font-bold uppercase text-xs tracking-widest">Feed Offline</p>
                            </div>
                        )}
                    </Card>

                    <Card className="animate-fade-in-up opacity-0" style={{ animationDelay: '500ms' } as any}>
                        <h3 className="text-xl font-bold mb-6 text-neutral-900 dark:text-white flex items-center gap-2">
                            <BellIcon className="w-6 h-6 text-indigo-500" /> Announcements
                        </h3>
                        <div className="space-y-4">
                            {data.recentAnnouncements.length > 0 ? (
                                data.recentAnnouncements.map(ann => <AnnouncementCard key={ann.id} announcement={ann} />)
                            ) : (
                                <div className="text-center py-6">
                                    <EmptyInboxIllustration />
                                    <p className="text-xs font-black text-neutral-300 uppercase tracking-[0.2em]">No new updates</p>
                                </div>
                            )}
                        </div>
                    </Card>

                    <Card className="animate-fade-in-up opacity-0" style={{ animationDelay: '530ms' } as any}>
                        <h3 className="text-xl font-bold mb-6 text-neutral-900 dark:text-white flex items-center gap-2">
                            <BellIcon className="w-6 h-6 text-indigo-500" /> Agreement & Reminder Desk
                        </h3>
                        <ReminderPreview reminders={data.reminders} agreement={data.agreement} />
                    </Card>

                    <Card className="animate-fade-in-up opacity-0" style={{ animationDelay: '550ms' } as any}>
                        <h3 className="text-xl font-bold mb-6 text-neutral-900 dark:text-white flex items-center gap-2">
                            <ShieldLockIcon className="w-6 h-6 text-blue-600" /> Tenant Scorecard
                        </h3>
                        <TenantScorecardPreview scorecard={data.scorecard} />
                    </Card>
                </div>

                <div className="space-y-6 xl:space-y-8">
                    <Card className="animate-fade-in-up opacity-0" style={{ animationDelay: '560ms' } as any}>
                        <h3 className="text-xl font-bold mb-6 text-neutral-900 dark:text-white flex items-center gap-2">
                            <CreditCardIcon className="w-6 h-6 text-blue-500" /> Rent & Utility Ledger
                        </h3>
                        <ChargeLedgerPreview entries={data.chargeLedger} />
                    </Card>

                    <Card className="animate-fade-in-up opacity-0" style={{ animationDelay: '590ms' } as any}>
                        <h3 className="text-xl font-bold mb-6 text-neutral-900 dark:text-white flex items-center gap-2">
                            <HomeIcon className="w-6 h-6 text-emerald-500" /> Move-In & Handover
                        </h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between gap-3"><span className="text-neutral-500 dark:text-neutral-400">Move-In Date</span><span className="font-semibold text-neutral-900 dark:text-white">{data.lifecycle?.move_in_date ? new Date(data.lifecycle.move_in_date).toLocaleDateString() : 'Not recorded'}</span></div>
                            <div className="flex justify-between gap-3"><span className="text-neutral-500 dark:text-neutral-400">Possession Handover</span><span className="font-semibold text-neutral-900 dark:text-white">{data.lifecycle?.possession_handover_on ? new Date(data.lifecycle.possession_handover_on).toLocaleDateString() : 'Not recorded'}</span></div>
                            <div className="flex justify-between gap-3"><span className="text-neutral-500 dark:text-neutral-400">Agreement Acknowledged</span><span className="font-semibold text-neutral-900 dark:text-white">{data.lifecycle?.agreement_acknowledged_at ? new Date(data.lifecycle.agreement_acknowledged_at).toLocaleDateString() : 'Pending'}</span></div>
                        </div>
                    </Card>

                    <VerificationCard delay="600ms" />

                    <Card className="animate-fade-in-up opacity-0" style={{ animationDelay: '700ms' } as any}>
                        <h3 className="text-xl font-bold mb-6 text-neutral-900 dark:text-white flex items-center gap-2">
                            <WrenchIcon className="w-6 h-6 text-orange-500" /> Maintenance
                        </h3>
                        <div className="space-y-4">
                            {data.openMaintenanceRequests.length > 0 ? (
                                data.openMaintenanceRequests.map(req => <MaintenanceRequestCard key={req.id} request={req} />)
                            ) : (
                                <div className="text-center py-8 bg-neutral-50 dark:bg-neutral-900 rounded-3xl border border-dashed border-neutral-200 dark:border-neutral-700">
                                    <QuietMaintenanceIllustration />
                                    <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">All systems clear</p>
                                </div>
                            )}
                        </div>
                    </Card>

                    <Card className="animate-fade-in-up opacity-0" style={{ animationDelay: '740ms' } as any}>
                        <h3 className="text-xl font-bold mb-6 text-neutral-900 dark:text-white flex items-center gap-2">
                            <CheckCircleIcon className="w-6 h-6 text-emerald-600" /> Tenant Activity Log
                        </h3>
                        <TenantActivityLogPreview entries={data.activityLog} />
                    </Card>

                </div>
            </div>

            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </div>
    );
};

export default TenantDashboard;
