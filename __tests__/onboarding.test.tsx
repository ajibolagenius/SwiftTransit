import { fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import type { ReactNode } from 'react';

const mockMarkSeen = jest.fn();

jest.mock('@/features/auth/auth-provider', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => ({
    status: 'signed-out',
    offline: false,
    refresh: jest.fn(),
    markOnboardingSeen: mockMarkSeen,
  }),
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
jest.mock('@/lib/supabase', () => ({
  supabase: { auth: { updateUser: jest.fn() }, rpc: jest.fn() },
}));

async function bootOnboarding() {
  await renderRouter('./app', { initialUrl: '/' });
  await screen.findByText('Deliver Anything. Anytime');
}

describe('onboarding carousel (AC-1)', () => {
  beforeEach(() => mockMarkSeen.mockClear());

  // covers: AC-1
  it('shows all three slides', async () => {
    await bootOnboarding();
    expect(screen.getByText('Deliver Anything. Anytime')).toBeTruthy();
    expect(screen.getByText('Create a Delivery in Seconds')).toBeTruthy();
    expect(screen.getByText('Track Every Step')).toBeTruthy();
  });

  // covers: AC-1
  it('offers a Next action and a Jump to Sign in skip link', async () => {
    await bootOnboarding();
    expect(screen.getByText('Next')).toBeTruthy();
    expect(screen.getByText('Jump to Sign in')).toBeTruthy();
  });

  // covers: AC-1
  it('marks the carousel seen and moves to sign-in when the skip link is used', async () => {
    await bootOnboarding();
    fireEvent.press(screen.getByText('Jump to Sign in'));
    await screen.findByText('Welcome to SwiftTransit');
    expect(mockMarkSeen).toHaveBeenCalledTimes(1);
  });
});
