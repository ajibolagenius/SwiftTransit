import { act, render } from '@testing-library/react-native';
import * as React from 'react';

import type { AuthState } from '@/features/auth/guards';

type Listener = (event: string, session: unknown) => void;

const mockUnsubscribe = jest.fn();
const mockMaybeSingle = jest.fn();
const mockEq = jest.fn((..._args: unknown[]) => ({ maybeSingle: mockMaybeSingle }));
let mockListener: Listener = () => {};
const mockEnv: { EXPO_PUBLIC_DEV_AUTH_STUB?: string } = {};

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (fn: Listener) => {
        mockListener = fn;
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      },
    },
    from: () => ({ select: () => ({ eq: mockEq }) }),
  },
}));
jest.mock('@/lib/env', () => ({ env: mockEnv }));

const session = { user: { id: 'user-1' }, access_token: 'token' };

// Renders the provider and reports every state the app would see. The provider is loaded
// fresh per test because it reads the dev stub at import.
async function renderAuth() {
  const { AuthProvider, useAuth } =
    require('@/features/auth/auth-provider') as typeof import('@/features/auth/auth-provider');
  const states: AuthState[] = [];
  function Probe() {
    states.push(useAuth());
    return null;
  }
  const view = await render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
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
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  });

  // covers: AC-4
  it('stays loading until Supabase reports the initial session', async () => {
    const { latest } = await renderAuth();
    expect(latest()).toEqual({ status: 'loading' });
  });

  // covers: AC-4
  it('is signed out when there is no stored session', async () => {
    const { latest } = await renderAuth();
    await emit('INITIAL_SESSION', null);
    expect(latest()).toEqual({ status: 'signed-out' });
  });

  // covers: AC-4
  it.each(['customer', 'courier'] as const)('reads the %s role from the user profile', async (role) => {
    mockMaybeSingle.mockResolvedValue({ data: { role }, error: null });
    const { latest } = await renderAuth();
    await emit('INITIAL_SESSION', session);
    expect(mockEq).toHaveBeenCalledWith('id', 'user-1');
    expect(latest()).toEqual({ status: 'signed-in', session, role });
  });

  it('sends a user without a profile to registration (role null)', async () => {
    const { latest } = await renderAuth();
    await emit('SIGNED_IN', session);
    expect(latest()).toEqual({ status: 'signed-in', session, role: null });
  });

  it('does not grant a role when the profile lookup fails', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'permission denied' } });
    const { latest } = await renderAuth();
    await emit('SIGNED_IN', session);
    expect(latest()).toMatchObject({ status: 'signed-in', role: null });
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
    expect(latest()).toEqual({ status: 'signed-out' });
  });

  it('skips the profile lookup on a token refresh', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { role: 'courier' }, error: null });
    await renderAuth();
    await emit('INITIAL_SESSION', session);
    await emit('TOKEN_REFRESHED', session);
    expect(mockMaybeSingle).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes from auth changes on unmount', async () => {
    const { unmount } = await renderAuth();
    await unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('uses the dev auth stub role in development builds without a session', async () => {
    mockEnv.EXPO_PUBLIC_DEV_AUTH_STUB = 'courier';
    const { latest } = await renderAuth();
    expect(latest()).toEqual({ status: 'signed-in', session: null, role: 'courier' });
  });

  it('ignores the dev auth stub in release builds', async () => {
    mockEnv.EXPO_PUBLIC_DEV_AUTH_STUB = 'customer';
    const g = globalThis as unknown as { __DEV__: boolean };
    const dev = g.__DEV__;
    g.__DEV__ = false;
    try {
      const { latest } = await renderAuth();
      expect(latest()).toEqual({ status: 'loading' });
    } finally {
      g.__DEV__ = dev;
    }
  });
});
