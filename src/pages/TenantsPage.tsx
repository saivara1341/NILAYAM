
import React, { useState, useEffect, useCallback } from 'react';
import { Tenant } from '../types';
import AddTenantModal from '../components/tenants/AddTenantModal';
import LeaseGeneratorModal from '../components/tenants/LeaseGeneratorModal';
import Card from '../components/ui/Card';
import { Link } from 'react-router-dom';
import { getTenants } from '../services/api';
import PaginationControls from '../components/ui/PaginationControls';
import Spinner from '../components/ui/Spinner';
import { LeaseIcon, UserCircleIcon, BuildingIcon, HomeIcon, SearchIcon, BadgeCheckIcon } from '../constants';
import { useToast } from '../contexts/ToastContext';
import { useLanguage } from '../contexts/LanguageContext';
import { EmptyPeopleIllustration } from '../components/ui/StateIllustrations';
import { Check, Copy } from 'lucide-react';
import { copyText, openPhoneDialer, openWhatsAppChat } from '../utils/sharing';
import { getShellPlatform } from '@/utils/platform';

const ITEMS_PER_PAGE = 10;

// Simple debounce hook
const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
};

const TenantScoreBadge: React.FC<{ score?: number }> = ({ score }) => {
    if (score === undefined) return null;
    let color = 'bg-neutral-100 text-neutral-600';
    if (score >= 80) color = 'bg-green-100 text-green-700';
    else if (score >= 50) color = 'bg-yellow-100 text-yellow-700';
    else color = 'bg-red-100 text-red-700';

    return (
        <span className={`px-2 py-0.5 rounded text-xs font-bold ${color} flex items-center gap-1 w-fit`}>
            {score >= 80 && <BadgeCheckIcon className="w-3 h-3" />}
            Score: {score}
        </span>
    );
}

const TenantRow: React.FC<{ 
    tenant: Tenant; 
    isSelected: boolean;
    onSelect: (id: string) => void;
    onDraftLease: (tenant: Tenant) => void;
}> = ({ tenant, isSelected, onSelect, onDraftLease }) => {
    const { t } = useLanguage();
    const [copied, setCopied] = useState(false);

    const handleCopyPhone = async () => {
        if (!tenant.phone_number) return;
        const ok = await copyText(tenant.phone_number);
        if (ok) {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1200);
        }
    };

    return (
    <tr className="border-b border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group">
        <td className="px-4 py-4">
             <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onSelect(tenant.id)}
                className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
            <div className="flex items-center gap-3">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-1.5 rounded-full">
                    <UserCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400"/>
                </div>
                <div>
                    <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-200 block">{tenant.name}</span>
                    <TenantScoreBadge score={tenant.tenant_score} />
                </div>
            </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400">{tenant.building_name}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400">
            <span className="px-2 py-1 bg-neutral-100 dark:bg-neutral-700 rounded text-xs font-medium">{tenant.house_number}</span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400 font-mono">
            <div className="flex items-center gap-2">
                <span>{tenant.phone_number || 'N/A'}</span>
                {tenant.phone_number && (
                    <>
                        <button onClick={() => openPhoneDialer(tenant.phone_number)} className="rounded-lg border border-neutral-200 px-2 py-1 text-[11px] font-bold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800">
                            Call
                        </button>
                        <button onClick={() => void handleCopyPhone()} className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1 text-[11px] font-bold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800">
                            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            {copied ? 'Copied' : 'Copy'}
                        </button>
                    </>
                )}
            </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex items-center justify-end gap-3">
            {tenant.phone_number && (
                <button
                    onClick={() => openWhatsAppChat(tenant.phone_number, `Hi ${tenant.name || 'there'}, this is from Nilayam regarding your tenancy.`)}
                    className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-green-600 hover:text-green-700 transition-all px-3 py-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20"
                    title="WhatsApp Tenant"
                >
                    <span className="text-xs font-semibold">WhatsApp</span>
                </button>
            )}
            <button 
                onClick={() => onDraftLease(tenant)}
                className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-neutral-500 hover:text-primary dark:hover:text-primary-light transition-all px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                title="Draft AI Lease"
            >
                <LeaseIcon className="w-4 h-4" />
                <span className="text-xs font-semibold">{t('qa.draft_lease')}</span>
            </button>
            <Link to={`/tenants/${tenant.id}`} className="text-primary hover:text-primary-dark dark:text-primary-light dark:hover:text-white font-semibold px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">{t('common.view')}</Link>
        </td>
    </tr>
)};

const TenantCardMobile: React.FC<{ tenant: Tenant; onDraftLease: (tenant: Tenant) => void }> = ({ tenant, onDraftLease }) => {
    const { t } = useLanguage();
    const [copied, setCopied] = useState(false);

    const handleCopyPhone = async () => {
        if (!tenant.phone_number) return;
        const ok = await copyText(tenant.phone_number);
        if (ok) {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1200);
        }
    };

    return (
    <div className="bg-white dark:bg-neutral-800 p-5 rounded-2xl shadow-sm border border-neutral-200/60 dark:border-neutral-700/60 mb-4 flex flex-col gap-4">
        <div className="flex justify-between items-start">
            <div>
                <h4 className="font-bold text-neutral-900 dark:text-white text-lg">{tenant.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm text-neutral-500">{tenant.phone_number}</p>
                    <TenantScoreBadge score={tenant.tenant_score} />
                </div>
            </div>
            <Link to={`/tenants/${tenant.id}`} className="px-4 py-1.5 text-xs font-bold bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-full">{t('common.view')}</Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
             <div className="bg-neutral-50 dark:bg-neutral-900/50 p-3 rounded-xl text-sm"><span className="block text-xs text-neutral-500">{t('tenants.col_building')}</span>{tenant.building_name}</div>
             <div className="bg-neutral-50 dark:bg-neutral-900/50 p-3 rounded-xl text-sm"><span className="block text-xs text-neutral-500">{t('tenants.col_unit')}</span>{tenant.house_number}</div>
        </div>
        {tenant.phone_number && (
            <div className="grid grid-cols-3 gap-2">
                <button onClick={() => openPhoneDialer(tenant.phone_number)} className="rounded-xl border border-neutral-200 dark:border-neutral-700 px-3 py-2 text-xs font-bold text-neutral-800 dark:text-neutral-100">Call</button>
                <button onClick={() => openWhatsAppChat(tenant.phone_number, `Hi ${tenant.name || 'there'}, this is from Nilayam regarding your tenancy.`)} className="rounded-xl bg-green-600 px-3 py-2 text-xs font-bold text-white">WhatsApp</button>
                <button onClick={() => void handleCopyPhone()} className="inline-flex items-center justify-center gap-1 rounded-xl border border-neutral-200 dark:border-neutral-700 px-3 py-2 text-xs font-bold text-neutral-800 dark:text-neutral-100">
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                </button>
            </div>
        )}
        <button onClick={() => onDraftLease(tenant)} className="w-full flex items-center justify-center gap-2 text-sm font-bold text-primary bg-blue-50 dark:bg-blue-900/20 py-3 rounded-xl">
            <LeaseIcon className="w-4 h-4" /> {t('qa.draft_lease')}
        </button>
    </div>
)};

const EmptyTenantsState: React.FC<{ hasSearch: boolean; onAdd: () => void }> = ({ hasSearch, onAdd }) => (
    <div className="rounded-[2rem] border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-6 py-12 text-center shadow-sm">
        <EmptyPeopleIllustration />
        <h3 className="mt-4 text-2xl font-black text-neutral-900 dark:text-white">
            {hasSearch ? 'No matching tenants' : 'No tenants yet'}
        </h3>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            {hasSearch ? 'Try a different search term or clear the filter.' : 'Start by adding your first resident to turn the app into an active operations desk.'}
        </p>
        {!hasSearch && (
            <button
                onClick={onAdd}
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-900 dark:bg-white px-5 py-3 text-sm font-black text-white dark:text-neutral-900"
            >
                + Add Tenant
            </button>
        )}
    </div>
);

const TenantsPage: React.FC = () => {
    const { t } = useLanguage();
    const { success, info } = useToast(); 
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalTenants, setTotalTenants] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [selectedTenants, setSelectedTenants] = useState<string[]>([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [leaseTenant, setLeaseTenant] = useState<Tenant | null>(null);
    const [isLeaseModalOpen, setIsLeaseModalOpen] = useState(false);
    const shellPlatform = React.useMemo(() => getShellPlatform(), []);
    const isAppShell = shellPlatform === 'app';

    const fetchTenants = useCallback(async (page: number, search: string) => {
        setLoading(true);
        setError(null);
        try {
            const { data, count } = await getTenants(page, ITEMS_PER_PAGE, search);
            setTenants(data);
            setTotalTenants(count);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setCurrentPage(1);
        fetchTenants(1, debouncedSearchTerm);
    }, [debouncedSearchTerm, fetchTenants]);

    useEffect(() => {
        fetchTenants(currentPage, debouncedSearchTerm);
    }, [currentPage, fetchTenants]);

    const handleAddSuccess = () => {
        fetchTenants(currentPage, debouncedSearchTerm);
        setIsModalOpen(false);
        success("Tenant added successfully!");
    };

    const openLeaseGenerator = (tenant: Tenant) => {
        info(`Initializing AI Lease Architect for ${tenant.name}...`);
        setTimeout(() => {
            setLeaseTenant(tenant);
            setIsLeaseModalOpen(true);
        }, 500);
    };

    const handleSelectTenant = (id: string) => {
        setSelectedTenants(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
    };

    const totalPages = Math.ceil(totalTenants / ITEMS_PER_PAGE);

    return (
        <>
            <AddTenantModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={handleAddSuccess} />
            <LeaseGeneratorModal isOpen={isLeaseModalOpen} onClose={() => setIsLeaseModalOpen(false)} tenant={leaseTenant} />

            <div className={`animate-fade-in ${isAppShell ? 'space-y-6 pb-20 md:pb-0' : 'space-y-8 pb-6'}`}>
                <section className={`overflow-hidden rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_45%,#eff6ff_100%)] dark:border-slate-800 dark:bg-[linear-gradient(135deg,rgba(30,41,59,0.96),rgba(15,23,42,1))] ${isAppShell ? 'p-5' : 'p-6 xl:p-8'}`}>
                    <div className={`flex gap-6 ${isAppShell ? 'flex-col' : 'flex-col xl:flex-row xl:items-end xl:justify-between'}`}>
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-600 dark:text-blue-300">Resident operations</p>
                        <h2 className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">{t('tenants.title')}</h2>
                        <p className="mt-2 max-w-3xl text-neutral-500 dark:text-neutral-400">{t('tenants.subtitle')}</p>
                    </div>
                    <div className={`flex gap-3 ${isAppShell ? 'w-full' : 'w-full xl:w-auto'}`}>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-neutral-900 px-6 py-3 text-sm font-black text-white shadow-lg transition-all hover:bg-neutral-800 active:scale-95 dark:border-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
                        >
                            + {t('qa.add_tenant')}
                        </button>
                    </div>
                </div>
                </section>

                <Card className={isAppShell ? '' : 'rounded-[1.8rem]'}>
                    <div className={`grid gap-4 ${isAppShell ? 'grid-cols-1' : 'xl:grid-cols-[minmax(0,1.4fr)_auto]'}`}>
                        <div className="relative">
                        <input
                            type="text"
                            placeholder={t('tenants.search_placeholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 border-none bg-neutral-50 dark:bg-neutral-800 rounded-xl text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                        />
                        <SearchIcon className="absolute left-4 top-3.5 w-5 h-5 text-neutral-400" />
                    </div>
                        {!isAppShell && (
                            <div className="grid min-w-[280px] grid-cols-3 gap-3">
                                <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-center dark:border-neutral-700 dark:bg-neutral-900">
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">Residents</p>
                                    <p className="mt-2 text-2xl font-black text-neutral-900 dark:text-white">{totalTenants}</p>
                                </div>
                                <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-center dark:border-neutral-700 dark:bg-neutral-900">
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">Selected</p>
                                    <p className="mt-2 text-2xl font-black text-neutral-900 dark:text-white">{selectedTenants.length}</p>
                                </div>
                                <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-center dark:border-neutral-700 dark:bg-neutral-900">
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">Search</p>
                                    <p className="mt-2 text-sm font-black text-neutral-900 dark:text-white">{debouncedSearchTerm.trim() ? 'Filtered' : 'All live'}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>

                <div className="mt-4">
                    {loading ? <div className="flex justify-center py-12"><Spinner /></div> : tenants.length === 0 ? (
                        <EmptyTenantsState hasSearch={Boolean(debouncedSearchTerm.trim())} onAdd={() => setIsModalOpen(true)} />
                    ) : (
                        <>
                            <div className="hidden md:block overflow-hidden rounded-[1.6rem] border border-neutral-200 dark:border-neutral-700 shadow-sm">
                                <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
                                    <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                                        <tr>
                                            <th className="px-4 py-3 w-10"><input type="checkbox" className="rounded border-neutral-300 text-primary focus:ring-primary" /></th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{t('tenants.col_name')}</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{t('tenants.col_building')}</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{t('tenants.col_unit')}</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{t('tenants.col_contact')}</th>
                                            <th className="px-6 py-3 text-right"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-700">
                                        {tenants.map(tenant => (
                                            <TenantRow 
                                                key={tenant.id} 
                                                tenant={tenant} 
                                                isSelected={selectedTenants.includes(tenant.id)}
                                                onSelect={handleSelectTenant}
                                                onDraftLease={openLeaseGenerator}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className={`space-y-4 ${isAppShell ? 'md:space-y-4' : 'md:hidden'}`}>
                                {tenants.map(tenant => <TenantCardMobile key={tenant.id} tenant={tenant} onDraftLease={openLeaseGenerator} />)}
                            </div>
                            <PaginationControls
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                                itemsPerPage={ITEMS_PER_PAGE}
                                totalItems={totalTenants}
                            />
                        </>
                    )}
                </div>
            </div>
        </>
    );
};

export default TenantsPage;
