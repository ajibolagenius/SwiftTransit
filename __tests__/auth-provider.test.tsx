import { act, render } from '@testing-library/react-native';
import * as React from 'react';

type Listener = (event: string, session: unknown) => void;

// What a consumer sees from useAuth: the AuthState discriminants plus the context extras.
type Seen = {
  status: string;
  session?: unknown;
  role?: unknown;
  expired?: boolean;
  profileError?: boolean;
  offline?: boolean;
  onboardingSeen?: boolean;
};

const mockUnsubscribe = jest.fn();
const mockMaybeSingle = jest.fn();
const mockEq = jest.fn((..._args: unknown[]) => ({ maybeSingle: mockMaybeSingle }));
let mockListener: Listener = () => {};
const mockEnv: { EXPO_PUBLIC_DEV_AUTH_STUB?: string } = {};

// The launch effect probes reachability and reads the stored session before subscribing.
// Both are stubbed as resolved promises so the subscribe happens on the next flush.
let mockReachable = true;
let mockStored = false;

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (fn: Listener) => {
        mockListener = fn;
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      },
      signOut: jest.fn(async () => {}),
    },
    from: () => ({ select: () => ({ eq: mockEq }) }),
  },
}));
jest.mock('@/lib/env', () => ({ env: mockEnv }));
jest.mock('@/features/auth/stored-session', () => ({
  hasStoredSession: () => Promise.resolve(mockStored),
}));
jest.mock('@/features/auth/offline', () => ({
  probeReachable: () => Promise.resolve(mockReachable),
}));
jest.mock('@/features/auth/onboarding-storage', () => ({
  markOnboardingSeen: jest.fn(async () => {}),
}));

const session = { user: { id: 'user-1' }, access_token: 'token' };

// Renders the provider and reports every state the app would see. Loaded fresh per test
// because the provider reads the dev stub at import.
async function renderAuth() {
  const { AuthProvider, useAuth } =
    require('@/features/auth/auth-provider') as typeof import('@/features/auth/auth-provider');
  const states: Seen[] = [];
  function Probe() {
    states.push(useAuth() as Seen);
    return null;
  }
  const view = await render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  // Let the launch effect finish its probe + stored session read so it subscribes.
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return { states, latest: () => states[states.length - 1], ...view };
}

async function emit(event: string, s: unknown) {
  await act(async () => {
    mockListener(event, s);
    await new Promise((resolve) => setTimeout(resolve, 0)); // the provider defers work out of the auth callback
  });
}

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.doMock('react', () => React); // keep the renderer's React across the reset
    jest.clearAllMocks();
    delete mockEnv.EXPO_PUBLIC_DEV_AUTH_STUB;
    mockReachable = true;
    mockStored = false;
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  });

  // covers: AC-4
  it('stays loading until Supabase reports the initial session', async () => {
    const { latest } = await renderAuth();
    expect(latest()).toMatchObject({ status: 'loading' });
  });

  // covers: AC-4
  it('is signed out when there is no stored session', async () => {
    const { latest } = await renderAuth();
    await emit('INITIAL_SESSION', null);
    expect(latest()).toMatchObject({ status: 'signed-out' });
    expect(latest().expired).toBeUndefined();
  });

  // covers: AC-8
  it('marks a stored session that will not restore as expired, not a plain sign out', async () => {
    mockStored = true;
    const { latest } = await renderAuth();
    await emit('INITIAL_SESSION', null);
    expect(latest()).toMatchObject({ status: 'signed-out', expired: true });
  });

  // covers: AC-4
  it.each(['customer', 'courier'] as const)('reads the %s role from the user profile', async (role) => {
    mockMaybeSingle.mockResolvedValue({ data: { role }, error: null });
    const { latest } = await renderAuth();
    await emit('INITIAL_SESSION', session);
    expect(mockEq).toHaveBeenCalledWith('id', 'user-1');
    expect(latest()).toMatchObject({ status: 'signed-in', session, role });
  });

  it('sends a user without a profile to registration (role null)', async () => {
    const { latest } = await renderAuth();
    await emit('SIGNED_IN', session);
    expect(latest()).toMatchObject({ status: 'signed-in', session, role: null });
    expect(latest().profileError).toBeUndefined();
  });

  // covers: AC-9
  it('flags a failed profile read instead of treating it as a missing profile', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'permission denied' } });
    const { latest } = await renderAuth();
    await emit('SIGNED_IN', session);
    expect(latest()).toMatchObject({ status: 'signed-in', role: null, profileError: true });
  });

  it('does not grant an unknown role stored in the profile', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { role: 'admin' }, error: null });
    const { latest } = await renderAuth();
    await emit('SIGNED_IN', session);
    expect(latest()).toMatchObject({ status: 'signed-in', role: null });
  });

  it('signs the user out when Supabase reports SIGNED_OUT', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { role: 'customer' }, error: null });
    const { latest } = await renderAuth();
    await emit('SIGNED_IN', session);
    await emit('SIGNED_OUT', null);
    expect(latest()).toMatchObject({ status: 'signed-out' });
  });

  it('skips the profile lookup on a token refresh', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { role: 'courier' }, error: null });
    await renderAuth();
    await emit('INITIAL_SESSION', session);
    await emit('TOKEN_REFRESHED', session);
    expect(mockMaybeSingle).toHaveBeenCalledTimes(1);
  });

  // covers: AC-10
  it('records an offline launch from the reachability probe', async () => {
    mockReachable = false;
    const { latest } = await renderAuth();
    expect(latest()).toMatchObject({ offline: true });
  });

  it('unsubscribes from auth changes on unmount', async () => {
    const { unmount } = await renderAuth();
    await unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  // covers: AC-14
  it('uses the dev auth stub role in development builds without a session', async () => {
    mockEnv.EXPO_PUBLIC_DEV_AUTH_STUB = 'courier';
    const { latest } = await renderAuth();
    expect(latest()).toMatchObject({ status: 'signed-in', session: null, role: 'courier' });
    expect(latest().onboardingSeen).toBe(true);
  });

  it('ignores the dev auth stub in release builds', async () => {
    mockEnv.EXPO_PUBLIC_DEV_AUTH_STUB = 'customer';
    const g = globalThis as unknown as { __DEV__: boolean };
    const dev = g.__DEV__;
    g.__DEV__ = false;
    try {
      const { latest } = await renderAuth();
      expect(latest()).toMatchObject({ status: 'loading' });
    } finally {
      g.__DEV__ = dev;
    }
  });
});
