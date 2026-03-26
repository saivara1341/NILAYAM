
import React, { useState, useEffect, useCallback } from 'react';
import { MaintenanceRequest, MaintenanceStatus, MaintenanceERPWorkspace, VendorWorkOrder } from '../types';
import Card from '../components/ui/Card';
import { getMaintenanceRequests, getMaintenanceERPWorkspace, updateVendorWorkOrderStatus } from '../services/api';
import PaginationControls from '../components/ui/PaginationControls';
import Spinner from '../components/ui/Spinner';
import { useLanguage } from '../contexts/LanguageContext';
// import DatabaseFixInstructions from '../components/auth/DatabaseFixInstructions'; // Removed as file is missing

const ITEMS_PER_PAGE = 10;

const statusStyles: { [key in MaintenanceStatus]: { bg: string; text: string; darkBg: string; darkText: string; } } = {
    open: { bg: 'bg-red-100', text: 'text-red-800', darkBg: 'dark:bg-red-900/40', darkText: 'dark:text-red-300' },
    in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-800', darkBg: 'dark:bg-yellow-900/40', darkText: 'dark:text-yellow-300' },
    closed: { bg: 'bg-green-100', text: 'text-green-800', darkBg: 'dark:bg-green-900/40', darkText: 'dark:text-green-300' },
    resolved: { bg: 'bg-emerald-100', text: 'text-emerald-800', darkBg: 'dark:bg-emerald-900/40', darkText: 'dark:text-emerald-300' },
};

const MaintenanceRequestCard: React.FC<{ request: MaintenanceRequest }> = ({ request }) => {
    const status = statusStyles[request.status];
    return (
        <Card>
            <div className="flex justify-between items-start">
                <div>
                    <p className="font-semibold text-blue-900 dark:text-slate-200">{request.building_name} - Unit {request.house_number}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{request.description}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${status.bg} ${status.text} ${status.darkBg} ${status.darkText}`}>
                    {request.status.replace('_', ' ').toUpperCase()}
                </span>
            </div>
            <div className="flex justify-between items-end mt-3">
                <p className="text-xs text-slate-400 dark:text-slate-500">
                    Reported on: {new Date(request.created_at).toLocaleDateString()}
                </p>
                {request.image_urls && request.image_urls.length > 0 && (
                    <a href={request.image_urls[0]} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-blue-600 hover:underline">
                        View Attachments ({request.image_urls.length})
                    </a>
                )}
            </div>
        </Card>
    );
};

const MaintenancePage: React.FC = () => {
    const { t } = useLanguage();
    const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dbError, setDbError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalRequests, setTotalRequests] = useState(0);
    const [statusFilter, setStatusFilter] = useState<MaintenanceStatus | undefined>(undefined);
    const [workspace, setWorkspace] = useState<MaintenanceERPWorkspace | null>(null);
    const [updatingWorkOrder, setUpdatingWorkOrder] = useState<string | null>(null);

    const fetchRequests = useCallback(async (page: number, status?: MaintenanceStatus) => {
        setLoading(true);
        setError(null);
        setDbError(null);
        try {
            const { data, count } = await getMaintenanceRequests(page, ITEMS_PER_PAGE, status);
            setRequests(data);
            setTotalRequests(count);
        } catch (err: any) {
            if (err.message.includes('infinite recursion')) {
                setDbError(err.message);
            } else {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRequests(currentPage, statusFilter);
    }, [currentPage, statusFilter, fetchRequests]);

    useEffect(() => {
        const loadWorkspace = async () => {
            try {
                const data = await getMaintenanceERPWorkspace();
                setWorkspace(data);
            } catch (err) {
                console.error(err);
            }
        };
        void loadWorkspace();
    }, [requests.length]);

    const handleFilterChange = (status?: MaintenanceStatus) => {
        setStatusFilter(status);
        setCurrentPage(1);
    }

    const totalPages = Math.ceil(totalRequests / ITEMS_PER_PAGE);

    const handleWorkOrderUpdate = async (id: string, status: VendorWorkOrder['status']) => {
        setUpdatingWorkOrder(id);
        try {
            const updated = await updateVendorWorkOrderStatus(id, status);
            if (!updated) return;
            setWorkspace((current) => current ? {
                ...current,
                workOrders: current.workOrders.map((entry) => entry.id === id ? updated : entry),
                overdueWorkOrders: current.overdueWorkOrders.filter((entry) => entry.id !== id || updated.status !== 'completed')
            } : current);
        } finally {
            setUpdatingWorkOrder(null);
        }
    };

    if (dbError) {
        return (
            <div className="p-8 text-center bg-red-50 dark:bg-red-900/10 rounded-3xl border border-red-200 dark:border-red-800/50">
                <h3 className="text-xl font-bold text-red-900 dark:text-red-200 mb-4">Database Connection Issue</h3>
                <p className="text-red-700 dark:text-red-400 mb-6 max-w-lg mx-auto leading-relaxed">
                    {dbError}
                </p>
                <div className="flex flex-col items-center gap-4">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 italic">
                        Try running the database repair scripts or checking your Supabase connection.
                    </p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-red-600/20"
                    >
                        Retry Connection
                    </button>
                </div>
            </div>
        );
    }

    const renderContent = () => {
        if (loading) return <div className="text-center py-12"><Spinner /></div>;
        if (error) return <div className="text-center py-12 text-red-500 bg-red-100 dark:bg-red-900/30 p-4 rounded-lg">Error: {error}</div>;
        if (requests.length === 0) {
            return (
                <div className="text-center py-12">
                    <p className="text-slate-500 dark:text-slate-400">No maintenance requests match the current filter.</p>
                </div>
            );
        }
        return (
            <div className="space-y-4">
                {requests.map(req => <MaintenanceRequestCard key={req.id} request={req} />)}
            </div>
        );
    };

    const filterOptions: { label: string, value?: MaintenanceStatus }[] = [
        { label: t('maintenance.filter_all'), value: undefined },
        { label: t('maintenance.filter_open'), value: 'open' },
        { label: t('maintenance.filter_progress'), value: 'in_progress' },
        { label: t('maintenance.filter_closed'), value: 'closed' }
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-3xl font-bold text-blue-900 dark:text-slate-200">{t('maintenance.title')}</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card className="bg-gradient-to-br from-orange-50 to-white dark:from-neutral-800 dark:to-neutral-900">
                    <p className="text-xs font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Open Requests</p>
                    <p className="mt-2 text-3xl font-bold text-orange-600 dark:text-orange-400">{workspace?.openRequests.length || 0}</p>
                </Card>
                <Card className="bg-gradient-to-br from-red-50 to-white dark:from-neutral-800 dark:to-neutral-900">
                    <p className="text-xs font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">SLA At Risk</p>
                    <p className="mt-2 text-3xl font-bold text-red-600 dark:text-red-400">{workspace?.overdueWorkOrders.length || 0}</p>
                </Card>
                <Card className="bg-gradient-to-br from-emerald-50 to-white dark:from-neutral-800 dark:to-neutral-900">
                    <p className="text-xs font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Vendor Work Orders</p>
                    <p className="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">{workspace?.workOrders.length || 0}</p>
                </Card>
            </div>

            {workspace && (
                <Card>
                    <div className="flex items-center justify-between gap-4 mb-4">
                        <div>
                            <h3 className="text-xl font-bold text-neutral-900 dark:text-white">SLA & Vendor Dispatch Desk</h3>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">Assign providers, track service SLAs, and push work orders from intake to completion.</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {workspace.workOrders.slice(0, 6).map((workOrder) => (
                            <div key={workOrder.id} className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900/50 px-4 py-4">
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div>
                                        <p className="text-sm font-bold text-neutral-900 dark:text-white">{workOrder.provider_name || 'Awaiting assignment'} • {workOrder.service_category || 'General'}</p>
                                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">SLA due {new Date(workOrder.sla_due_at).toLocaleString()} • Priority {workOrder.priority}</p>
                                        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{workOrder.notes || 'No operational notes yet.'}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${
                                            workOrder.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                                            new Date(workOrder.sla_due_at).getTime() < Date.now() ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                            'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                        }`}>
                                            {workOrder.status.replace('_', ' ')}
                                        </span>
                                        {workOrder.status !== 'in_progress' && workOrder.status !== 'completed' && (
                                            <button onClick={() => void handleWorkOrderUpdate(workOrder.id, 'in_progress')} disabled={updatingWorkOrder === workOrder.id} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white">
                                                Start
                                            </button>
                                        )}
                                        {workOrder.status !== 'completed' && (
                                            <button onClick={() => void handleWorkOrderUpdate(workOrder.id, 'completed')} disabled={updatingWorkOrder === workOrder.id} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white">
                                                Close SLA
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            <Card>
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-hide">
                        {filterOptions.map(option => (
                            <button
                                key={option.label}
                                onClick={() => handleFilterChange(option.value)}
                                className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors whitespace-nowrap ${statusFilter === option.value ? 'bg-blue-800 dark:bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-4">
                    {renderContent()}
                </div>

                {totalPages > 1 && (
                    <PaginationControls
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        itemsPerPage={ITEMS_PER_PAGE}
                        totalItems={totalRequests}
                    />
                )}
            </Card>
        </div>
    );
};

export default MaintenancePage;
