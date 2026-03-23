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

const clearPendingRoleSetup = () => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem('nilayam_pending_role_setup');
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
  }, []);

  const fetchProfile = useCallback(async (currentUser: User) => {
    const fetchId = Math.random().toString(36).substring(7);
    activeFetchRef.current = fetchId;

    try {
      console.log(`AuthContext: Fetching profile for ${currentUser.id} (ID: ${fetchId})`);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`*`)
        .eq('id', currentUser.id)
        .maybeSingle();

      // Only apply state updates if this is still the most recent fetch request
      if (activeFetchRef.current !== fetchId) {
        console.log(`AuthContext: Stale fetch ${fetchId} ignored.`);
        return;
      }

      activeFetchRef.current = null; // Clear since we finished the latest one

      if (!profileData && !profileError) {
        setProfile(buildFallbackProfile(currentUser));
      } else if (profileData) {
        const fallbackProfile = buildFallbackProfile(currentUser, profileData);
        setProfile(fallbackProfile);
      } else {
        setProfile(buildFallbackProfile(currentUser));
        if (profileError) throw profileError;
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log("AuthContext: Profile fetch aborted naturally.");
      } else {
        console.error("Error fetching profile:", err);
      }
      setProfile(buildFallbackProfile(currentUser));
    } finally {
      console.log(`AuthContext: fetchProfile finished for ID: ${fetchId}`);
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

    // Safety timeout: ensure loading state is cleared after 8 seconds no matter what
    const safetyTimeout = setTimeout(() => {
      setLoading(currentLoading => {
        if (currentLoading) {
          console.warn("AuthContext: Safety timeout reached. Forcing loading to false.");
          return false;
        }
        return currentLoading;
      });
    }, 8000);

    // Initial check to prevent indefinite loading in some environments
    const checkInitialSession = async () => {
      let profileFetched = false;
      try {
        console.log("AuthContext: Performing initial session check...");
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();

        if (error) {
          console.error("AuthContext: Error getting session:", error);
          clearAuthState();
          return;
        }

        if (initialSession) {
          const { data: userData, error: userError } = await supabase.auth.getUser();

          if (userError || !userData.user) {
            console.warn("AuthContext: Cached session is no longer valid. Clearing local auth state.", userError);
            await supabase.auth.signOut();
            clearAuthState();
            return;
          }

          setSession(initialSession);
          setUser(userData.user);
          setProfile(buildFallbackProfile(userData.user));
          localStorage.setItem('nilayam_has_session', 'true');
          console.log("AuthContext: User found, fetching profile...");
          void fetchProfile(userData.user);
        } else {
          clearAuthState();
          console.log("AuthContext: No initial session found.");
        }
      } catch (err) {
        console.error("AuthContext: Unexpected error in initial check:", err);
        clearAuthState();
      } finally {
        setLoading(false);
        console.log("AuthContext: Initial check complete, loading cleared.");
      }
    };

    checkInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log(`AuthContext: Auth state changed: ${event}`);
      
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        const hadActiveSession = Boolean(sessionRef.current || userRef.current);
        if (event === 'SIGNED_IN') {
            if (!hadActiveSession) {
              setLoading(true);
            }
            localStorage.setItem('nilayam_has_session', 'true');
        }
        if (event === 'SIGNED_OUT') {
            localStorage.removeItem('nilayam_has_session');
        }

        try {
          setSession(newSession);
          const currentUser = newSession?.user ?? null;
          setUser(currentUser);

          if (currentUser) {
            const { data: userData, error: userError } = await supabase.auth.getUser();
            if (userError || !userData.user) {
              console.warn("AuthContext: Auth event provided an invalid user. Clearing local auth state.", userError);
              await supabase.auth.signOut();
              clearAuthState();
            } else {
              setUser(userData.user);
              setProfile(buildFallbackProfile(userData.user));
              void fetchProfile(userData.user);
            }
          } else {
            setProfile(null);
          }
        } catch (e) {
          console.error("AuthContext: Error in onAuthStateChange handler:", e);
        } finally {
          if (event !== 'SIGNED_IN' || !hadActiveSession) {
            setLoading(false);
          }
        }
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, [clearAuthState, fetchProfile]);

  const updateProfileState = (newProfile: Profile) => {
    console.log("AuthContext: Explicitly updating profile state:", newProfile);
    setProfile({
      ...newProfile,
      role: normalizeRole(newProfile.role),
    });
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
