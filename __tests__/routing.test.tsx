import { screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import type { ReactNode } from 'react';

import type { AuthState } from '@/features/auth/guards';

let mockAuth: AuthState = { status: 'loading' };

jest.mock('@/features/auth/auth-provider', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => mockAuth,
}));
jest.mock('@/lib/env', () => ({
  env: {
    EXPO_PUBLIC_MAP_STYLE_LIGHT: 'https://tiles.openfreemap.org/styles/positron',
    EXPO_PUBLIC_MAP_STYLE_DARK: 'https://tiles.openfreemap.org/styles/dark',
  },
}));
jest.mock('../global.css', () => ({})); // NativeWind's CSS is compiled by Metro, not Jest
jest.mock('@maplibre/maplibre-react-native', () => ({ Map: () => null, Camera: () => null }));

const signedIn = (role: 'customer' | 'courier' | null): AuthState => ({
  status: 'signed-in',
  session: null,
  role,
});

// Boots the real app/ route tree as the given user and reports where they land: the top
// level route group and the screen title. (RNTL 14 renders async, and the router store only
// reports the top level group here, so the title pins the exact screen.)
async function bootAs(state: AuthState, initialUrl = '/') {
  mockAuth = state;
  const router = renderRouter('./app', { initialUrl });
  await router;
  const header = await screen.findByRole('header');
  return { area: router.getSegments()[0], title: header.props.children as string };
}

describe('route tree with role based gate', () => {
  // covers: AC-4
  it('lands a signed out user on onboarding', async () => {
    expect(await bootAs({ status: 'signed-out' })).toEqual({ area: '(onboarding)', title: 'Onboarding' });
  });

  // covers: AC-4
  it('lands a signed in customer on the customer home tab', async () => {
    expect(await bootAs(signedIn('customer'))).toEqual({ area: '(customer)', title: 'Home' });
  });

  // covers: AC-4
  it('lands a signed in courier on the courier home tab', async () => {
    expect(await bootAs(signedIn('courier'))).toEqual({ area: '(courier)', title: 'Home' });
  });

  // covers: AC-4
  it('lands a signed in user without a profile on registration', async () => {
    expect(await bootAs(signedIn(null))).toEqual({ area: '(auth)', title: 'Tell us about yourself' });
  });

  it('sends a signed out user who opens a customer link to onboarding', async () => {
    expect(await bootAs({ status: 'signed-out' }, '/orders')).toEqual({
      area: '(onboarding)',
      title: 'Onboarding',
    });
  });

  it('keeps a customer who opens a courier link in the customer area', async () => {
    expect(await bootAs(signedIn('customer'), '/earnings')).toEqual({ area: '(customer)', title: 'Home' });
  });

  it('keeps a courier who opens a customer link in the courier area', async () => {
    expect(await bootAs(signedIn('courier'), '/wallet')).toEqual({ area: '(courier)', title: 'Home' });
  });

  it('renders no screen while the session is loading (splash stays up)', async () => {
    mockAuth = { status: 'loading' };
    await renderRouter('./app');
    expect(screen.queryByRole('header')).toBeNull();
  });
});
