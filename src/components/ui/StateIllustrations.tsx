import React from 'react';
import { BellIcon, BuildingIcon, CheckCircleIcon, CreditCardIcon, UserCircleIcon, WrenchIcon } from '@/constants';

const Orb: React.FC<{ className: string }> = ({ className }) => (
    <div className={`absolute rounded-full blur-2xl ${className}`} />
);

const Frame: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/90 shadow-[0_20px_50px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900/90 ${className}`}>
        {children}
    </div>
);

export const WaitingHomeIllustration: React.FC = () => (
    <div className="relative mx-auto h-56 w-64">
        <Orb className="left-4 top-4 h-28 w-28 bg-sky-400/20 dark:bg-sky-500/15" />
        <Orb className="right-4 bottom-5 h-24 w-24 bg-emerald-400/20 dark:bg-emerald-500/15" />
        <div className="absolute left-7 top-7 h-36 w-36 animate-[floatSoft_6s_ease-in-out_infinite] rounded-[2rem] border border-slate-200/80 bg-white/95 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900/90">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-sky-100 via-white to-emerald-100 text-sky-600 shadow-inner dark:from-sky-900/40 dark:via-slate-900 dark:to-emerald-900/30 dark:text-sky-300">
                <BuildingIcon className="h-8 w-8" />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
                <div className="h-8 rounded-2xl bg-slate-100 dark:bg-slate-800" />
                <div className="h-8 rounded-2xl bg-slate-100 dark:bg-slate-800" />
                <div className="h-8 rounded-2xl bg-slate-100 dark:bg-slate-800" />
            </div>
            <div className="mt-3 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700" />
            <div className="mt-2 h-2.5 w-4/5 rounded-full bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="absolute bottom-6 right-5 animate-[floatMid_7s_ease-in-out_infinite] rounded-[1.75rem] border border-emerald-200/80 bg-emerald-50/95 p-4 shadow-[0_18px_40px_rgba(16,185,129,0.15)] dark:border-emerald-900/40 dark:bg-emerald-950/40">
            <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-300">
                    <CheckCircleIcon className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                    <div className="h-2.5 w-20 rounded-full bg-emerald-200 dark:bg-emerald-800" />
                    <div className="h-2.5 w-14 rounded-full bg-emerald-200/80 dark:bg-emerald-800/80" />
                </div>
            </div>
        </div>
    </div>
);

export const EmptyInboxIllustration: React.FC = () => (
    <div className="relative mx-auto h-40 w-44">
        <Orb className="left-6 top-6 h-20 w-20 bg-violet-400/20 dark:bg-violet-500/15" />
        <Frame className="absolute inset-x-3 top-5 p-4 animate-[floatSoft_6.5s_ease-in-out_infinite]">
            <div className="flex items-center justify-between">
                <BellIcon className="h-5 w-5 text-indigo-500" />
                <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Clear</span>
            </div>
            <div className="mt-4 space-y-2">
                <div className="h-2.5 rounded-full bg-slate-200 dark:bg-slate-700" />
                <div className="h-2.5 w-2/3 rounded-full bg-slate-200 dark:bg-slate-700" />
            </div>
        </Frame>
    </div>
);

export const EmptyLedgerIllustration: React.FC = () => (
    <div className="relative mx-auto h-40 w-52">
        <Orb className="right-6 top-2 h-24 w-24 bg-cyan-400/20 dark:bg-cyan-500/15" />
        <Frame className="absolute inset-x-0 top-6 p-4 animate-[floatMid_7.2s_ease-in-out_infinite]">
            <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-cyan-100 p-3 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-300">
                    <CreditCardIcon className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Ledger</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Charges will appear here</p>
                </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="h-12 rounded-2xl bg-slate-100 dark:bg-slate-800" />
                <div className="h-12 rounded-2xl bg-slate-100 dark:bg-slate-800" />
                <div className="h-12 rounded-2xl bg-slate-100 dark:bg-slate-800" />
            </div>
        </Frame>
    </div>
);

export const QuietMaintenanceIllustration: React.FC = () => (
    <div className="relative mx-auto h-40 w-44">
        <Orb className="left-8 top-6 h-20 w-20 bg-emerald-400/20 dark:bg-emerald-500/15" />
        <Frame className="absolute inset-x-2 top-5 p-4 animate-[floatSoft_5.8s_ease-in-out_infinite]">
            <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
                    <WrenchIcon className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Maintenance</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Everything looks calm</p>
                </div>
            </div>
        </Frame>
    </div>
);

export const EmptyPeopleIllustration: React.FC = () => (
    <div className="relative mx-auto h-44 w-48">
        <Orb className="left-2 top-8 h-24 w-24 bg-blue-400/20 dark:bg-blue-500/15" />
        <Orb className="right-0 bottom-4 h-20 w-20 bg-violet-400/20 dark:bg-violet-500/15" />
        <Frame className="absolute left-4 top-6 w-32 p-4 animate-[floatSoft_6.4s_ease-in-out_infinite]">
            <UserCircleIcon className="h-10 w-10 text-blue-600 dark:text-blue-300" />
            <div className="mt-3 h-2.5 w-16 rounded-full bg-slate-200 dark:bg-slate-700" />
            <div className="mt-2 h-2.5 w-12 rounded-full bg-slate-200 dark:bg-slate-700" />
        </Frame>
        <Frame className="absolute bottom-4 right-2 w-28 p-3 animate-[floatMid_7s_ease-in-out_infinite]">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Residents</p>
            <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white">Ready to add</p>
        </Frame>
    </div>
);

export const ProfileLoadingIllustration: React.FC = () => (
    <div className="relative mx-auto h-48 w-56">
        <Orb className="left-5 top-8 h-24 w-24 bg-blue-400/20 dark:bg-blue-500/15" />
        <Orb className="right-4 bottom-6 h-20 w-20 bg-cyan-400/20 dark:bg-cyan-500/15" />
        <Frame className="absolute left-4 top-6 w-36 p-4 animate-[floatSoft_6.2s_ease-in-out_infinite]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                <UserCircleIcon className="h-8 w-8" />
            </div>
            <div className="mt-4 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700" />
            <div className="mt-2 h-2.5 w-2/3 rounded-full bg-slate-200 dark:bg-slate-700" />
        </Frame>
        <Frame className="absolute bottom-4 right-2 w-32 p-3 animate-[floatMid_7s_ease-in-out_infinite]">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Profile</p>
            <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white">Syncing details</p>
        </Frame>
    </div>
);
