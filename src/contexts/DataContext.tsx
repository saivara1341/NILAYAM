import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { DashboardSummary, FinancialDataPoint, OccupancyDataPoint, TenantDashboardData } from '../types';
import { getDashboardSummary, getFinancialSummary, getOccupancySummary, getTenantDashboardData } from '../services/api';
import { useAuth } from './AuthContext';

interface DataContextType {
  dashboardSummary: DashboardSummary | null;
  financialData: FinancialDataPoint[];
  occupancyData: OccupancyDataPoint[];
  tenantDashboardData: TenantDashboardData | null;
  loadingDashboard: boolean;
  dashboardError: string | null;
  refreshDashboard: (force?: boolean) => Promise<void>;
  refreshTenantDashboard: (force?: boolean) => Promise<void>;
  lastUpdated: number | null;
  tenantLastUpdated: number | null;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const getE2EState = () => {
  if (typeof window === 'undefined') return null;
  return (window as any).__NILAYAM_E2E__ || null;
};

const DASHBOARD_CACHE_KEY = 'nilayam_owner_dashboard_cache';
const TENANT_DASHBOARD_CACHE_KEY = 'nilayam_tenant_dashboard_cache';
const CACHE_TTL_MS = 300000;

const isAbortLikeError = (err: unknown) => {
  const message = err instanceof Error ? err.message : String(err ?? '');
  const name = err instanceof Error ? err.name : '';
  const normalized = `${name} ${message}`.toLowerCase();
  return normalized.includes('abort') || normalized.includes('aborted') || normalized.includes('signal');
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, effectiveRole, loading: authLoading } = useAuth();
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
  const [financialData, setFinancialData] = useState<FinancialDataPoint[]>([]);
  const [occupancyData, setOccupancyData] = useState<OccupancyDataPoint[]>([]);
  const [tenantDashboardData, setTenantDashboardData] = useState<TenantDashboardData | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [tenantLastUpdated, setTenantLastUpdated] = useState<number | null>(null);
  const dashboardRequestRef = React.useRef<Promise<void> | null>(null);
  const tenantRequestRef = React.useRef<Promise<void> | null>(null);
  const activeDashboardFetchId = React.useRef(0);
  const activeTenantFetchId = React.useRef(0);
  const lastUpdatedRef = React.useRef<number | null>(null);
  const tenantLastUpdatedRef = React.useRef<number | null>(null);
  const dashboardSummaryRef = React.useRef<DashboardSummary | null>(null);
  const tenantDashboardDataRef = React.useRef<TenantDashboardData | null>(null);

  useEffect(() => {
    lastUpdatedRef.current = lastUpdated;
  }, [lastUpdated]);

  useEffect(() => {
    tenantLastUpdatedRef.current = tenantLastUpdated;
  }, [tenantLastUpdated]);

  useEffect(() => {
    dashboardSummaryRef.current = dashboardSummary;
  }, [dashboardSummary]);

  useEffect(() => {
    tenantDashboardDataRef.current = tenantDashboardData;
  }, [tenantDashboardData]);

  const readDashboardCache = useCallback(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.sessionStorage.getItem(DASHBOARD_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed?.updatedAt || Date.now() - parsed.updatedAt > CACHE_TTL_MS) return null;
      return parsed;
    } catch {
      return null;
    }
  }, []);

  const writeDashboardCache = useCallback((summary: DashboardSummary, financials: FinancialDataPoint[], occupancy: OccupancyDataPoint[], updatedAt: number) => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(
      DASHBOARD_CACHE_KEY,
      JSON.stringify({ summary, financials, occupancy, updatedAt, userId: user?.id || null })
    );
  }, [user?.id]);

  const readTenantDashboardCache = useCallback(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.sessionStorage.getItem(TENANT_DASHBOARD_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed?.updatedAt || Date.now() - parsed.updatedAt > CACHE_TTL_MS) return null;
      return parsed;
    } catch {
      return null;
    }
  }, []);

  const writeTenantDashboardCache = useCallback((data: TenantDashboardData | null, updatedAt: number) => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(
      TENANT_DASHBOARD_CACHE_KEY,
      JSON.stringify({ data, updatedAt, userId: user?.id || null })
    );
  }, [user?.id]);

  const refreshDashboard = useCallback(async (force: boolean = false) => {
    if (!user) return;

    const e2eState = getE2EState();
    if (e2eState?.data?.dashboard) {
      setDashboardSummary(e2eState.data.dashboard.dashboardSummary || null);
      setFinancialData(e2eState.data.dashboard.financialData || []);
      setOccupancyData(e2eState.data.dashboard.occupancyData || []);
      setDashboardError(null);
      setLastUpdated(Date.now());
      return;
    }

    if (!force && lastUpdatedRef.current && (Date.now() - lastUpdatedRef.current < CACHE_TTL_MS)) {
      return;
    }

    if (!force && !dashboardSummaryRef.current) {
      const cached = readDashboardCache();
      if (cached && cached.userId === user.id) {
        setDashboardSummary(cached.summary || null);
        setFinancialData(cached.financials || []);
        setOccupancyData(cached.occupancy || []);
        setDashboardError(null);
        setLastUpdated(cached.updatedAt || Date.now());
        return;
      }
    }

    if (dashboardRequestRef.current) {
      return dashboardRequestRef.current;
    }

    setLoadingDashboard(true);
    setDashboardError(null);
    const fetchId = ++activeDashboardFetchId.current;
    dashboardRequestRef.current = (async () => {
      try {
        const [summary, financials, occupancy] = await Promise.all([
          getDashboardSummary(user.id),
          getFinancialSummary(user.id),
          getOccupancySummary(user.id)
        ]);

        if (activeDashboardFetchId.current !== fetchId) return;

        const updatedAt = Date.now();
        setDashboardSummary(summary);
        setFinancialData(financials);
        setOccupancyData(occupancy);
        setDashboardError(null);
        setLastUpdated(updatedAt);
        writeDashboardCache(summary, financials, occupancy, updatedAt);
      } catch (err: any) {
        if (activeDashboardFetchId.current !== fetchId) return;

        if (isAbortLikeError(err)) {
          console.warn("DataContext: Ignoring aborted dashboard refresh.", err);
          return;
        }

        console.error("DataContext: Error refreshing dashboard:", err);
        if (!dashboardSummaryRef.current) {
          setDashboardError(err?.message || 'Unable to load dashboard data.');
        }
      } finally {
        if (activeDashboardFetchId.current === fetchId) {
          setLoadingDashboard(false);
        }
        dashboardRequestRef.current = null;
      }
    })();

    return dashboardRequestRef.current;
  }, [readDashboardCache, user, writeDashboardCache]);

  const refreshTenantDashboard = useCallback(async (force: boolean = false) => {
    if (!user) return;

    const e2eState = getE2EState();
    if (e2eState?.data?.tenantDashboard !== undefined) {
      setTenantDashboardData(e2eState.data.tenantDashboard || null);
      setTenantLastUpdated(Date.now());
      return;
    }

    const cached = readTenantDashboardCache();
    const hasCachedTenantData = Boolean(cached && cached.userId === user.id && cached.data);
    if (cached && cached.userId === user.id) {
      setTenantDashboardData(cached.data || null);
      setTenantLastUpdated(cached.updatedAt || Date.now());
      setDashboardError(null);
      if (!force && Date.now() - (cached.updatedAt || 0) < CACHE_TTL_MS) {
        return;
      }
    } else if (!force && tenantLastUpdatedRef.current && (Date.now() - tenantLastUpdatedRef.current < CACHE_TTL_MS)) {
      return;
    }

    if (tenantRequestRef.current) {
      return tenantRequestRef.current;
    }

    setLoadingDashboard(!tenantDashboardDataRef.current && !hasCachedTenantData);
    setDashboardError(null);
    const fetchId = ++activeTenantFetchId.current;
    tenantRequestRef.current = (async () => {
      try {
        const data = await getTenantDashboardData();

        if (activeTenantFetchId.current !== fetchId) return;

        const updatedAt = Date.now();
        setTenantDashboardData(data);
        setTenantLastUpdated(updatedAt);
        setDashboardError(null);
        writeTenantDashboardCache(data, updatedAt);
      } catch (err: any) {
        if (activeTenantFetchId.current !== fetchId) return;
        if (isAbortLikeError(err)) {
          console.warn("DataContext: Ignoring aborted tenant dashboard refresh.", err);
          return;
        }
        console.error("DataContext: Error refreshing tenant dashboard:", err);
        if (!tenantDashboardDataRef.current && !hasCachedTenantData) {
          setDashboardError(err?.message || 'Unable to load tenant dashboard data.');
        }
      } finally {
        if (activeTenantFetchId.current === fetchId) {
          setLoadingDashboard(false);
        }
        tenantRequestRef.current = null;
      }
    })();

    return tenantRequestRef.current;
  }, [readTenantDashboardCache, user, writeTenantDashboardCache]);

  // Reset data when user changes
  useEffect(() => {
    if (!user) {
      setDashboardSummary(null);
      setFinancialData([]);
      setOccupancyData([]);
      setTenantDashboardData(null);
      setDashboardError(null);
      setLastUpdated(null);
      setTenantLastUpdated(null);
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(DASHBOARD_CACHE_KEY);
        window.sessionStorage.removeItem(TENANT_DASHBOARD_CACHE_KEY);
      }
    }
  }, [user]);

  useEffect(() => {
    if (authLoading || !user || !effectiveRole) {
      return;
    }

    if (effectiveRole === 'tenant') {
      void refreshTenantDashboard(false);
      return;
    }

    void refreshDashboard(false);
  }, [authLoading, effectiveRole, refreshDashboard, refreshTenantDashboard, user?.id]);

  const value = {
    dashboardSummary,
    financialData,
    occupancyData,
    tenantDashboardData,
    loadingDashboard,
    dashboardError,
    refreshDashboard,
    refreshTenantDashboard,
    lastUpdated,
    tenantLastUpdated
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
