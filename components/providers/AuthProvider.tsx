'use client';

import { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase/client';
import { getProfile } from '@/services/supabase/auth';
import { ROLES } from '@/constants/config';
import type { Profile } from '@/types';

const isConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

export interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<Profile | null>;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isSupport: boolean;
}

export const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);
  const loadedUserId = useRef<string | null | undefined>(undefined);
  const loadingUserId = useRef<string | null | undefined>(undefined);
  const authEventReceived = useRef(false);

  const refreshProfile = useCallback(async () => {
    const currentRequest = ++requestId.current;
    const { data: { user: currentUser }, error } = await supabase.auth.getUser();
    if (error || !currentUser) {
      if (requestId.current === currentRequest) {
        setUser(null);
        setProfile(null);
        loadedUserId.current = null;
        loadingUserId.current = undefined;
        setLoading(false);
      }
      return null;
    }

    setUser(currentUser);
    const nextProfile = await getProfile(currentUser.id);
    if (requestId.current !== currentRequest) return null;
    loadedUserId.current = nextProfile ? currentUser.id : undefined;
    loadingUserId.current = undefined;
    setProfile(nextProfile);
    setLoading(false);
    return nextProfile;
  }, []);

  const syncUser = useCallback(async (nextUser: User | null) => {
    const userId = nextUser?.id ?? null;
    setUser(nextUser);

    if (loadedUserId.current === userId || loadingUserId.current === userId) return;

    const currentRequest = ++requestId.current;
    loadingUserId.current = userId;
    if (!nextUser) {
      loadedUserId.current = null;
      setProfile(null);
      setLoading(false);
      loadingUserId.current = undefined;
      return;
    }

    setLoading(true);
    try {
      const nextProfile = await getProfile(nextUser.id);
      if (requestId.current !== currentRequest) return;
      // A profile can be temporarily absent while sign-up is still inserting it.
      // Leave it eligible for an explicit refresh instead of treating null as loaded.
      loadedUserId.current = nextProfile ? nextUser.id : undefined;
      setProfile(nextProfile);
    } catch {
      if (requestId.current === currentRequest) {
        loadedUserId.current = undefined;
        setProfile(null);
      }
    } finally {
      if (requestId.current === currentRequest) {
        setLoading(false);
        loadingUserId.current = undefined;
      }
    }
  }, []);

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    let active = true;
    authEventReceived.current = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      authEventReceived.current = true;
      // Supabase recommends keeping auth callbacks free of other Supabase calls.
      // Defer profile loading until the auth callback has released its internal lock.
      if (active) window.setTimeout(() => {
        if (active) void syncUser(session?.user ?? null);
      }, 0);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active && !authEventReceived.current) void syncUser(session?.user ?? null);
    }).catch(() => {
      if (active && !authEventReceived.current) {
        setProfile(null);
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      active = false;
      requestId.current += 1;
      loadingUserId.current = undefined;
      subscription.unsubscribe();
    };
  }, [syncUser]);

  const value: AuthState = {
    user,
    profile,
    loading,
    refreshProfile,
    isAdmin: profile?.role === ROLES.ADMIN || profile?.role === ROLES.SUPERADMIN,
    isSuperAdmin: profile?.role === ROLES.SUPERADMIN,
    isSupport: profile?.role === ROLES.SUPPORT,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
