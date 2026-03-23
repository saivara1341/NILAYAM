
import React from 'react';
import Card from '../ui/Card';
import { DollarSignIcon, ZapIcon, TrendingUpIcon } from '../../constants';

interface YieldMetricProps {
    label: string;
    value: string;
    subValue?: string;
    icon: React.ReactNode;
    color: string;
}

const YieldMetric: React.FC<YieldMetricProps> = ({ label, value, subValue, icon, color }) => (
    <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">{label}</p>
            <p className="text-xl font-black text-neutral-900 dark:text-white">{value}</p>
            {subValue && <p className="text-[10px] font-medium text-green-600 dark:text-green-400 mt-0.5">{subValue}</p>}
        </div>
    </div>
);

const YieldAnalysis: React.FC = () => {
    return (
        <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-xl font-black text-neutral-900 dark:text-white tracking-tight">Portfolio Yield Analysis</h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Actual ROI based on operational performance.</p>
                </div>
                <div className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-[10px] font-black uppercase tracking-widest">
                    Healthy
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <YieldMetric 
                    label="Gross Yield" 
                    value="12.4%" 
                    subValue="+0.8% from last year" 
                    icon={<DollarSignIcon className="w-6 h-6" />} 
                    color="bg-blue-600 shadow-blue-600/20"
                />
                <YieldMetric 
                    label="Net ROI" 
                    value="8.2%" 
                    subValue="Optimized" 
                    icon={<TrendingUpIcon className="w-6 h-6" />} 
                    color="bg-indigo-600 shadow-indigo-600/20"
                />
                <YieldMetric 
                    label="OpEx Ratio" 
                    value="18%" 
                    subValue="Below threshold" 
                    icon={<ZapIcon className="w-6 h-6" />} 
                    color="bg-orange-500 shadow-orange-500/20"
                />
            </div>

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/50 rounded-2xl flex items-start gap-3">
                <div className="p-2 bg-blue-600 text-white rounded-lg shadow-sm mt-1">
                    <TrendingUpIcon className="w-4 h-4" />
                </div>
                <div>
                    <p className="text-sm font-bold text-blue-900 dark:text-blue-100 italic">"Your portfolio's net yield is 1.2% higher than the local market average for residential complexes."</p>
                    <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-1 font-medium">— Nilayam AI Insights</p>
                </div>
            </div>
        </Card>
    );
};

export default YieldAnalysis;
