import React, { useState } from 'react';
import { AiSuggestion } from '../../types';
import { 
    getAiSuggestions, 
    getDashboardSummary,
    getProperties,
    getTenants,
    getTransactions,
    getMaintenanceRequests
} from '../../services/api';
import Card from '../ui/Card';

const priorityStyles = {
    High: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300',
    Medium: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300',
    Low: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300',
};

const LightbulbIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 9 5c0 1.3.5 2.6 1.5 3.5.7.8 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
);

const AiSuggestions: React.FC = () => {
    const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [wasGenerated, setWasGenerated] = useState(false);

    const handleGenerateSuggestions = async () => {
        setLoading(true);
        setError(null);
        setWasGenerated(true);

        try {
            // Fetch all required data on-demand for the AI context
            const [
                dashboardSummary,
                propertiesData,
                tenantsData,
                transactionsData,
                maintenanceData,
            ] = await Promise.all([
                getDashboardSummary(),
                getProperties(1, 10), // get first 10 properties
                getTenants(1, 20), // get first 20 tenants
                getTransactions(1, 20, {}, {by: 'date', order: 'desc'}), // get recent 20 transactions
                getMaintenanceRequests(1, 20, 'open'), // get recent 20 open requests
            ]);
            
            const contextData = {
                dashboardSummary,
                properties: propertiesData.data.map(({ id, name, unit_count }) => ({ id, name, unit_count })),
                tenants: tenantsData.data.map(({ building_name, house_number }) => ({ building_name, house_number })),
                recentTransactions: transactionsData.data.map(({type, category, amount}) => ({type, category, amount})),
                openMaintenanceRequests: maintenanceData.data.map(({building_name, description}) => ({building_name, description})),
            };

            const result = await getAiSuggestions(contextData);
            setSuggestions(result);
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred while generating suggestions.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2">
                        <LightbulbIcon className="w-6 h-6"/>
                        Portfolio Strategy AI (Gemini Pro)
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">Get actionable advice based on your portfolio's data using advanced reasoning.</p>
                </div>
                <button
                    onClick={handleGenerateSuggestions}
                    disabled={loading}
                    className="mt-4 md:mt-0 bg-blue-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-slate-400 dark:disabled:bg-slate-600 shrink-0"
                >
                    {loading ? 'Analyzing...' : 'Generate Suggestions'}
                </button>
            </div>

            <div className="mt-6">
                {loading && <div className="text-center text-slate-500 dark:text-slate-400">Generating insights... This may take a moment.</div>}
                {error && <div className="text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 p-3 rounded-lg">{error}</div>}
                
                {!loading && !error && suggestions.length > 0 && (
                    <div className="space-y-4">
                        {suggestions.map((suggestion, index) => (
                            <div key={index} className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 animate-fade-in">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-semibold text-blue-900 dark:text-slate-200">{suggestion.title}</h4>
                                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${priorityStyles[suggestion.priority]}`}>{suggestion.priority}</span>
                                </div>
                                <p className="mt-2 text-slate-600 dark:text-slate-400 text-sm">{suggestion.description}</p>
                            </div>
                        ))}
                    </div>
                )}
                 {!loading && !error && suggestions.length === 0 && wasGenerated && (
                    <div className="text-center text-slate-500 dark:text-slate-400">No specific suggestions at this time. Your portfolio looks healthy!</div>
                )}
            </div>
        </Card>
    );
};

export default AiSuggestions;