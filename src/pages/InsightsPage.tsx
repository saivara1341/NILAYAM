import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import AiSuggestions from '../components/insights/AiSuggestions';
import ProfitLossChart from '../components/insights/ProfitLossChart';
import MaintenanceHotspots from '../components/insights/MaintenanceHotspots';
import LeaseExpiryTracker from '../components/insights/LeaseExpiryTracker';
import VacancyManager from '../components/insights/VacancyManager';
import YieldAnalysis from '../components/insights/YieldAnalysis';
import RentOptimizer from '../components/insights/RentOptimizer';
import { FinancialDataPoint, LeaseExpiry, AiSuggestion } from '../types';
import { getMonthlyFinancialsForInsights, getUpcomingLeaseExpiries, getAllMaintenanceRequests, analyzeMaintenanceForSuggestions } from '../services/api';
import Spinner from '../components/ui/Spinner';
import { BrainCircuitIcon } from '../constants';

const PreventativeMaintenance: React.FC = () => {
    const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [wasGenerated, setWasGenerated] = useState(false);

    const handleGenerate = async () => {
        setLoading(true);
        setError(null);
        setWasGenerated(true);
        try {
            const maintenanceData = await getAllMaintenanceRequests();
            if (maintenanceData.length === 0) {
                setSuggestions([]);
                return;
            }
            const result = await analyzeMaintenanceForSuggestions(maintenanceData);
            setSuggestions(result);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <Card>
            <h3 className="text-xl font-semibold mb-2 text-neutral-800 dark:text-neutral-200">Preventative Maintenance AI</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">Analyze patterns in maintenance requests to identify potential issues before they become major problems.</p>
            <button onClick={handleGenerate} disabled={loading} className="btn btn-secondary">
                {loading ? 'Analyzing Data...' : 'Generate Analysis'}
            </button>
            <div className="mt-4">
                {loading && <Spinner />}
                {error && <p className="text-red-500">{error}</p>}
                {suggestions.length > 0 && (
                    <div className="space-y-2">
                        {suggestions.map((s, i) => (
                            <div key={i} className="p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
                                <h4 className="font-semibold text-neutral-800 dark:text-neutral-200">{s.title}</h4>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400">{s.description}</p>
                            </div>
                        ))}
                    </div>
                )}
                {!loading && wasGenerated && suggestions.length === 0 && <p className="text-sm text-neutral-500">No significant patterns found to suggest preventative actions at this time.</p>}
            </div>
        </Card>
    );
}

const StrategyHubPage: React.FC = () => {
    const [financials, setFinancials] = useState<{data: FinancialDataPoint[], loading: boolean, error: string | null}>({ data: [], loading: true, error: null });
    const [leases, setLeases] = useState<{data: LeaseExpiry[], loading: boolean, error: string | null}>({ data: [], loading: true, error: null });

    useEffect(() => {
        const fetchInsightsData = async () => {
            const [financialsResult, leasesResult] = await Promise.allSettled([
                getMonthlyFinancialsForInsights(),
                getUpcomingLeaseExpiries()
            ]);

            if (financialsResult.status === 'fulfilled') {
                setFinancials({ data: financialsResult.value, loading: false, error: null });
            } else {
                setFinancials({ data: [], loading: false, error: (financialsResult.reason as Error).message });
            }

            if (leasesResult.status === 'fulfilled') {
                setLeases({ data: leasesResult.value, loading: false, error: null });
            } else {
                setLeases({ data: [], loading: false, error: (leasesResult.reason as Error).message });
            }
        };
        fetchInsightsData();
    }, []);

    const renderComponent = <T,>(state: { data: T[], loading: boolean, error: string | null }, Component: React.FC<{ data: T[] }>) => {
        if (state.loading) return <div className="flex items-center justify-center h-[300px] text-neutral-500 dark:text-neutral-400">Loading data...</div>;
        if (state.error) return <div className="flex items-center justify-center h-[300px] text-red-500 dark:text-red-400 text-center p-4">{state.error}</div>;
        return <Component data={state.data} />;
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                 <h2 className="text-3xl font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-3">
                    <BrainCircuitIcon className="h-8 w-8 text-primary"/>
                    Strategy & AI Hub
                </h2>
                <p className="mt-2 text-neutral-500 dark:text-neutral-400 max-w-3xl">Leverage AI-powered insights and autonomous agents to optimize your portfolio and automate complex tasks.</p>
            </div>
            
            <AiSuggestions />
            
            <YieldAnalysis />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RentOptimizer />
                <VacancyManager />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <h3 className="text-xl font-semibold mb-4 text-neutral-800 dark:text-neutral-200">Profit & Loss Trend (Last 6 Months)</h3>
                    {renderComponent(financials, ProfitLossChart)}
                </Card>
                <Card>
                    <h3 className="text-xl font-semibold mb-4 text-neutral-800 dark:text-neutral-200">Maintenance Hotspots (Top 5)</h3>
                    <MaintenanceHotspots />
                </Card>
            </div>

            <Card>
                <h3 className="text-xl font-semibold mb-4 text-neutral-800 dark:text-neutral-200">Upcoming Lease Expiries (Next 90 Days)</h3>
                {renderComponent(leases, LeaseExpiryTracker)}
            </Card>

        </div>
    );
};

export default StrategyHubPage;