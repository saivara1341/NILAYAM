
import React, { useState, useEffect, useCallback } from 'react';
import { Tenant } from '../types';
import AddTenantModal from '../components/tenants/AddTenantModal';
import LeaseGeneratorModal from '../components/tenants/LeaseGeneratorModal';
import { Link } from 'react-router-dom';
import { getTenants } from '../services/api';
import PaginationControls from '../components/ui/PaginationControls';
import Spinner from '../components/ui/Spinner';
import { LeaseIcon, UserCircleIcon, BuildingIcon, HomeIcon, SearchIcon, BadgeCheckIcon } from '../constants';
import { useToast } from '../contexts/ToastContext';
import { useLanguage } from '../contexts/LanguageContext';
import { EmptyPeopleIllustration } from '../components/ui/StateIllustrations';

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
        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400 font-mono">{tenant.phone_number || 'N/A'}</td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex items-center justify-end gap-3">
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

            <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">{t('tenants.title')}</h2>
                        <p className="text-neutral-500 dark:text-neutral-400">{t('tenants.subtitle')}</p>
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-black rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all shadow-lg active:scale-95 border border-neutral-200 dark:border-neutral-800"
                        >
                            + {t('qa.add_tenant')}
                        </button>
                    </div>
                </div>

                <div className="bg-white dark:bg-neutral-900 p-2 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800">
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
                </div>

                <div className="mt-4">
                    {loading ? <div className="flex justify-center py-12"><Spinner /></div> : tenants.length === 0 ? (
                        <EmptyTenantsState hasSearch={Boolean(debouncedSearchTerm.trim())} onAdd={() => setIsModalOpen(true)} />
                    ) : (
                        <>
                            <div className="hidden md:block overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
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
                            <div className="md:hidden space-y-4">
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
