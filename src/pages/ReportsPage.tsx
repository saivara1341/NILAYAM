import React, { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
import { AnalyticsWorkspace } from '../types';
import { getAccountingExportRows, getAnalyticsWorkspace, getRentRollData } from '../services/api';
import { FinancialAnalyticsIcon, DollarSignIcon, BuildingIcon, ShieldCheckIcon, BrainCircuitIcon, WrenchIcon } from '../constants';

type ReportType = 'rent_roll' | 'profit_loss' | 'expense_summary' | 'audit_compliance' | 'collections_control';

const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
        alert('No data available to generate this report.');
        return;
    }
    const headers = Object.keys(data[0]);
    const csvRows = [
        headers.join(','),
        ...data.map((row) =>
            headers.map((header) => `"${String(row[header] ?? '').replace(/"/g, '""')}"`).join(',')
        )
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const ReportCard: React.FC<{
    title: string;
    description: string;
    icon: React.ReactNode;
    onGenerate: () => Promise<void>;
    loading: boolean;
}> = ({ title, description, icon, onGenerate, loading }) => (
    <Card className="flex flex-col">
        <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                {icon}
            </div>
            <div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">{title}</h3>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
            </div>
        </div>
        <div className="mt-4 border-t border-neutral-100 pt-4 dark:border-neutral-800">
            <button onClick={onGenerate} disabled={loading} className="w-full btn btn-secondary">
                {loading ? <Spinner /> : 'Generate & Download CSV'}
            </button>
        </div>
    </Card>
);

const ReportsPage: React.FC = () => {
    const [loadingReport, setLoadingReport] = useState<ReportType | null>(null);
    const [analytics, setAnalytics] = useState<AnalyticsWorkspace | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            setAnalytics(await getAnalyticsWorkspace());
        } catch (err: any) {
            setAnalytics(null);
            setError(err?.message || 'Failed to load reporting workspace.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
    }, []);

    const handleGenerateReport = async (type: ReportType) => {
        setLoadingReport(type);
        try {
            if (type === 'rent_roll') {
                downloadCSV(await getRentRollData(), 'rent_roll_report');
                return;
            }
            downloadCSV(await getAccountingExportRows(type), `${type}_report`);
        } catch (error: any) {
            alert(`Failed to generate report: ${error.message || 'Unknown error'}`);
        } finally {
            setLoadingReport(null);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h2 className="text-3xl font-bold text-neutral-900 dark:text-white">Reports Hub</h2>
                <p className="mt-2 max-w-3xl text-neutral-500 dark:text-neutral-400">
                    Download executive, finance, compliance, and collections-control reports backed by the ERP data layer.
                </p>
            </div>

            {loading ? (
                <div className="py-12 text-center"><Spinner /></div>
            ) : error ? (
                <Card className="rounded-[1.75rem] border border-rose-200 bg-rose-50 p-6 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                    <h3 className="text-lg font-black">Reports could not be loaded</h3>
                    <p className="mt-3 text-sm leading-7">{error}</p>
                    <button onClick={() => void load()} className="mt-4 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white dark:bg-white dark:text-slate-900">
                        Retry
                    </button>
                </Card>
            ) : analytics && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-neutral-800 dark:to-neutral-900">
                        <p className="text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Collected</p>
                        <p className="mt-2 text-3xl font-black text-blue-600 dark:text-blue-400">₹{analytics.collections.totalCollected.toLocaleString('en-IN')}</p>
                    </Card>
                    <Card className="bg-gradient-to-br from-amber-50 to-white dark:from-neutral-800 dark:to-neutral-900">
                        <p className="text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Pending Payouts</p>
                        <p className="mt-2 text-3xl font-black text-amber-600 dark:text-amber-400">₹{analytics.collections.pendingPayouts.toLocaleString('en-IN')}</p>
                    </Card>
                    <Card className="bg-gradient-to-br from-rose-50 to-white dark:from-neutral-800 dark:to-neutral-900">
                        <p className="text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Overdue Invoices</p>
                        <p className="mt-2 text-3xl font-black text-rose-600 dark:text-rose-400">₹{analytics.collections.overdueInvoices.toLocaleString('en-IN')}</p>
                    </Card>
                    <Card className="bg-gradient-to-br from-emerald-50 to-white dark:from-neutral-800 dark:to-neutral-900">
                        <p className="text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Ops Workload</p>
                        <p className="mt-2 text-3xl font-black text-emerald-600 dark:text-emerald-400">{analytics.operations.lifecycleTasks + analytics.operations.openWorkOrders}</p>
                    </Card>
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                <ReportCard
                    title="Rent Roll Report"
                    description="Units, tenants, rent amounts, and occupancy for property-level audits."
                    icon={<BuildingIcon className="h-6 w-6" />}
                    onGenerate={() => handleGenerateReport('rent_roll')}
                    loading={loadingReport === 'rent_roll'}
                />
                <ReportCard
                    title="Profit & Loss Export"
                    description="Invoice-led revenue export with issued, overdue, and collected amounts."
                    icon={<FinancialAnalyticsIcon className="h-6 w-6" />}
                    onGenerate={() => handleGenerateReport('profit_loss')}
                    loading={loadingReport === 'profit_loss'}
                />
                <ReportCard
                    title="Expense Summary"
                    description="Line-item accounting breakdown across rent, utilities, maintenance, and other charges."
                    icon={<DollarSignIcon className="h-6 w-6" />}
                    onGenerate={() => handleGenerateReport('expense_summary')}
                    loading={loadingReport === 'expense_summary'}
                />
                <ReportCard
                    title="Audit & Compliance"
                    description="Payout control export for finance review, tax-ready reconciliation, and settlement evidence."
                    icon={<ShieldCheckIcon className="h-6 w-6" />}
                    onGenerate={() => handleGenerateReport('audit_compliance')}
                    loading={loadingReport === 'audit_compliance'}
                />
                <ReportCard
                    title="Collections Control"
                    description="Matched, unmatched, and review-required payment reconciliation export."
                    icon={<BrainCircuitIcon className="h-6 w-6" />}
                    onGenerate={() => handleGenerateReport('collections_control')}
                    loading={loadingReport === 'collections_control'}
                />
                <Card className="bg-gradient-to-br from-white to-neutral-50 dark:from-neutral-900 dark:to-neutral-950">
                    <div className="flex items-start gap-4">
                        <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                            <WrenchIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">BI Notes</h3>
                            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                                This dashboard now reflects collections, payout exposure, lifecycle task pressure, and document/security backlog from the enterprise ERP layer.
                            </p>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default ReportsPage;
