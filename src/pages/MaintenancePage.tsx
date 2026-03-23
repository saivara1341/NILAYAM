
import React, { useState, useEffect, useCallback } from 'react';
import { MaintenanceRequest, MaintenanceStatus } from '../types';
import Card from '../components/ui/Card';
import { getMaintenanceRequests } from '../services/api';
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

    const handleFilterChange = (status?: MaintenanceStatus) => {
        setStatusFilter(status);
        setCurrentPage(1);
    }

    const totalPages = Math.ceil(totalRequests / ITEMS_PER_PAGE);

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
