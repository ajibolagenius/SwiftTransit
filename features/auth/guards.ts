import type { Session } from '@supabase/supabase-js';

export type Role = 'customer' | 'courier';

export type AuthState =
  | { status: 'loading' }
  // expired: a stored session existed at launch but could not be restored (AC-8)
  | { status: 'signed-out'; expired?: boolean }
  // role is null until the user has completed registration (no profile row yet)
  // profileError: the profiles read failed (network); never route that user to registration (AC-9)
  | { status: 'signed-in'; session: Session | null; role: Role | null; profileError?: boolean };

// Which route groups are reachable. Expo Router sends the user to the first reachable one.
// The carousel is shown once per install: onboardingSeen comes from the AsyncStorage flag (AC-1).
export function routeGuards(state: AuthState, onboardingSeen: boolean) {
  const signedOut = state.status === 'signed-out';
  const role = state.status === 'signed-in' ? state.role : null;
  return {
    onboarding: signedOut && !onboardingSeen,
    signIn: signedOut,
    registration: state.status === 'signed-in' && role === null && !state.profileError,
    customer: role === 'customer',
    courier: role === 'courier',
  };
}
