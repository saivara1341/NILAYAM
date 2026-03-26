import React, { useEffect, useMemo, useState } from 'react';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import {
    acknowledgeTenantAgreement,
    generateAgreementDraft,
    getOwnerAgreementWorkspaces,
    getTenantAgreementWorkspace,
    updateTenantAgreement
} from '@/services/api';
import { AgreementType, AgreementWorkflow, AgreementWorkspaceItem, UserRole } from '@/types';
import { CheckCircleIcon, FileTextIcon, LeaseIcon, SparklesIcon } from '@/constants';
import { Copy, Check } from 'lucide-react';

const agreementTypes: Array<{ value: AgreementType; label: string }> = [
    { value: 'residential_rental', label: 'Residential Rental' },
    { value: 'leave_and_license', label: 'Leave and License' },
    { value: 'commercial_lease', label: 'Commercial Lease' },
    { value: 'pg_hostel', label: 'PG / Hostel' },
    { value: 'company_lease', label: 'Company Lease' }
];

const clauseLibrary = [
    'No pets without written owner approval.',
    'Smoking and illegal substances are prohibited inside the premises.',
    'Minor repairs below INR 1,000 are handled by the tenant; structural repairs remain the owner responsibility.',
    'Guests staying beyond three consecutive nights require owner approval.',
    'Parking is limited to the allocated slot and cannot be sublet separately.',
    'Electricity, water, and internet charges are payable by the tenant based on consumption or posted bills.',
    'Premises may be used only for lawful residential occupation unless a commercial lease is explicitly selected.'
];

const formatType = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

const AgreementsPage: React.FC = () => {
    const { profile, effectiveRole } = useAuth();
    const { refreshTenantDashboard } = useData();
    const [items, setItems] = useState<AgreementWorkspaceItem[]>([]);
    const [selectedHouseId, setSelectedHouseId] = useState('');
    const [workingAgreement, setWorkingAgreement] = useState<AgreementWorkflow | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const isTenant = effectiveRole === UserRole.Tenant;

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                if (isTenant) {
                    const workspace = await getTenantAgreementWorkspace();
                    const nextItems = workspace ? [workspace] : [];
                    setItems(nextItems);
                    setSelectedHouseId(nextItems[0]?.house_id || '');
                    setWorkingAgreement(nextItems[0]?.agreement || null);
                } else {
                    const nextItems = await getOwnerAgreementWorkspaces();
                    setItems(nextItems);
                    setSelectedHouseId((current) => current || nextItems[0]?.house_id || '');
                    setWorkingAgreement(nextItems[0]?.agreement || null);
                }
            } catch (err: any) {
                setError(err.message || 'Unable to load agreement workspace.');
            } finally {
                setLoading(false);
            }
        };

        void load();
    }, [isTenant]);

    const selectedItem = useMemo(
        () => items.find((item) => item.house_id === selectedHouseId) || items[0] || null,
        [items, selectedHouseId]
    );

    useEffect(() => {
        if (selectedItem) {
            setWorkingAgreement(selectedItem.agreement);
            setSelectedHouseId(selectedItem.house_id);
        }
    }, [selectedItem?.house_id]);

    const refreshCurrent = async (houseId?: string) => {
        if (isTenant) {
            await refreshTenantDashboard(true);
            const workspace = await getTenantAgreementWorkspace();
            const nextItems = workspace ? [workspace] : [];
            setItems(nextItems);
            setSelectedHouseId(nextItems[0]?.house_id || '');
            setWorkingAgreement(nextItems[0]?.agreement || null);
            return;
        }

        const nextItems = await getOwnerAgreementWorkspaces();
        setItems(nextItems);
        const nextSelected = nextItems.find((item) => item.house_id === (houseId || selectedHouseId)) || nextItems[0] || null;
        setSelectedHouseId(nextSelected?.house_id || '');
        setWorkingAgreement(nextSelected?.agreement || null);
    };

    const updateAgreementField = <K extends keyof AgreementWorkflow>(key: K, value: AgreementWorkflow[K]) => {
        setWorkingAgreement((current) => current ? { ...current, [key]: value } : current);
    };

    const handleSave = async () => {
        if (!selectedItem || !workingAgreement) return;
        setSaving(true);
        setError(null);
        try {
            await updateTenantAgreement(selectedItem.house_id, workingAgreement);
            await refreshCurrent(selectedItem.house_id);
        } catch (err: any) {
            setError(err.message || 'Unable to save agreement workflow.');
        } finally {
            setSaving(false);
        }
    };

    const handleGenerate = async () => {
        if (!selectedItem || !workingAgreement) return;
        setSaving(true);
        setError(null);
        try {
            await generateAgreementDraft({
                houseId: selectedItem.house_id,
                ownerName: profile?.full_name || 'Property Owner',
                tenantName: selectedItem.tenant_name || 'Tenant',
                buildingName: selectedItem.building_name,
                houseNumber: selectedItem.house_number,
                agreement: workingAgreement
            });
            await refreshCurrent(selectedItem.house_id);
        } catch (err: any) {
            setError(err.message || 'Unable to generate agreement draft.');
        } finally {
            setSaving(false);
        }
    };

    const handleAcknowledge = async () => {
        if (!selectedItem) return;
        setSaving(true);
        setError(null);
        try {
            await acknowledgeTenantAgreement(selectedItem.house_id, workingAgreement?.tenant_requirements || 'Tenant acknowledged the agreement in the agreement workspace.');
            await refreshCurrent(selectedItem.house_id);
        } catch (err: any) {
            setError(err.message || 'Unable to record acknowledgement.');
        } finally {
            setSaving(false);
        }
    };

    const handleCopy = async () => {
        if (!workingAgreement?.drafted_document) return;
        await navigator.clipboard.writeText(workingAgreement.drafted_document);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
    };

    if (loading) {
        return <div className="flex min-h-[50vh] items-center justify-center"><Spinner /></div>;
    }

    if (!selectedItem || !workingAgreement) {
        return (
            <div className="space-y-4">
                <h2 className="text-3xl font-black text-neutral-900 dark:text-white">Agreements</h2>
                <Card>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        {isTenant
                            ? 'Your owner has not opened an agreement workflow for your unit yet.'
                            : 'Add a tenant to a unit to start the agreement workflow.'}
                    </p>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-neutral-900 dark:text-white">Agreements</h2>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                        {isTenant
                            ? 'Review the saved agreement draft, add your requirements, and acknowledge once it matches your understanding.'
                            : 'Act as the owner legal desk: gather both sides’ requirements, design the right agreement type, and store the shared draft here.'}
                    </p>
                </div>
                {!isTenant && items.length > 1 && (
                    <select
                        value={selectedHouseId}
                        onChange={(event) => setSelectedHouseId(event.target.value)}
                        className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                    >
                        {items.map((item) => (
                            <option key={item.house_id} value={item.house_id}>
                                {item.building_name} • Unit {item.house_number} • {item.tenant_name || 'Tenant'}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                <div className="space-y-6">
                    <Card>
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">Agreement Workspace</p>
                                <h3 className="mt-2 text-2xl font-black text-neutral-900 dark:text-white">{selectedItem.building_name}</h3>
                                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                                    Unit {selectedItem.house_number} • {selectedItem.tenant_name || 'Tenant'}
                                </p>
                            </div>
                            <div className="rounded-full bg-blue-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                {formatType(workingAgreement.status)}
                            </div>
                        </div>
                        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-xs font-black uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">Agreement Type</label>
                                <select value={workingAgreement.agreement_type} onChange={(event) => updateAgreementField('agreement_type', event.target.value as AgreementType)} disabled={isTenant} className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white disabled:opacity-70">
                                    {agreementTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-black uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">Template Name</label>
                                <input value={workingAgreement.template_name || ''} onChange={(event) => updateAgreementField('template_name', event.target.value)} disabled={isTenant} className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white disabled:opacity-70" />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-black uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">Start Date</label>
                                <input type="date" value={workingAgreement.agreement_start_date || ''} onChange={(event) => updateAgreementField('agreement_start_date', event.target.value)} disabled={isTenant} className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white disabled:opacity-70" />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-black uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">End Date</label>
                                <input type="date" value={workingAgreement.agreement_end_date || ''} onChange={(event) => updateAgreementField('agreement_end_date', event.target.value)} disabled={isTenant} className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white disabled:opacity-70" />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-black uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">Monthly Rent</label>
                                <input type="number" value={workingAgreement.monthly_rent || selectedItem.rent_amount} onChange={(event) => updateAgreementField('monthly_rent', Number(event.target.value || 0))} disabled={isTenant} className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white disabled:opacity-70" />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-black uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">Security Deposit</label>
                                <input type="number" value={workingAgreement.security_deposit || 0} onChange={(event) => updateAgreementField('security_deposit', Number(event.target.value || 0))} disabled={isTenant} className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white disabled:opacity-70" />
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <div className="flex items-center gap-2">
                            <SparklesIcon className="h-5 w-5 text-indigo-600" />
                            <h3 className="text-xl font-black text-neutral-900 dark:text-white">Requirements Intake</h3>
                        </div>
                        <div className="mt-5 space-y-4">
                            <div>
                                <label className="mb-1 block text-xs font-black uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">Owner Requirements</label>
                                <textarea value={workingAgreement.owner_requirements || ''} onChange={(event) => updateAgreementField('owner_requirements', event.target.value)} disabled={isTenant} className="min-h-[110px] w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white disabled:opacity-70" placeholder="House rules, deposit expectations, commercial restrictions, notice expectations..." />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-black uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">Tenant Requirements</label>
                                <textarea value={workingAgreement.tenant_requirements || ''} onChange={(event) => updateAgreementField('tenant_requirements', event.target.value)} className="min-h-[110px] w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white" placeholder="Move-in needs, guest policies, work-from-home needs, notice concerns, furnishing asks..." />
                            </div>
                            <div>
                                <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">Special Clauses</label>
                                <div className="flex flex-wrap gap-2">
                                    {clauseLibrary.map((clause) => {
                                        const selected = (workingAgreement.special_clauses || []).includes(clause);
                                        return (
                                            <button
                                                key={clause}
                                                type="button"
                                                onClick={() => {
                                                    const current = workingAgreement.special_clauses || [];
                                                    updateAgreementField('special_clauses', selected ? current.filter((item) => item !== clause) : [...current, clause]);
                                                }}
                                                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-neutral-200 bg-white text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300'}`}
                                            >
                                                {selected ? 'Included' : 'Add'} • {clause.slice(0, 28)}{clause.length > 28 ? '...' : ''}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-black uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">Legal Advisory Note</label>
                                <textarea value={workingAgreement.legal_notes || ''} onChange={(event) => updateAgreementField('legal_notes', event.target.value)} disabled={isTenant} className="min-h-[90px] w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white disabled:opacity-70" placeholder="Stamp duty, registration, notarization, police verification, local municipal compliance..." />
                            </div>
                        </div>
                        <div className="mt-5 flex flex-wrap gap-3">
                            <button onClick={() => void handleSave()} disabled={saving} className="rounded-xl bg-neutral-900 px-4 py-3 text-sm font-black text-white dark:bg-white dark:text-neutral-900 disabled:opacity-60">
                                {saving ? 'Saving...' : 'Save Workflow'}
                            </button>
                            <button onClick={() => void handleGenerate()} disabled={saving} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60">
                                {saving ? 'Drafting...' : isTenant ? 'Request New Draft' : 'Generate / Refresh Draft'}
                            </button>
                            {isTenant && (
                                <button onClick={() => void handleAcknowledge()} disabled={saving} className="rounded-xl border border-emerald-300 bg-white px-4 py-3 text-sm font-black text-emerald-700 dark:border-emerald-800 dark:bg-neutral-900 dark:text-emerald-300 disabled:opacity-60">
                                    {saving ? 'Saving...' : 'Acknowledge Agreement'}
                                </button>
                            )}
                        </div>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <LeaseIcon className="h-5 w-5 text-blue-600" />
                                <h3 className="text-xl font-black text-neutral-900 dark:text-white">Saved Agreement Draft</h3>
                            </div>
                            {workingAgreement.drafted_document && (
                                <button onClick={() => void handleCopy()} className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-bold text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white">
                                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    {copied ? 'Copied' : 'Copy'}
                                </button>
                            )}
                        </div>
                        <div className="mt-4 rounded-[1.6rem] border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-700 dark:bg-neutral-950/60">
                            {workingAgreement.drafted_document ? (
                                <pre className="max-h-[620px] overflow-y-auto whitespace-pre-wrap text-sm leading-7 text-neutral-700 dark:text-neutral-300">{workingAgreement.drafted_document}</pre>
                            ) : (
                                <div className="py-8 text-center">
                                    <FileTextIcon className="mx-auto h-10 w-10 text-neutral-300 dark:text-neutral-600" />
                                    <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">No saved draft yet. Generate one after entering the owner and tenant requirements.</p>
                                </div>
                            )}
                        </div>
                    </Card>

                    <Card>
                        <div className="flex items-center gap-2">
                            <CheckCircleIcon className="h-5 w-5 text-emerald-600" />
                            <h3 className="text-xl font-black text-neutral-900 dark:text-white">Execution Status</h3>
                        </div>
                        <div className="mt-4 space-y-3 text-sm">
                            <div className="flex justify-between gap-3"><span className="text-neutral-500 dark:text-neutral-400">Status</span><span className="font-semibold text-neutral-900 dark:text-white">{formatType(workingAgreement.status)}</span></div>
                            <div className="flex justify-between gap-3"><span className="text-neutral-500 dark:text-neutral-400">Drafted At</span><span className="font-semibold text-neutral-900 dark:text-white">{workingAgreement.drafted_at ? new Date(workingAgreement.drafted_at).toLocaleString() : 'Not drafted yet'}</span></div>
                            <div className="flex justify-between gap-3"><span className="text-neutral-500 dark:text-neutral-400">Stamp Duty</span><span className="font-semibold text-neutral-900 dark:text-white">{formatType(workingAgreement.stamp_duty_status || 'pending')}</span></div>
                            <div className="flex justify-between gap-3"><span className="text-neutral-500 dark:text-neutral-400">Registration</span><span className="font-semibold text-neutral-900 dark:text-white">{formatType(workingAgreement.registration_status || 'pending')}</span></div>
                            <div className="flex justify-between gap-3"><span className="text-neutral-500 dark:text-neutral-400">Tenant Acknowledged</span><span className="font-semibold text-neutral-900 dark:text-white">{selectedItem.lifecycle?.agreement_acknowledged_at ? new Date(selectedItem.lifecycle.agreement_acknowledged_at).toLocaleString() : 'Pending'}</span></div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default AgreementsPage;
