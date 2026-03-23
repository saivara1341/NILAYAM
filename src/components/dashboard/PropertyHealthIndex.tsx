
import React from 'react';
import Card from '../ui/Card';
import { BadgeCheckIcon, UsersIcon, DollarSignIcon, WrenchIcon } from '../../constants';
import { DashboardSummary } from '../../types';

interface PropertyHealthIndexProps {
    summary?: DashboardSummary | null;
}

const PropertyHealthIndex: React.FC<PropertyHealthIndexProps> = ({ summary }) => {
    const occupancyRate = Math.max(0, Math.min(100, Math.round(summary?.occupancyRate ?? 0)));
    const outstandingPayments = Number(summary?.outstandingPayments ?? 0);
    const collectedRevenue = Number(summary?.totalRevenue ?? 0);
    const collectionRateBase = collectedRevenue + outstandingPayments;
    const collectionRate = collectionRateBase > 0
        ? Math.round((collectedRevenue / collectionRateBase) * 1000) / 10
        : 0;
    const maintenancePending = Math.max(0, Number(summary?.maintenanceRequests ?? 0));
    const complianceRate = Math.max(0, Math.min(100, Math.round((occupancyRate * 0.35) + (collectionRate * 0.45) + (Math.max(0, 100 - maintenancePending * 12) * 0.20))));
    const healthScore = Math.round((occupancyRate * 0.4) + (collectionRate * 0.4) + (Math.max(0, 100 - maintenancePending * 10) * 0.2));
    const healthLabel = healthScore >= 85 ? 'Optimal' : healthScore >= 65 ? 'Stable' : 'Needs Attention';
    
    return (
        <Card className="overflow-hidden border-none shadow-xl bg-gradient-to-br from-neutral-900 to-indigo-950 p-6">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h3 className="text-lg font-black text-white tracking-tight">Property Health Index</h3>
                    <p className="text-xs text-indigo-300/60 font-medium">Real-time portfolio vitality score</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10">
                    <BadgeCheckIcon className="w-3 h-3 text-blue-400" />
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Premium Insights</span>
                </div>
            </div>

            <div className="flex flex-col items-center justify-center mb-8 relative">
                {/* Score Circle */}
                <div className="relative w-40 h-40 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle
                            cx="80"
                            cy="80"
                            r="70"
                            stroke="currentColor"
                            strokeWidth="12"
                            fill="transparent"
                            className="text-white/5"
                        />
                        <circle
                            cx="80"
                            cy="80"
                            r="70"
                            stroke="currentColor"
                            strokeWidth="12"
                            fill="transparent"
                            strokeDasharray={440}
                            strokeDashoffset={440 - (440 * healthScore) / 100}
                            strokeLinecap="round"
                            className="text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)] transition-all duration-1000 ease-out"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-5xl font-black text-white">{healthScore}</span>
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{healthLabel}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-2 mb-1">
                        <UsersIcon className="w-3 h-3 text-indigo-400" />
                        <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">Occupancy</span>
                    </div>
                    <p className="text-sm font-black text-white">{occupancyRate}%</p>
                </div>
                <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-2 mb-1">
                        <DollarSignIcon className="w-3 h-3 text-green-400" />
                        <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">Collection</span>
                    </div>
                    <p className="text-sm font-black text-white">{collectionRate.toFixed(1)}%</p>
                </div>
                <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-2 mb-1">
                        <WrenchIcon className="w-3 h-3 text-orange-400" />
                        <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">Maintenance</span>
                    </div>
                    <p className="text-sm font-black text-white">{maintenancePending} Pending</p>
                </div>
                <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-2 mb-1">
                        <BadgeCheckIcon className="w-3 h-3 text-blue-400" />
                        <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">Compliance</span>
                    </div>
                    <p className="text-sm font-black text-white">{complianceRate}%</p>
                </div>
            </div>
            
            <button className="w-full mt-6 py-3 bg-white/10 hover:bg-white/15 text-white text-[10px] font-black rounded-xl transition-all uppercase tracking-[0.2em] border border-white/5 active:scale-95">
                Full Vitality Report &rarr;
            </button>
        </Card>
    );
};

export default PropertyHealthIndex;
