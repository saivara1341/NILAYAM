import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase';
import { Profile, UserRole } from '@/types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  effectiveRole: UserRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
  updateProfileState: (newProfile: Profile) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getE2EState = () => {
  if (typeof window === 'undefined') return null;
  return (window as any).__NILAYAM_E2E__ || null;
};

const PROFILE_CACHE_KEY = 'nilayam_profile_cache';

const clearPendingRoleSetup = () => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem('nilayam_pending_role_setup');
};

const readCachedProfile = (userId: string): Profile | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.userId !== userId || !parsed?.profile) {
      return null;
    }
    return parsed.profile as Profile;
  } catch {
    return null;
  }
};

const writeCachedProfile = (userId: string, profile: Profile | null) => {
  if (typeof window === 'undefined') return;
  if (!profile) {
    window.sessionStorage.removeItem(PROFILE_CACHE_KEY);
    return;
  }
  window.sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({ userId, profile }));
};

const normalizeRole = (role: unknown): UserRole | null => {
  if (typeof role !== 'string') return null;
  return Object.values(UserRole).includes(role as UserRole) ? (role as UserRole) : null;
};

const buildFallbackProfile = (currentUser: User, profileData?: Partial<Profile> | null): Profile | null => {
  const role = normalizeRole(profileData?.role) || normalizeRole(currentUser.user_metadata?.role);
  const fullName =
    profileData?.full_name ||
    currentUser.user_metadata?.full_name ||
    currentUser.email?.split('@')[0] ||
    'User';

  if (!role && !fullName) {
    return null;
  }

  return {
    id: currentUser.id,
    role,
    full_name: fullName,
    avatar_url: profileData?.avatar_url || currentUser.user_metadata?.avatar_url,
    phone_number: profileData?.phone_number,
    aadhaar_number:
      (profileData as Profile | null | undefined)?.aadhaar_number ||
      (currentUser.user_metadata?.aadhaar_number as string | undefined),
    bio: profileData?.bio,
    subscription_tier: profileData?.subscription_tier,
    payment_methods: profileData?.payment_methods,
    is_verified: profileData?.is_verified,
    id_proof_url: profileData?.id_proof_url,
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const activeFetchRef = React.useRef<string | null>(null);
  const sessionRef = React.useRef<Session | null>(null);
  const userRef = React.useRef<User | null>(null);

  useEffect(() => {
    sessionRef.current = session;
    userRef.current = user;
  }, [session, user]);

  const clearAuthState = useCallback(() => {
    setSession(null);
    setUser(null);
    setProfile(null);
    localStorage.removeItem('nilayam_has_session');
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(PROFILE_CACHE_KEY);
    }
  }, []);

  const applySessionState = useCallback((nextSession: Session | null) => {
    setSession(nextSession);
    const nextUser = nextSession?.user ?? null;
    setUser(nextUser);
    if (nextUser) {
      const cachedProfile = readCachedProfile(nextUser.id);
      setProfile(cachedProfile || buildFallbackProfile(nextUser));
      localStorage.setItem('nilayam_has_session', 'true');
    } else {
      setProfile(null);
      localStorage.removeItem('nilayam_has_session');
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(PROFILE_CACHE_KEY);
      }
    }
    return nextUser;
  }, []);

  const fetchProfile = useCallback(async (currentUser: User) => {
    const fetchId = Math.random().toString(36).substring(7);
    activeFetchRef.current = fetchId;

    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`*`)
        .eq('id', currentUser.id)
        .maybeSingle();

      // Only apply state updates if this is still the most recent fetch request
      if (activeFetchRef.current !== fetchId) {
        return;
      }

      activeFetchRef.current = null; // Clear since we finished the latest one

      if (!profileData && !profileError) {
        const fallbackProfile = buildFallbackProfile(currentUser);
        setProfile(fallbackProfile);
        writeCachedProfile(currentUser.id, fallbackProfile);
      } else if (profileData) {
        const fallbackProfile = buildFallbackProfile(currentUser, profileData);
        setProfile(fallbackProfile);
        writeCachedProfile(currentUser.id, fallbackProfile);
      } else {
        const fallbackProfile = buildFallbackProfile(currentUser);
        setProfile(fallbackProfile);
        writeCachedProfile(currentUser.id, fallbackProfile);
        if (profileError) throw profileError;
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error("Error fetching profile:", err);
      }
      const fallbackProfile = buildFallbackProfile(currentUser);
      setProfile(fallbackProfile);
      writeCachedProfile(currentUser.id, fallbackProfile);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user);
    }
  }, [user, fetchProfile]);

  const signOut = useCallback(async () => {
    clearPendingRoleSetup();
    clearAuthState();
    setLoading(false);

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.warn('AuthContext: Supabase sign-out completed locally but returned an error.', error);
      }
    } catch (error) {
      console.warn('AuthContext: Supabase sign-out failed after local session clear.', error);
    }
  }, [clearAuthState]);

  useEffect(() => {
    const e2eState = getE2EState();
    if (e2eState?.auth) {
      setSession((e2eState.auth.session || null) as Session | null);
      setUser((e2eState.auth.user || null) as User | null);
      setProfile((e2eState.auth.profile || null) as Profile | null);
      setLoading(false);
      return;
    }

    // Safety timeout: ensure loading state is cleared after 4 seconds no matter what
    const safetyTimeout = setTimeout(() => {
      setLoading(currentLoading => {
        if (currentLoading) {
          console.warn("AuthContext: Safety timeout reached. Forcing loading to false.");
          return false;
        }
        return currentLoading;
      });
    }, 4000);

    // Initial check to prevent indefinite loading in some environments
    const checkInitialSession = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();

        if (error) {
          console.error("AuthContext: Error getting session:", error);
          clearAuthState();
          return;
        }

        if (initialSession) {
          const currentUser = applySessionState(initialSession);
          if (currentUser) {
            void fetchProfile(currentUser);
          }
        } else {
          clearAuthState();
        }
      } catch (err) {
        console.error("AuthContext: Unexpected error in initial check:", err);
        clearAuthState();
      } finally {
        setLoading(false);
      }
    };

    checkInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        try {
          const currentUser = applySessionState(newSession);

          if (currentUser) {
            void fetchProfile(currentUser);
          } else {
            clearAuthState();
          }
        } catch (e) {
          console.error("AuthContext: Error in onAuthStateChange handler:", e);
          clearAuthState();
        } finally {
          setLoading(false);
        }
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, [applySessionState, clearAuthState, fetchProfile]);

  const updateProfileState = (newProfile: Profile) => {
    const normalizedProfile = {
      ...newProfile,
      role: normalizeRole(newProfile.role),
    };
    setProfile(normalizedProfile);
    if (normalizedProfile.id) {
      writeCachedProfile(normalizedProfile.id, normalizedProfile);
    }
  };

  const effectiveRole = profile?.role || normalizeRole(user?.user_metadata?.role) || null;

  const value = {
    session,
    user,
    profile,
    effectiveRole,
    loading,
    signOut,
    updateProfileState,
    refreshProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
