import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, use, useEffect, useRef, useState, type ReactNode } from 'react';

import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';

import { markOnboardingSeen } from './onboarding-storage';
import { probeReachable } from './offline';
import { hasStoredSession } from './stored-session';
import type { AuthState, Role } from './guards';

type AuthExtras = {
  onboardingSeen: boolean;
  offline: boolean;
  markOnboardingSeen: () => void;
  // Re-read the session and profile after a flow completes or a read failed.
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

// An intersection of a discriminated union with the extras distributes over the union,
// so consumers still narrow on `status` (a plain interface cannot extend a union).
type AuthContextValue = AuthState & AuthExtras;

const AuthContext = createContext<AuthContextValue>({
  status: 'loading',
  onboardingSeen: true,
  offline: false,
  markOnboardingSeen: () => {},
  refresh: async () => {},
  signOut: async () => {},
});

const devRole = __DEV__ ? env.EXPO_PUBLIC_DEV_AUTH_STUB : undefined;

type RoleOutcome = { kind: 'role'; role: Role } | { kind: 'no-profile' } | { kind: 'error' };

async function fetchRole(userId: string): Promise<RoleOutcome> {
  const { data, error } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
  if (error) return { kind: 'error' }; // AC-9: a failed read is never "missing profile"
  if (!data) return { kind: 'no-profile' };
  return data.role === 'customer' || data.role === 'courier'
    ? { kind: 'role', role: data.role }
    : { kind: 'no-profile' };
}

export function AuthProvider({
  children,
  initialOnboardingSeen = false,
}: {
  children: ReactNode;
  initialOnboardingSeen?: boolean;
}) {
  const [onboardingSeen, setOnboardingSeen] = useState(() => Boolean(devRole) || initialOnboardingSeen);
  const [offline, setOffline] = useState(false);
  const [state, setState] = useState<AuthState>(
    devRole ? { status: 'signed-in', session: null, role: devRole } : { status: 'loading' },
  );
  const hadStoredSession = useRef(false);

  const apply = useCallback(async (session: Session | null) => {
    if (!session) {
      // AC-8: a stored session that no longer restores is an expired one, not a plain sign-out.
      const expired = hadStoredSession.current;
      hadStoredSession.current = false;
      return setState({ status: 'signed-out', ...(expired ? { expired: true } : {}) });
    }
    const outcome = await fetchRole(session.user.id);
    if (outcome.kind === 'error') {
      return setState({ status: 'signed-in', session, role: null, profileError: true });
    }
    setState({ status: 'signed-in', session, role: outcome.kind === 'role' ? outcome.role : null });
  }, []);

  useEffect(() => {
    if (devRole) return;
    let active = true;

    const start = async () => {
      // AC-10: reachability probe on launch (navigator.onLine is unreliable in RN).
      const reachable = await probeReachable();
      if (active) setOffline(!reachable);
      // Settle the stored-session flag BEFORE subscribing, so INITIAL_SESSION's null
      // can be read as an expiry rather than a plain sign-out (AC-8).
      if (active && (await hasStoredSession())) hadStoredSession.current = true;

      // Fires INITIAL_SESSION first. Supabase calls are deferred out of the callback to avoid its auth lock.
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'TOKEN_REFRESHED') return;
        setTimeout(() => {
          if (active) apply(session);
        }, 0);
      });
      if (!active) data.subscription.unsubscribe();
      return data;
    };

    let sub: { subscription: { unsubscribe: () => void } } | undefined;
    void start().then((d) => {
      sub = d;
    });

    return () => {
      active = false;
      sub?.subscription.unsubscribe();
    };
  }, [apply]);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await apply(data.session);
  }, [apply]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setState({ status: 'signed-out' });
  }, []);

  const markSeen = useCallback(() => {
    setOnboardingSeen(true);
    void markOnboardingSeen();
  }, []);

  return (
    <AuthContext.Provider
      value={{ ...state, onboardingSeen, offline, markOnboardingSeen: markSeen, refresh, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => use(AuthContext);
