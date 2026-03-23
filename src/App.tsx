
import React, { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import Spinner from '@/components/ui/Spinner';
import { useAuth } from '@/contexts/AuthContext';
import { DataProvider } from '@/contexts/DataContext';
import { UserRole } from '@/types';

// Eager Pages (Critical for initial load)
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import OwnerDashboard from './pages/OwnerDashboard';
import TenantDashboard from './pages/TenantDashboard';
import TenantIdentityOnboardingPage from './pages/TenantIdentityOnboardingPage';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import TenantSidebar from '@/components/layout/TenantSidebar';
import MobileBottomNav from '@/components/layout/MobileBottomNav';

// Lazy Pages
const RoleSelectionPage = lazy(() => import('./pages/RoleSelectionPage'));
const PropertiesPage = lazy(() => import('./pages/PropertiesPage'));
const TenantsPage = lazy(() => import('./pages/TenantsPage'));
const FinancialsPage = lazy(() => import('./pages/FinancialsPage'));
const MaintenancePage = lazy(() => import('./pages/MaintenancePage'));
const MarketplacePage = lazy(() => import('./pages/MarketplacePage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AnnouncementsPage = lazy(() => import('./pages/AnnouncementsPage'));
const TenantDetailPage = lazy(() => import('./pages/TenantDetailPage'));
const TenantFeedbackPage = lazy(() => import('./pages/TenantFeedbackPage'));
const TenantMaintenancePage = lazy(() => import('./pages/TenantMaintenancePage'));
const CommunityPage = lazy(() => import('./pages/CommunityPage'));
const AIHubPage = lazy(() => import('./pages/AIHubPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const LocalServicesPage = lazy(() => import('./pages/LocalServicesPage'));
const SupportBot = lazy(() => import('@/components/ai/SupportBot'));

const LoadingFallback = () => {
    return (
        <div className="flex flex-col items-center justify-center h-screen w-full bg-neutral-50 dark:bg-neutral-950 px-6 text-center">
            <Spinner />
        </div>
    );
};

const hasPendingRoleSetup = () => {
    if (typeof window === 'undefined') return false;
    return window.sessionStorage.getItem('nilayam_pending_role_setup') === '1';
};

const clearPendingRoleSetup = () => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.removeItem('nilayam_pending_role_setup');
};

const hasTenantIdentity = (profile: any, session: any) => {
    const phone = String(profile?.phone_number || session?.user?.user_metadata?.phone_number || '').replace(/\D/g, '').slice(-10);
    const aadhaar = String(profile?.aadhaar_number || session?.user?.user_metadata?.aadhaar_number || '').replace(/\D/g, '').slice(0, 12);
    return phone.length === 10 && aadhaar.length === 12;
};

const OwnerLayout = () => {
    const [isCollapsed, setIsCollapsed] = React.useState(false);
    const [isMobileOpen, setIsMobileOpen] = React.useState(false);

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-neutral-50 dark:bg-neutral-950 pt-safe">
            <Header isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar isCollapsed={isCollapsed} isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />
                <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-[env(safe-area-inset-bottom,2rem)] md:pb-8">
                    <ErrorBoundary>
                        <Suspense fallback={<Spinner />}>
                            <Routes>
                                <Route path="/dashboard" element={<OwnerDashboard />} />
                                <Route path="/properties" element={<PropertiesPage />} />
                                <Route path="/tenants/:tenantId" element={<TenantDetailPage />} />
                                <Route path="/tenants" element={<TenantsPage />} />
                                <Route path="/financials" element={<FinancialsPage />} />
                                <Route path="/maintenance" element={<MaintenancePage />} />
                                <Route path="/announcements" element={<AnnouncementsPage />} />
                                <Route path="/marketplace" element={<MarketplacePage />} />
                                <Route path="/profile" element={<ProfilePage />} />
                                <Route path="/community" element={<CommunityPage />} />
                                <Route path="/ai-hub" element={<AIHubPage />} />
                                <Route path="/reports" element={<ReportsPage />} />
                                <Route path="/services" element={<LocalServicesPage />} />
                                <Route path="*" element={<Navigate to="/dashboard" replace />} />
                            </Routes>
                        </Suspense>
                    </ErrorBoundary>
                </main>
            </div>
            <MobileBottomNav onMenuClick={() => setIsMobileOpen(true)} />
            <Suspense fallback={null}>
                <SupportBot />
            </Suspense>
        </div>
    );
};

const TenantLayout = () => {
    const [isCollapsed, setIsCollapsed] = React.useState(false);
    const [isMobileOpen, setIsMobileOpen] = React.useState(false);

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-neutral-50 dark:bg-neutral-950 pt-safe">
            <Header isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />
            <div className="flex flex-1 overflow-hidden">
                <TenantSidebar isCollapsed={isCollapsed} isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />
                <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-[env(safe-area-inset-bottom,2rem)] md:pb-8">
                    <ErrorBoundary>
                        <Suspense fallback={<Spinner />}>
                            <Routes>
                                <Route path="/tenant-dashboard" element={<TenantDashboard />} />
                                <Route path="/feedback" element={<TenantFeedbackPage />} />
                                <Route path="/tenant-maintenance" element={<TenantMaintenancePage />} />
                                <Route path="/services" element={<LocalServicesPage />} />
                                <Route path="/profile" element={<ProfilePage />} />
                                <Route path="/marketplace" element={<MarketplacePage />} />
                                <Route path="*" element={<Navigate to="/tenant-dashboard" replace />} />
                            </Routes>
                        </Suspense>
                    </ErrorBoundary>
                </main>
            </div>
            <MobileBottomNav onMenuClick={() => setIsMobileOpen(true)} />
            <Suspense fallback={null}>
                <SupportBot />
            </Suspense>
        </div>
    );
};

const App: React.FC = () => {
    const { session, profile, effectiveRole, loading, signOut } = useAuth();
    const pendingRoleSetup = hasPendingRoleSetup();
    const tenantIdentityReady = hasTenantIdentity(profile, session);

    console.log("APP.TSX: Rendering state:", { loading, hasSession: !!session, hasProfile: !!profile, role: effectiveRole });

    React.useEffect(() => {
        if (effectiveRole) {
            clearPendingRoleSetup();
        }
    }, [effectiveRole]);

    React.useEffect(() => {
        if (!session) {
            clearPendingRoleSetup();
        }
    }, [session]);

    React.useEffect(() => {
        if (!loading && session && !effectiveRole && !pendingRoleSetup) {
            const resetInvalidSession = async () => {
                clearPendingRoleSetup();
                await signOut();
            };

            resetInvalidSession().catch((error) => {
                console.error('APP.TSX: Failed to clear invalid no-role session.', error);
            });
        }
    }, [effectiveRole, loading, pendingRoleSetup, session, signOut]);

    if (loading) {
        console.log("APP.TSX: Showing LoadingFallback");
        return <LoadingFallback />;
    }

    return (
        <HashRouter>
            <DataProvider>
                <Suspense fallback={<LoadingFallback />}>
                    <Routes>
                        {/* Public Route: Landing Page is ALWAYS at / unless signed in */}
                        <Route path="/" element={
                            session ? <Navigate to="/dashboard-router" replace /> : 
                            <LandingPage />
                        } />

                        {/* Auth Page: Navigate to router if already signed in */}
                        <Route path="/auth" element={!session ? <AuthPage /> : <Navigate to="/dashboard-router" replace />} />

                        {/* Centralized Post-Auth Router - used after login to decide where to go */}
                        <Route path="/dashboard-router" element={
                            !session ? <Navigate to="/auth" replace /> :
                                !effectiveRole ? (pendingRoleSetup ? <Navigate to="/role-selection" replace /> : <Navigate to="/" replace />) :
                                    effectiveRole === UserRole.Tenant ? <Navigate to={tenantIdentityReady ? "/tenant-dashboard" : "/tenant-setup"} replace /> :
                                        <Navigate to="/dashboard" replace />
                        } />

                        {/* Role Selection: Accessible only if logged in but no role */}
                        <Route path="/role-selection" element={
                            !session ? <Navigate to="/auth" replace /> :
                                effectiveRole ? <Navigate to="/dashboard-router" replace /> :
                                    !pendingRoleSetup ? <Navigate to="/" replace /> :
                                    <RoleSelectionPage />
                        } />

                        <Route path="/tenant-setup" element={
                            !session ? <Navigate to="/auth" replace /> :
                                effectiveRole !== UserRole.Tenant ? <Navigate to="/dashboard-router" replace /> :
                                    tenantIdentityReady ? <Navigate to="/tenant-dashboard" replace /> :
                                        <TenantIdentityOnboardingPage />
                        } />

                        {/* All other routes are handled by Layouts if authenticated */}
                        {session ? (
                            effectiveRole === UserRole.Tenant ? (
                                <Route path="/*" element={<TenantLayout />} />
                            ) : effectiveRole === UserRole.Owner ? (
                                <Route path="/*" element={<OwnerLayout />} />
                            ) : (
                                <Route path="*" element={<Navigate to="/" replace />} />
                            )
                        ) : (
                            /* Not logged in and not on Landing/Auth? Redirect to Landing */
                            <Route path="*" element={<Navigate to="/" replace />} />
                        )}
                    </Routes>
                </Suspense>
            </DataProvider>
        </HashRouter>
    );
};

export default App;
