import type { Session } from '@supabase/supabase-js';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';

import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';

import type { AuthState, Role } from './guards';

const AuthContext = createContext<AuthState>({ status: 'loading' });

const devRole = __DEV__ ? env.EXPO_PUBLIC_DEV_AUTH_STUB : undefined;

async function fetchRole(userId: string): Promise<Role | null> {
  // profiles arrives with scope feature 3; until then this returns null and the user is sent to registration.
  const { data, error } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
  if (error || !data) return null;
  return data.role === 'customer' || data.role === 'courier' ? data.role : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(
    devRole ? { status: 'signed-in', session: null, role: devRole } : { status: 'loading' },
  );

  useEffect(() => {
    if (devRole) return;
    let active = true;

    const apply = async (session: Session | null) => {
      if (!session) return active && setState({ status: 'signed-out' });
      const role = await fetchRole(session.user.id);
      if (active) setState({ status: 'signed-in', session, role });
    };

    // Fires INITIAL_SESSION first. Supabase calls are deferred out of the callback to avoid its auth lock.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') return;
      setTimeout(() => apply(session), 0);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return <AuthContext value={state}>{children}</AuthContext>;
}

export const useAuth = () => use(AuthContext);
