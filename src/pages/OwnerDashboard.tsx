
import React, { useEffect, useState } from 'react';
import StatCard from '../components/dashboard/StatCard';
import Card from '../components/ui/Card';
import FinancialSummaryChart from '../components/dashboard/FinancialSummaryChart';
import OccupancyChart from '../components/dashboard/OccupancyChart';
import { DashboardSummary, FinancialDataPoint, OccupancyDataPoint } from '../types';
import TodaysFocus from '../components/dashboard/TodaysFocus';
import { PropertiesIcon, UsersIcon, DollarSignIcon, WrenchIcon, ZapIcon, PlusCircleIcon, FileTextIcon, ShieldCheckIcon, CheckCircleIcon, SparklesIcon } from '../constants';
import { Link } from 'react-router-dom';
import AiSuggestions from '../components/insights/AiSuggestions';
import { useLanguage } from '../contexts/LanguageContext';
import PropertyHealthIndex from '../components/dashboard/PropertyHealthIndex';

// Isometric Architecture Icons for Onboarding
const BlueprintIcon = (props: any) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m2 7 10-5 10 5v10l-10 5-10-5V7Z" /><path d="m2 7 10 5 10-5" /><path d="M12 22v-10" /></svg>
);
const ResidentIcon = (props: any) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
);
const LegalIcon = (props: any) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><path d="M8 13h8" /><path d="M8 17h8" /><path d="M10 9H8" /></svg>
);

const DashboardSkeleton: React.FC = () => (
    <div className="space-y-6 p-2 animate-pulse">
        <div className="flex justify-between items-end">
            <div className="skeleton h-10 w-48 rounded-lg"></div>
            <div className="skeleton h-6 w-32 rounded-lg"></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="skeleton h-28 rounded-2xl"></div>
            <div className="skeleton h-28 rounded-2xl"></div>
            <div className="skeleton h-28 rounded-2xl"></div>
            <div className="skeleton h-28 rounded-2xl"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 skeleton h-80 rounded-2xl"></div>
            <div className="skeleton h-80 rounded-2xl"></div>
        </div>
    </div>
);

const SetupGuide: React.FC<{ summary: DashboardSummary }> = ({ summary }) => {
    const { t } = useLanguage();
    // Stage Tracking
    const isStep1Done = summary.totalProperties > 0;
    const isStep2Done = summary.totalUnits > 0 && summary.occupancyRate > 0;

    // We use localStorage to track if they've ever navigated to draft a lease 
    // to provide a persistent "completion" feel for Step 3
    const [isStep3Done, setIsStep3Done] = useState(() => localStorage.getItem('onboarding_lease_done') === 'true');

    useEffect(() => {
        // Simple listener to update step 3 if they interact with the lease tool
        const checkLease = () => {
            if (localStorage.getItem('onboarding_lease_done') === 'true') {
                setIsStep3Done(true);
            }
        };
        window.addEventListener('storage', checkLease);
        const interval = setInterval(checkLease, 2000);
        return () => {
            window.removeEventListener('storage', checkLease);
            clearInterval(interval);
        };
    }, []);

    // Guide disappears only after all 3 stages are truly completed
    if (isStep1Done && isStep2Done && isStep3Done) return null;

    return (
        <div className="relative mb-12 animate-fade-in">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/5 to-indigo-600/5 blur-3xl -z-10 rounded-[3rem]"></div>

            <div className="bg-white/40 dark:bg-neutral-900/40 backdrop-blur-2xl border border-white/40 dark:border-white/5 rounded-[2.5rem] p-8 md:p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)]">
                <div className="max-w-3xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                        <SparklesIcon className="w-3 h-3" /> Get Started
                    </div>
                    <h3 className="text-3xl md:text-4xl font-black text-neutral-900 dark:text-white tracking-tight mb-2">Welcome to Nilayam! 🚀</h3>
                    <p className="text-neutral-500 dark:text-neutral-400 text-lg font-medium mb-10">Your digital property empire is ready for construction. Complete the foundation in 3 steps.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Stage 1: Add Property */}
                    <div className={`relative group p-6 rounded-3xl transition-all duration-500 border-2 ${isStep1Done ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200/50' : 'bg-white dark:bg-neutral-800 border-neutral-100 dark:border-neutral-700 hover:border-blue-300 dark:hover:border-blue-800 hover:shadow-2xl hover:-translate-y-1'}`}>
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500 ${isStep1Done ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 group-hover:scale-110'}`}>
                            {isStep1Done ? <CheckCircleIcon className="w-8 h-8" /> : <BlueprintIcon className="w-8 h-8" />}
                        </div>
                        <h4 className={`text-xl font-black tracking-tight mb-2 ${isStep1Done ? 'text-green-800 dark:text-green-300' : 'text-neutral-900 dark:text-white'}`}>1. Add Property</h4>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed mb-8">Establish your first building or land plot using our AI Architect.</p>
                        {!isStep1Done ? (
                            <div className="flex flex-col gap-3">
                                <Link to="/properties" state={{ openAddModal: true }} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white text-sm font-black rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95">
                                    <PlusCircleIcon className="w-4 h-4" /> {t('properties.add_btn').toUpperCase()}
                                </Link>
                                <Link to="/properties" state={{ openAddModal: true }} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-black rounded-xl hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-all border border-indigo-200/50 dark:border-indigo-800/50 active:scale-95">
                                    <SparklesIcon className="w-4 h-4" /> {t('properties.ai_btn').toUpperCase()}
                                </Link>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-xs font-bold text-green-600 uppercase tracking-widest">
                                <CheckCircleIcon className="w-4 h-4" /> Foundation Set
                            </div>
                        )}
                    </div>

                    {/* Stage 2: Add Tenants */}
                    <div className={`relative group p-6 rounded-3xl transition-all duration-500 border-2 ${!isStep1Done ? 'opacity-40 grayscale pointer-events-none' : (isStep2Done ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200/50' : 'bg-white dark:bg-neutral-800 border-neutral-100 dark:border-neutral-700 hover:border-blue-300 dark:hover:border-blue-800 hover:shadow-2xl hover:-translate-y-1')}`}>
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500 ${isStep2Done ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 group-hover:scale-110'}`}>
                            {isStep2Done ? <CheckCircleIcon className="w-8 h-8" /> : <ResidentIcon className="w-8 h-8" />}
                        </div>
                        <h4 className={`text-xl font-black tracking-tight mb-2 ${isStep2Done ? 'text-green-800 dark:text-green-300' : 'text-neutral-900 dark:text-white'}`}>2. Add Tenants</h4>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed mb-8">Onboard residents to your units to begin tracking real-time occupancy.</p>
                        {isStep1Done && !isStep2Done ? (
                            <Link to="/tenants" className="inline-flex items-center gap-2 text-sm font-black text-indigo-600 hover:gap-3 transition-all">
                                INVITE RESIDENTS &rarr;
                            </Link>
                        ) : (
                            <div className="flex items-center gap-2 text-xs font-bold text-green-600 uppercase tracking-widest">
                                {isStep2Done ? <><CheckCircleIcon className="w-4 h-4" /> Fully Occupied</> : 'Locked'}
                            </div>
                        )}
                    </div>

                    {/* Stage 3: Draft Lease */}
                    <div className={`relative group p-6 rounded-3xl transition-all duration-500 border-2 ${!isStep2Done ? 'opacity-40 grayscale pointer-events-none' : (isStep3Done ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200/50' : 'bg-white dark:bg-neutral-800 border-neutral-100 dark:border-neutral-700 hover:border-blue-300 dark:hover:border-blue-800 hover:shadow-2xl hover:-translate-y-1')}`}>
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500 ${isStep3Done ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 group-hover:scale-110'}`}>
                            {isStep3Done ? <CheckCircleIcon className="w-8 h-8" /> : <LegalIcon className="w-8 h-8" />}
                        </div>
                        <h4 className={`text-xl font-black tracking-tight mb-2 ${isStep3Done ? 'text-green-800 dark:text-green-300' : 'text-neutral-900 dark:text-white'}`}>3. Draft Lease</h4>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed mb-8">Generate legally sound agreements using Gemini AI instantly.</p>
                        {isStep2Done && !isStep3Done ? (
                            <Link
                                to="/tenants"
                                onClick={() => {
                                    // We flag this so the guide knows they've engaged with step 3
                                    localStorage.setItem('onboarding_lease_done', 'true');
                                }}
                                className="inline-flex items-center gap-2 text-sm font-black text-purple-600 hover:gap-3 transition-all"
                            >
                                GENERATE LEGAL &rarr;
                            </Link>
                        ) : (
                            <div className="flex items-center gap-2 text-xs font-bold text-green-600 uppercase tracking-widest">
                                {isStep3Done ? <><CheckCircleIcon className="w-4 h-4" /> Legally Secure</> : 'Locked'}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const QuickActionBtn: React.FC<{ to: string; icon: React.ReactNode; label: string; subLabel: string; colorClass: string; iconBgClass: string; delay: string }> = React.memo(({ to, icon, label, subLabel, colorClass, iconBgClass, delay }) => (
    <Link
        to={to}
        style={{ animationDelay: delay }}
        className="group relative flex flex-col p-4 bg-white dark:bg-neutral-800 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm hover:shadow-xl transition-all duration-500 active:scale-[0.97] overflow-hidden h-full min-h-[120px] justify-between animate-fade-in-up opacity-0"
    >
        <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-5 group-hover:opacity-10 transition-opacity duration-500 ${colorClass}`}></div>
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-3 text-white shadow-sm ${iconBgClass} group-hover:scale-105 transition-transform duration-500`}>
            {React.cloneElement(icon as React.ReactElement<any>, { className: "w-5 h-5" })}
        </div>
        <div className="relative z-10">
            <span className="block font-black text-sm text-neutral-900 dark:text-neutral-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight line-clamp-1">{label}</span>
            <span className="block text-[11px] font-bold text-neutral-500 dark:text-neutral-400 mt-1 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors leading-tight line-clamp-2">{subLabel}</span>
        </div>
    </Link>
));

import { useData } from '../contexts/DataContext';

const OwnerDashboard: React.FC = () => {
    const { t } = useLanguage();
    const { 
        dashboardSummary: summary, 
        financialData, 
        occupancyData, 
        loadingDashboard: loading, 
        dashboardError
    } = useData();

    if (loading && !summary) return <DashboardSkeleton />;

    return (
        <div className="space-y-10 animate-fade-in pb-safe pt-2">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-fade-in-up" style={{ animationDelay: '0ms' }}>
                <div>
                    <h2 className="text-2xl md:text-4xl font-black text-neutral-900 dark:text-white tracking-tight leading-tight">{t('dashboard.title')}</h2>
                    <p className="text-neutral-500 dark:text-neutral-400 mt-1 text-sm md:text-base font-medium">{t('dashboard.subtitle')}</p>
                </div>
                <div className="text-[11px] font-black px-5 py-2.5 bg-white dark:bg-neutral-800 rounded-2xl text-neutral-700 dark:text-neutral-300 border border-neutral-100 dark:border-neutral-700 shadow-sm self-start md:self-auto uppercase tracking-[0.1em]">
                    {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
            </div>

            {dashboardError && (
                <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900 shadow-sm dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-200">
                    <p className="text-sm font-bold">Dashboard data could not load.</p>
                    <p className="mt-1 text-sm opacity-90">{dashboardError}</p>
                </div>
            )}

            {summary && <SetupGuide summary={summary} />}

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <QuickActionBtn
                    to="/community"
                    icon={<ShieldCheckIcon />}
                    label={t('qa.gate_pass')}
                    subLabel={t('qa.gate_pass_sub')}
                    colorClass="bg-green-500"
                    iconBgClass="bg-gradient-to-br from-green-500 to-green-600"
                    delay="100ms"
                />
                <QuickActionBtn
                    to="/tenants"
                    icon={<PlusCircleIcon />}
                    label={t('qa.add_tenant')}
                    subLabel={t('qa.add_tenant_sub')}
                    colorClass="bg-indigo-500"
                    iconBgClass="bg-gradient-to-br from-indigo-500 to-indigo-600"
                    delay="200ms"
                />
                <QuickActionBtn
                    to="/tenants"
                    icon={<FileTextIcon />}
                    label={t('qa.draft_lease')}
                    subLabel={t('qa.draft_lease_sub')}
                    colorClass="bg-purple-500"
                    iconBgClass="bg-gradient-to-br from-purple-500 to-purple-600"
                    delay="300ms"
                />
                <QuickActionBtn
                    to="/financials"
                    icon={<DollarSignIcon />}
                    label={t('qa.log_expense')}
                    subLabel={t('qa.log_expense_sub')}
                    colorClass="bg-rose-500"
                    iconBgClass="bg-gradient-to-br from-rose-500 to-rose-600"
                    delay="400ms"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-12">
                    <div className="animate-fade-in-up opacity-0" style={{ animationDelay: '500ms' }}>
                        <TodaysFocus />
                    </div>

                    <div className="animate-fade-in-up opacity-0" style={{ animationDelay: '600ms' }}>
                        <AiSuggestions />
                    </div>

                    <div className="pt-2 animate-fade-in-up opacity-0" style={{ animationDelay: '700ms' }}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-3">
                                <DollarSignIcon className="w-8 h-8 text-blue-600" />
                                {t('dashboard.financial_trends')}
                            </h3>
                            <select className="text-xs font-black uppercase tracking-widest border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-2xl text-neutral-500 px-4 py-2 focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer">
                                <option>{t('time.last_6_months')}</option>
                                <option>{t('time.last_year')}</option>
                            </select>
                        </div>
                        <Card className="p-6 sm:p-10 hover:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] transition-all duration-700 rounded-[2.5rem]">
                            <FinancialSummaryChart data={financialData} />
                        </Card>
                    </div>
                </div>

                <div className="space-y-12">
                    <div className="animate-fade-in-up opacity-0" style={{ animationDelay: '750ms' }}>
                        <PropertyHealthIndex summary={summary} />
                    </div>

                    <div className="animate-fade-in-up opacity-0" style={{ animationDelay: '800ms' }}>
                        <h3 className="text-2xl font-black text-neutral-900 dark:text-white mb-6 tracking-tight flex items-center gap-3">
                            <ZapIcon className="w-8 h-8 text-orange-500" />
                            {t('dashboard.key_metrics')}
                        </h3>
                        <div className="grid grid-cols-1 gap-5">
                            <StatCard label={t('metric.total_properties')} value={summary?.totalProperties.toString() ?? '0'} icon={<PropertiesIcon className="w-5 h-5" />} linkTo="/properties" />
                            <StatCard label={t('metric.occupancy_rate')} value={`${summary?.occupancyRate ?? 0}%`} icon={<UsersIcon className="w-5 h-5" />} linkTo="/tenants" />
                            <StatCard label={t('metric.monthly_revenue')} value={`₹${summary?.totalRevenue.toLocaleString('en-IN') ?? '0'}`} icon={<DollarSignIcon className="w-5 h-5" />} linkTo="/financials" />
                            <StatCard
                                label={t('metric.outstanding_dues')}
                                value={`₹${summary?.outstandingPayments.toLocaleString('en-IN') ?? '0'}`}
                                icon={<DollarSignIcon className="w-5 h-5 text-white" />}
                                isWarning
                                linkTo="/financials"
                                customColor="bg-gradient-to-r from-red-500 to-red-600 text-white border-red-600 shadow-xl shadow-red-500/20"
                            />
                            <StatCard
                                label={t('metric.active_helpdesk')}
                                value={summary?.maintenanceRequests.toString() ?? '0'}
                                icon={<WrenchIcon className="w-5 h-5" />}
                                isWarning={summary && summary.maintenanceRequests > 0}
                                linkTo="/maintenance"
                            />
                        </div>
                    </div>

                    <div className="animate-fade-in-up opacity-0" style={{ animationDelay: '900ms' }}>
                        <h3 className="text-2xl font-black text-neutral-900 dark:text-white mb-6 tracking-tight flex items-center gap-3">
                            <UsersIcon className="w-8 h-8 text-indigo-500" />
                            {t('dashboard.occupancy')}
                        </h3>
                        <Card className="hover:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] transition-all duration-700 rounded-[2.5rem]">
                            <OccupancyChart data={occupancyData} />
                        </Card>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeInUp {
                    from { 
                        opacity: 0; 
                        transform: translateY(30px); 
                    }
                    to { 
                        opacity: 1; 
                        transform: translateY(0); 
                    }
                }
                .animate-fade-in-up {
                    animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </div>
    );
};

export default OwnerDashboard;
