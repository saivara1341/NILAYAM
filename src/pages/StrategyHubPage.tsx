
import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import AiSuggestions from '../components/insights/AiSuggestions';
import ProfitLossChart from '../components/insights/ProfitLossChart';
import MaintenanceHotspots from '../components/insights/MaintenanceHotspots';
import LeaseExpiryTracker from '../components/insights/LeaseExpiryTracker';
import VacancyManager from '../components/insights/VacancyManager';
import MarketTrends from '../components/insights/MarketTrends';
import PredictiveRevenueChart from '../components/insights/PredictiveRevenueChart'; // New Import
import { FinancialDataPoint, LeaseExpiry, AiSuggestion } from '../types';
import { getMonthlyFinancialsForInsights, getUpcomingLeaseExpiries, getAllMaintenanceRequests, analyzeMaintenanceForSuggestions } from '../services/api';
import Spinner from '../components/ui/Spinner';
import { BrainCircuitIcon } from '../constants';

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
        <div className="space-y-8 animate-fade-in pb-20">
            <div>
                 <h2 className="text-3xl font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-3">
                    <BrainCircuitIcon className="h-8 w-8 text-primary"/>
                    Strategy & AI Hub
                </h2>
                <p className="mt-2 text-neutral-500 dark:text-neutral-400 max-w-3xl">Leverage advanced predictive analytics and autonomous agents to optimize your portfolio.</p>
            </div>
            
            {/* New Predictive Section */}
            <Card className="border-l-4 border-purple-500 bg-gradient-to-r from-white to-purple-50 dark:from-neutral-800 dark:to-purple-900/10">
                <h3 className="text-xl font-semibold mb-4 text-neutral-900 dark:text-white">Revenue Forecast (AI Linear Regression)</h3>
                <p className="text-sm text-neutral-500 mb-4">Projected income for the next quarter based on historical data trends.</p>
                <PredictiveRevenueChart />
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AiSuggestions />
                <MarketTrends />
            </div>
            
            <VacancyManager />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <h3 className="text-xl font-semibold mb-4 text-neutral-800 dark:text-neutral-200">Profit & Loss Trend</h3>
                    {renderComponent(financials, ProfitLossChart)}
                </Card>
                <Card>
                    <h3 className="text-xl font-semibold mb-4 text-neutral-800 dark:text-neutral-200">Maintenance Hotspots</h3>
                    <MaintenanceHotspots />
                </Card>
            </div>

            <Card>
                <h3 className="text-xl font-semibold mb-4 text-neutral-800 dark:text-neutral-200">Upcoming Lease Expiries</h3>
                {renderComponent(leases, LeaseExpiryTracker)}
            </Card>

        </div>
    );
};

export default StrategyHubPage;
