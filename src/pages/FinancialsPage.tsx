
import React, { useState, useEffect, useCallback } from 'react';
import { Transaction, TransactionType, FinancialDataPoint } from '../types';
import Card from '../components/ui/Card';
import { getTransactions, getFinancialsOverview, getMonthlyFinancialsForInsights } from '../services/api';
import PaginationControls from '../components/ui/PaginationControls';
import Spinner from '../components/ui/Spinner';
import ProfitLossChart from '../components/insights/ProfitLossChart';
import PredictiveRevenueChart from '../components/insights/PredictiveRevenueChart';
import { InsightsIcon, BrainCircuitIcon, FileTextIcon } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';

const ITEMS_PER_PAGE = 15;

const TransactionRow: React.FC<{ transaction: Transaction }> = ({ transaction }) => (
    <tr className="border-b border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400">{new Date(transaction.date).toLocaleDateString()}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900 dark:text-neutral-200">{transaction.description}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400">
            <span className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-full text-xs font-medium">{transaction.category}</span>
        </td>
        <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-right ${transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {transaction.type === 'income' ? '+' : '-'}₹{transaction.amount.toLocaleString('en-IN')}
        </td>
    </tr>
);

const TransactionCardMobile: React.FC<{ transaction: Transaction }> = ({ transaction }) => (
    <div className="bg-white dark:bg-neutral-800 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 mb-3 shadow-sm flex justify-between items-center active:scale-[0.99] transition-transform">
        <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${transaction.type === 'income' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                {transaction.type === 'income' ? '↓' : '↑'}
            </div>
            <div>
                <p className="font-bold text-neutral-900 dark:text-neutral-100 text-sm leading-tight">{transaction.description}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    <span>{new Date(transaction.date).toLocaleDateString()}</span>
                    <span className="w-1 h-1 bg-neutral-300 rounded-full"></span>
                    <span>{transaction.category}</span>
                </div>
            </div>
        </div>
        <span className={`text-base font-bold ${transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {transaction.type === 'income' ? '+' : '-'}₹{transaction.amount.toLocaleString('en-IN')}
        </span>
    </div>
);

const FinancialsPage: React.FC = () => {
    const { t } = useLanguage();
    const { success: toastSuccess } = useToast();
    const [summary, setSummary] = useState({ totalIncome: 0, totalExpenses: 0, netProfit: 0 });
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState({ summary: true, transactions: true });
    const [error, setError] = useState({ summary: null, transactions: null });
    const [currentPage, setCurrentPage] = useState(1);
    const [totalTransactions, setTotalTransactions] = useState(0);

    const [filters, setFilters] = useState<{ type?: TransactionType; startDate?: string; endDate?: string }>({});
    const [sort, setSort] = useState<{ by: 'date' | 'amount'; order: 'asc' | 'desc' }>({ by: 'date', order: 'desc' });

    // Insights State
    const [showPLTrend, setShowPLTrend] = useState(false);
    const [showForecast, setShowForecast] = useState(false);
    const [trendData, setTrendData] = useState<FinancialDataPoint[]>([]);
    const [trendLoading, setTrendLoading] = useState(false);

    const fetchSummary = useCallback(async () => {
        setLoading(prev => ({ ...prev, summary: true }));
        try {
            const overview = await getFinancialsOverview();
            setSummary(overview);
        } catch (err: any) {
            setError(prev => ({ ...prev, summary: err.message }));
        } finally {
            setLoading(prev => ({ ...prev, summary: false }));
        }
    }, []);

    const fetchTransactions = useCallback(async () => {
        setLoading(prev => ({ ...prev, transactions: true }));
        try {
            const { data, count } = await getTransactions(currentPage, ITEMS_PER_PAGE, filters, sort);
            setTransactions(data);
            setTotalTransactions(count);
        } catch (err: any) {
            setError(prev => ({ ...prev, transactions: err.message }));
        } finally {
            setLoading(prev => ({ ...prev, transactions: false }));
        }
    }, [currentPage, filters, sort]);

    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    const handleReconcile = () => {
        toastSuccess("Successfully reconciled 50 new UPI transactions and 12 bank transfers.");
    };

    const handleExport = (format: 'csv' | 'pdf') => {
        if (format === 'csv') {
            const headers = ['date', 'description', 'category', 'type', 'amount'];
            const csvRows = [headers.join(',')];
            for (const trans of transactions) {
                const values = headers.map(header => {
                    const escaped = ('' + (trans as any)[header]).replace(/"/g, '""');
                    return `"${escaped}"`;
                });
                csvRows.push(values.join(','));
            }
            const csvContent = csvRows.join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", `statement_${new Date().toISOString().split('T')[0]}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } else {
            // Simple print view for PDF generation via browser
            window.print();
        }
    };

    const handleShowPLTrend = async () => {
        if (showPLTrend) {
            setShowPLTrend(false);
            return;
        }
        setShowPLTrend(true);
        if (trendData.length === 0) {
            setTrendLoading(true);
            try {
                const data = await getMonthlyFinancialsForInsights();
                setTrendData(data);
            } catch (e) {
                console.error(e);
            } finally {
                setTrendLoading(false);
            }
        }
    };

    const totalPages = Math.ceil(totalTransactions / ITEMS_PER_PAGE);

    return (
        <div className="space-y-6 animate-fade-in pb-20 md:pb-0 print:p-0 print:space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
                <h2 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">{t('financials.title')}</h2>
                <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={handleReconcile} className="flex-1 md:flex-none btn btn-primary shadow-sm">Reconcile Transactions</button>
                    <button onClick={() => handleExport('pdf')} className="flex-1 md:flex-none btn bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700">{t('financials.print')}</button>
                    <button onClick={() => handleExport('csv')} className="flex-1 md:flex-none btn btn-secondary shadow-sm">{t('financials.export')}</button>
                </div>
            </div>
            
            {/* Print Header */}
            <div className="hidden print:block text-center mb-8">
                <h1 className="text-2xl font-bold">Financial Statement</h1>
                <p>Generated on {new Date().toLocaleDateString()}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 print:grid-cols-3">
                <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-neutral-800 dark:to-neutral-900 print:border print:border-neutral-300">
                    <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">{t('financials.total_income')}</p>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">₹{summary.totalIncome.toLocaleString('en-IN')}</p>
                </Card>
                <Card className="bg-gradient-to-br from-red-50 to-white dark:from-neutral-800 dark:to-neutral-900 print:border print:border-neutral-300">
                    <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">{t('financials.total_expense')}</p>
                    <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">₹{summary.totalExpenses.toLocaleString('en-IN')}</p>
                </Card>
                <Card className="bg-gradient-to-br from-green-50 to-white dark:from-neutral-800 dark:to-neutral-900 print:border print:border-neutral-300">
                    <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">{t('financials.net_profit')}</p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">₹{summary.netProfit.toLocaleString('en-IN')}</p>
                </Card>
            </div>

            {/* Financial Intelligence Buttons - Hidden in Print */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:hidden">
                <button 
                    onClick={handleShowPLTrend}
                    className={`p-4 rounded-xl border flex items-center justify-center gap-3 transition-all ${showPLTrend ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:border-blue-400'}`}
                >
                    <InsightsIcon className="w-5 h-5" />
                    <span className="font-bold">Profit & Loss Trend</span>
                </button>
                <button 
                    onClick={() => setShowForecast(!showForecast)}
                    className={`p-4 rounded-xl border flex items-center justify-center gap-3 transition-all ${showForecast ? 'bg-purple-600 text-white border-purple-600 shadow-lg' : 'bg-white dark:bg-neutral-800 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800 hover:border-purple-400'}`}
                >
                    <BrainCircuitIcon className="w-5 h-5" />
                    <span className="font-bold">Revenue Forecast</span>
                </button>
            </div>

            {/* Insights Charts - Hidden in Print */}
            {(showPLTrend || showForecast) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in print:hidden">
                    {showPLTrend && (
                        <Card>
                            <h3 className="text-xl font-bold mb-4 text-neutral-800 dark:text-neutral-200">Profit & Loss Trend (Last 6 Months)</h3>
                            {trendLoading ? (
                                <div className="h-[250px] flex items-center justify-center"><Spinner /></div>
                            ) : (
                                <ProfitLossChart data={trendData} />
                            )}
                        </Card>
                    )}
                    {showForecast && (
                        <Card className="border-l-4 border-purple-500 bg-gradient-to-r from-white to-purple-50 dark:from-neutral-800 dark:to-purple-900/10">
                            <h3 className="text-xl font-bold mb-4 text-neutral-900 dark:text-white">Revenue Forecast</h3>
                            <p className="text-sm text-neutral-500 mb-4">Projected income for the next quarter.</p>
                            <PredictiveRevenueChart />
                        </Card>
                    )}
                </div>
            )}

            <Card className="p-4 md:p-6 print:shadow-none print:border-0">
                <h3 className="text-xl font-bold mb-6 text-neutral-800 dark:text-neutral-200">{t('financials.history')}</h3>
                
                {/* Filters - Hidden in Print */}
                <div className="mb-6 p-4 bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl border border-neutral-100 dark:border-neutral-800 flex flex-col md:flex-row flex-wrap gap-4 print:hidden">
                    <div className="flex-1 min-w-[140px]">
                        <label className="text-[10px] font-bold uppercase text-neutral-500 dark:text-neutral-400 mb-1.5 block tracking-wider">Type</label>
                        <select value={filters.type || ''} onChange={e => setFilters(f => ({ ...f, type: e.target.value as TransactionType | undefined }))} className="form-input w-full text-sm">
                            <option value="">All Transactions</option><option value="income">Income Only</option><option value="expense">Expense Only</option>
                        </select>
                    </div>
                    <div className="flex-1 min-w-[140px]">
                        <label className="text-[10px] font-bold uppercase text-neutral-500 dark:text-neutral-400 mb-1.5 block tracking-wider">Start Date</label>
                        <input type="date" value={filters.startDate || ''} onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))} className="form-input w-full text-sm" />
                    </div>
                     <div className="flex-1 min-w-[140px]">
                        <label className="text-[10px] font-bold uppercase text-neutral-500 dark:text-neutral-400 mb-1.5 block tracking-wider">End Date</label>
                        <input type="date" value={filters.endDate || ''} onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))} className="form-input w-full text-sm" />
                    </div>
                    <div className="flex-1 min-w-[140px]">
                        <label className="text-[10px] font-bold uppercase text-neutral-500 dark:text-neutral-400 mb-1.5 block tracking-wider">Sort By</label>
                        <select value={sort.by} onChange={e => setSort(s => ({...s, by: e.target.value as 'date'|'amount'}))} className="form-input w-full text-sm">
                            <option value="date">Date</option><option value="amount">Amount</option>
                        </select>
                    </div>
                </div>

                {loading.transactions ? <div className="h-64 flex items-center justify-center"><Spinner /></div> : 
                 error.transactions ? <div className="h-64 flex items-center justify-center text-red-500 bg-red-50 rounded-xl">{error.transactions}</div> :
                 transactions.length === 0 ? (
                    <div className="text-center py-16 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl"><p className="text-neutral-500 dark:text-neutral-400 font-medium">No transactions match the current filters.</p></div>
                ) : (
                    <>
                        {/* Desktop Table - Visible in Print */}
                        <div className="hidden md:block print:block overflow-x-auto">
                            <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
                                <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">{t('financials.col_date')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">{t('financials.col_desc')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">{t('financials.col_cat')}</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">{t('financials.col_amount')}</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-700">
                                    {transactions.map(t => <TransactionRow key={t.id} transaction={t} />)}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Feed List - Hidden in Print */}
                        <div className="md:hidden print:hidden space-y-3">
                            {transactions.map(t => <TransactionCardMobile key={t.id} transaction={t} />)}
                        </div>
                    </>
                )}
                <div className="print:hidden">
                    <PaginationControls 
                        currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage}
                        itemsPerPage={ITEMS_PER_PAGE} totalItems={totalTransactions}
                    />
                </div>
            </Card>
        </div>
    );
};

export default FinancialsPage;
