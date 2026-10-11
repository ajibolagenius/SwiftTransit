import type { Session } from '@supabase/supabase-js';

export type Role = 'customer' | 'courier';

export type AuthState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  // role is null until the user has completed registration (no profile row yet)
  | { status: 'signed-in'; session: Session | null; role: Role | null };

// Which route groups are reachable. Expo Router sends the user to the first reachable one.
export function routeGuards(state: AuthState) {
  const signedOut = state.status === 'signed-out';
  const role = state.status === 'signed-in' ? state.role : null;
  return {
    onboarding: signedOut,
    signIn: signedOut,
    registration: state.status === 'signed-in' && role === null,
    customer: role === 'customer',
    courier: role === 'courier',
  };
}
