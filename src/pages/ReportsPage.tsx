
import React, { useState } from 'react';
import Card from '../components/ui/Card';
import { getRentRollData } from '../services/api'; // Placeholder for other report functions
import { FinancialAnalyticsIcon, DollarSignIcon, BuildingIcon, ShieldCheckIcon } from '../constants';
import Spinner from '../components/ui/Spinner';

type ReportType = 'rent_roll' | 'profit_loss' | 'expense_summary' | 'audit_compliance';

// --- Generic CSV Downloader ---
const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
        alert("No data available to generate this report.");
        return;
    }
    const headers = Object.keys(data[0]);
    const csvRows = [
        headers.join(','),
        ...data.map(row => 
            headers.map(header => {
                const value = row[header];
                const escaped = ('' + value).replace(/"/g, '""');
                return `"${escaped}"`;
            }).join(',')
        )
    ];
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


const ReportCard: React.FC<{
    title: string;
    description: string;
    icon: React.ReactNode;
    onGenerate: () => Promise<void>;
    loading: boolean;
}> = ({ title, description, icon, onGenerate, loading }) => (
    <Card className="flex flex-col">
        <div className="flex items-start space-x-4">
            <div className="bg-blue-100 dark:bg-blue-900/40 p-3 rounded-lg">
                {icon}
            </div>
            <div>
                <h3 className="text-lg font-bold text-blue-900 dark:text-slate-200">{title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{description}</p>
            </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex-grow flex items-end">
            <button
                onClick={onGenerate}
                disabled={loading}
                className="w-full bg-blue-800 dark:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-900 dark:hover:bg-blue-700 transition-colors disabled:bg-slate-400"
            >
                {loading ? <Spinner/> : 'Generate & Download CSV'}
            </button>
        </div>
    </Card>
);

const ReportsPage: React.FC = () => {
    const [loadingReport, setLoadingReport] = useState<ReportType | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleGenerateReport = async (type: ReportType) => {
        setLoadingReport(type);
        setError(null);
        try {
            switch (type) {
                case 'rent_roll':
                    const rentRollData = await getRentRollData();
                    downloadCSV(rentRollData, 'rent_roll_report');
                    break;
                case 'profit_loss':
                    // const pnlData = await getProfitLossData();
                    // downloadCSV(pnlData, 'profit_loss_report');
                    alert("Profit & Loss report is not yet available.");
                    break;
                case 'expense_summary':
                    // const expenseData = await getExpenseSummaryData();
                    // downloadCSV(expenseData, 'expense_summary_report');
                    alert("Expense Summary report is not yet available.");
                    break;
                case 'audit_compliance':
                    alert("Audit & Compliance report is not yet available.");
                    break;
            }
        } catch (err: any) {
            setError(err.message);
            alert(`Failed to generate report: ${err.message}`);
        } finally {
            setLoadingReport(null);
        }
    };
    

    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-3xl font-bold text-blue-900 dark:text-slate-200">Reports Hub</h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl">
                Generate detailed reports for your properties to gain deeper insights into your portfolio's performance. Download data as CSV for further analysis.
            </p>

            {error && <div className="p-4 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 rounded-lg">{error}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <ReportCard
                    title="Rent Roll Report"
                    description="A detailed list of all units, showing tenant names, rent amounts, lease dates, and occupancy status."
                    icon={<BuildingIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />}
                    onGenerate={() => handleGenerateReport('rent_roll')}
                    loading={loadingReport === 'rent_roll'}
                />
                <ReportCard
                    title="Profit & Loss Statement"
                    description="Summarizes income and expenses over a selected period to show your net profit or loss."
                    icon={<FinancialAnalyticsIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />}
                    onGenerate={() => handleGenerateReport('profit_loss')}
                    loading={loadingReport === 'profit_loss'}
                />
                <ReportCard
                    title="Expense Summary"
                    description="A breakdown of all your expenses categorized by type (e.g., maintenance, utilities, taxes)."
                    icon={<DollarSignIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />}
                    onGenerate={() => handleGenerateReport('expense_summary')}
                    loading={loadingReport === 'expense_summary'}
                />
                <ReportCard
                    title="Audit & Compliance Report"
                    description="Generate GST/compliance-friendly ledgers and audit exports for treasurers and auditors."
                    icon={<ShieldCheckIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />}
                    onGenerate={() => handleGenerateReport('audit_compliance')}
                    loading={loadingReport === 'audit_compliance'}
                />
            </div>
        </div>
    );
};

export default ReportsPage;
