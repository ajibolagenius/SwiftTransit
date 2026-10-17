import { screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import type { ReactNode } from 'react';

import type { AuthState } from '@/features/auth/guards';

let mockAuth: AuthState = { status: 'loading' };

jest.mock('@/features/auth/auth-provider', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => mockAuth,
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/lib/env', () => ({
  env: {
    EXPO_PUBLIC_MAP_STYLE_LIGHT: 'https://tiles.openfreemap.org/styles/positron',
    EXPO_PUBLIC_MAP_STYLE_DARK: 'https://tiles.openfreemap.org/styles/dark',
  },
}));
jest.mock('../global.css', () => ({})); // NativeWind's CSS is compiled by Metro, not Jest
jest.mock('@maplibre/maplibre-react-native', () => ({ Map: () => null, Camera: () => null }));
// Registration pulls in Supabase (and its encrypted SQLite storage), which the router test
// never exercises. A stub keeps that native module out of the route tree render.
jest.mock('@/lib/supabase', () => ({
  supabase: { auth: { updateUser: jest.fn() }, rpc: jest.fn() },
}));

const signedIn = (role: 'customer' | 'courier' | null): AuthState => ({
  status: 'signed-in',
  session: null,
  role,
});

// Boots the real app/ route tree as the given user and reports where they land: the top level
// route group, plus the marker text of the screen that rendered. The marker pins the exact
// screen (the router store only reports the top level group here).
async function bootAs(state: AuthState, marker: string, initialUrl = '/') {
  mockAuth = state;
  const router = renderRouter('./app', { initialUrl });
  await router;
  await screen.findByText(marker);
  return router.getSegments()[0];
}

describe('route tree with role based gate', () => {
  // covers: AC-4
  it('lands a signed out user on onboarding', async () => {
    expect(await bootAs({ status: 'signed-out' }, 'Deliver Anything. Anytime')).toBe('(onboarding)');
  });

  // covers: AC-4
  it('lands a signed in customer on the customer home tab', async () => {
    expect(await bootAs(signedIn('customer'), 'This screen is part of scope feature 6.')).toBe('(customer)');
  });

  // covers: AC-4
  it('lands a signed in courier on the courier home tab', async () => {
    expect(await bootAs(signedIn('courier'), 'This screen is part of scope feature 8.')).toBe('(courier)');
  });

  // covers: AC-4
  it('lands a signed in user without a profile on registration', async () => {
    expect(await bootAs(signedIn(null), 'Tell Us About Yourself')).toBe('(auth)');
  });

  it('sends a signed out user who opens a customer link to onboarding', async () => {
    expect(await bootAs({ status: 'signed-out' }, 'Deliver Anything. Anytime', '/orders')).toBe(
      '(onboarding)',
    );
  });

  it('keeps a customer who opens a courier link in the customer area', async () => {
    expect(await bootAs(signedIn('customer'), 'This screen is part of scope feature 6.', '/earnings')).toBe(
      '(customer)',
    );
  });

  it('keeps a courier who opens a customer link in the courier area', async () => {
    expect(await bootAs(signedIn('courier'), 'This screen is part of scope feature 8.', '/wallet')).toBe(
      '(courier)',
    );
  });

  it('renders no screen while the session is loading (splash stays up)', async () => {
    mockAuth = { status: 'loading' };
    await renderRouter('./app');
    expect(screen.queryByText('Tell Us About Yourself')).toBeNull();
    expect(screen.queryByText('Welcome to SwiftTransit')).toBeNull();
  });
});
