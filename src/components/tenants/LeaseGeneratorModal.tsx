
import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { Tenant } from '../../types';
import Spinner from '../ui/Spinner';
import { LeaseIcon } from '../../constants';
import { generateAgreementDraft } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface LeaseGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    tenant: Tenant | null;
}

const QUICK_CLAUSES = [
    { label: "No Pets", text: "Tenants are strictly prohibited from keeping pets of any kind on the premises." },
    { label: "No Smoking", text: "Smoking is strictly prohibited inside the property." },
    { label: "Security Deposit", text: "A security deposit equivalent to 2 months of rent must be paid prior to occupancy. Refundable upon lease termination subject to inspection." },
    { label: "Late Fees", text: "Rent paid after the 5th of the month will incur a late fee of ₹500 per day." },
    { label: "Maintenance", text: "Minor repairs (under ₹1000) are the tenant's responsibility. Major structural repairs are the landlord's responsibility." },
    { label: "Subletting", text: "Subletting or assigning the lease to a third party is strictly prohibited without written consent from the landlord." }
];

const HYDERABAD_CLAUSES = [
    { label: "GHMC Clause", text: "Tenant agrees to comply with all Greater Hyderabad Municipal Corporation (GHMC) sanitation and waste disposal bylaws." },
    { label: "Water Usage", text: "Water usage is subject to HMWSSB regulations. Any penalties for excessive usage will be borne by the tenant." },
    { label: "Possession Date", text: "Possession of the property will be handed over on [DATE], subject to clearance of security deposit and one month's advance rent." },
];

const LeaseGeneratorModal: React.FC<LeaseGeneratorModalProps> = ({ isOpen, onClose, tenant }) => {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [leaseContent, setLeaseContent] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [terms, setTerms] = useState('');
    const [duration, setDuration] = useState('11 months');

    const handleGenerate = async () => {
        if (!tenant) return;
        setLoading(true);
        setError(null);
        try {
            const agreement = await generateAgreementDraft({
                houseId: tenant.id,
                ownerName: profile?.full_name || 'Property Owner',
                tenantName: tenant.name || 'Tenant',
                buildingName: tenant.building_name || 'Property',
                houseNumber: tenant.house_number || 'Unit',
                agreement: {
                    house_id: tenant.id,
                    tenant_id: null,
                    agreement_type: 'residential_rental',
                    template_name: 'AI lease architect draft',
                    status: 'active',
                    agreement_start_date: null,
                    agreement_end_date: null,
                    monthly_rent: 0,
                    security_deposit: 0,
                    renewal_notice_days: 30,
                    notice_period_days: 30,
                    owner_requirements: `Draft duration: ${duration}`,
                    tenant_requirements: null,
                    special_clauses: terms
                        .split('\n')
                        .map((line) => line.replace(/^-+\s*/, '').trim())
                        .filter(Boolean),
                    legal_notes: 'Generated from AI Lease Architect modal. Review before execution.',
                    drafted_document: null,
                    drafted_at: null,
                    vacate_notice_date: null,
                    vacate_reason: null,
                    stamp_duty_status: 'pending',
                    registration_status: 'pending',
                    last_updated_at: new Date().toISOString()
                }
            });
            setLeaseContent(agreement.drafted_document || '');
        } catch (err: any) {
            setError(err.message || "Failed to generate lease.");
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = () => {
        const element = document.createElement("a");
        const file = new Blob([leaseContent], {type: 'text/plain'});
        element.href = URL.createObjectURL(file);
        element.download = `Lease_Agreement_${tenant?.name?.replace(/\s+/g, '_') || 'tenant'}.txt`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const addClause = (text: string) => {
        setTerms(prev => prev ? `${prev}\n- ${text}` : `- ${text}`);
    };

    if (!tenant) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="AI Lease Architect">
            <div className="space-y-4">
                {!leaseContent ? (
                    <>
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex items-start gap-3">
                            <LeaseIcon className="w-6 h-6 text-blue-600 mt-1" />
                            <div>
                                <h4 className="font-semibold text-blue-900 dark:text-blue-200">Drafting for {tenant.name}</h4>
                                <p className="text-sm text-blue-700 dark:text-blue-300">
                                    Gemini will draft a legally sound lease agreement based on the details below.
                                </p>
                            </div>
                        </div>

                        <div>
                            <label className="label">Lease Duration</label>
                            <input type="text" value={duration} onChange={(e) => setDuration(e.target.value)} className="form-input" />
                        </div>

                        <div>
                            <label className="label mb-2">Hyderabad/Telangana Specific Clauses</label>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {HYDERABAD_CLAUSES.map((clause, idx) => (
                                    <button 
                                        key={idx}
                                        type="button"
                                        onClick={() => addClause(clause.text)}
                                        className="px-3 py-1 text-xs bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-700 rounded-full transition-colors text-amber-800 dark:text-amber-200"
                                    >
                                        + {clause.label}
                                    </button>
                                ))}
                            </div>
                            <label className="label mb-2">Quick Clause Library</label>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {QUICK_CLAUSES.map((clause, idx) => (
                                    <button 
                                        key={idx}
                                        type="button"
                                        onClick={() => addClause(clause.text)}
                                        className="px-3 py-1 text-xs bg-neutral-100 dark:bg-neutral-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-neutral-200 dark:border-neutral-700 rounded-full transition-colors"
                                    >
                                        + {clause.label}
                                    </button>
                                ))}
                            </div>
                            <label className="label">Custom Terms to Include</label>
                            <textarea 
                                value={terms} 
                                onChange={(e) => setTerms(e.target.value)} 
                                className="form-input font-mono text-sm" 
                                rows={5}
                                placeholder="Select clauses above or type your own..."
                            />
                        </div>

                        {error && <p className="text-red-500 text-sm">{error}</p>}

                        <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                            <button onClick={onClose} className="btn btn-secondary">Cancel</button>
                            <button onClick={handleGenerate} disabled={loading} className="btn btn-primary">
                                {loading ? 'Drafting...' : 'Generate Agreement'}
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 max-h-[400px] overflow-y-auto whitespace-pre-wrap text-sm font-mono text-slate-700 dark:text-slate-300 shadow-inner">
                            {leaseContent}
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                            <button onClick={() => setLeaseContent('')} className="btn btn-secondary">Back to Edit</button>
                            <button onClick={handleDownload} className="btn btn-primary">Download Text File</button>
                        </div>
                    </>
                )}
            </div>
            <style>{`.label { display: block; font-size: 0.875rem; font-weight: 600; color: #475569; margin-bottom: 0.25rem; } .dark .label { color: #94a3b8; } .form-input { display: block; width: 100%; padding: 0.75rem; border: 1px solid #cbd5e1; border-radius: 0.5rem; background-color: white; color: #0f172a; transition: all 0.2s; } .dark .form-input { border-color: #475569; background-color: #1e293b; color: #f1f5f9; } .form-input:focus { border-color: #3b82f6; ring: 2px; ring-color: #3b82f6; outline: none; }`}</style>
        </Modal>
    );
};

export default LeaseGeneratorModal;
