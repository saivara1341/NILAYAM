import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { updateUserRole } from '../services/api';
import { UserRole } from '../types';
import { HomeIcon, UsersIcon, LogoIcon } from '../constants';
import { useToast } from '../contexts/ToastContext';
import { useLanguage } from '../contexts/LanguageContext';

const clearPendingRoleSetup = () => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.removeItem('nilayam_pending_role_setup');
};

const RoleCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    description: string;
    onClick: () => void;
    loading: boolean;
    type: 'owner' | 'tenant';
}> = ({ icon, title, description, onClick, loading, type }) => (
    <button
        onClick={onClick}
        disabled={loading}
        className={`w-full rounded-3xl border-2 p-6 text-left transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-500/20 md:p-8
        ${type === 'owner' ? 'hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-900/10' : 'hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-900/10'}
        border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-neutral-900
        ${loading ? 'cursor-wait opacity-60' : 'hover:-translate-y-0.5 hover:shadow-md'}`}
    >
        <div className="flex items-center gap-5">
            <div className={`rounded-2xl p-4 transition-colors
            ${type === 'owner'
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300'
                : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300'}`}
            >
                {icon}
            </div>
            <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-950 dark:text-white md:text-2xl">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400 md:text-base">{description}</p>
            </div>
            {loading && <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />}
        </div>
    </button>
);

const RoleSelectionPage: React.FC = () => {
    const { effectiveRole, updateProfileState } = useAuth();
    const { error: toastError, success: toastSuccess } = useToast();
    const { t, language } = useLanguage();
    const navigate = useNavigate();
    const [loadingRole, setLoadingRole] = useState<UserRole | null>(null);
    const [lastError, setLastError] = useState<string | null>(null);

    React.useEffect(() => {
        if (effectiveRole) {
            navigate('/dashboard-router', { replace: true });
        }
    }, [effectiveRole, navigate]);

    const handleRoleSelect = async (role: UserRole) => {
        if (!role || (role !== UserRole.Owner && role !== UserRole.Tenant)) {
            toastError('Invalid role selected. Please try again.');
            return;
        }

        setLoadingRole(role);
        setLastError(null);

        try {
            const updatedProfile = await updateUserRole(role);
            toastSuccess('Workspace ready.');
            clearPendingRoleSetup();
            updateProfileState(updatedProfile);
            navigate(role === UserRole.Tenant ? '/tenant-setup' : '/dashboard', { replace: true });
        } catch (err: any) {
            const errorMessage = err?.message || 'Role update failed. Please try again.';
            setLastError(errorMessage);
            toastError(errorMessage);
        } finally {
            setLoadingRole(null);
        }
    };

    const isTranslated = language !== 'en';

    return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-6 dark:bg-neutral-950">
            <div className="w-full max-w-2xl">
                <div className="mb-10 text-center">
                    <div className="mb-6 flex items-center justify-center gap-4">
                        <div className="rounded-2xl bg-blue-600 p-2.5 shadow-xl shadow-blue-600/30">
                            <LogoIcon className="h-10 w-10 text-white" />
                        </div>
                        <span className={`text-4xl tracking-tighter text-neutral-900 dark:text-white ${isTranslated ? 'font-bold' : 'font-righteous'}`}>
                            {t('app.name')}
                        </span>
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white md:text-4xl">
                        Choose your workspace
                    </h1>
                </div>

                {lastError && (
                    <div className="mb-6 rounded-3xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
                        {lastError}
                    </div>
                )}

                <div className="grid gap-5 md:gap-6">
                    <RoleCard
                        type="owner"
                        icon={<HomeIcon className="h-10 w-10" />}
                        title="Property Owner"
                        description="Manage portfolio, leases, tenants, collections, and operations."
                        onClick={() => handleRoleSelect(UserRole.Owner)}
                        loading={loadingRole === UserRole.Owner}
                    />
                    <RoleCard
                        type="tenant"
                        icon={<UsersIcon className="h-10 w-10" />}
                        title="Resident Tenant"
                        description="Pay rent, raise requests, manage documents, and stay connected."
                        onClick={() => handleRoleSelect(UserRole.Tenant)}
                        loading={loadingRole === UserRole.Tenant}
                    />
                </div>
            </div>
        </div>
    );
};

export default RoleSelectionPage;
