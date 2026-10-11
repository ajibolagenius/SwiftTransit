const mockAuth = { startAutoRefresh: jest.fn(), stopAutoRefresh: jest.fn() };
const mockCreateClient = jest.fn((..._args: unknown[]) => ({ auth: mockAuth }));
let mockAppStateListener: (state: string) => void = () => {};

jest.mock('@supabase/supabase-js', () => ({ createClient: mockCreateClient }));
jest.mock('@/lib/env', () => ({
  env: {
    EXPO_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_x',
  },
}));
jest.mock('@/lib/secure-session-storage', () => ({ secureSessionStorage: { name: 'encrypted' } }));

import { AppState } from 'react-native';

import { secureSessionStorage } from '@/lib/secure-session-storage';

jest.spyOn(AppState, 'addEventListener').mockImplementation((_, fn) => {
  mockAppStateListener = fn as (state: string) => void;
  return { remove: jest.fn() };
});
require('@/lib/supabase');

const createClientArgs = mockCreateClient.mock.calls[0] as [string, string, { auth: object }];

describe('supabase client', () => {
  beforeEach(() => jest.clearAllMocks());

  // covers: AC-6
  it('starts from the EXPO_PUBLIC env vars and persists the session in encrypted storage', () => {
    const [url, key, options] = createClientArgs;
    expect(url).toBe('https://abc.supabase.co');
    expect(key).toBe('sb_publishable_x');
    expect(options.auth).toMatchObject({
      storage: secureSessionStorage,
      persistSession: true,
      detectSessionInUrl: false,
    });
  });

  // covers: AC-6
  it('refreshes tokens while the app is in the foreground', () => {
    mockAppStateListener('active');
    expect(mockAuth.startAutoRefresh).toHaveBeenCalledTimes(1);
    expect(mockAuth.stopAutoRefresh).not.toHaveBeenCalled();
  });

  // covers: AC-6
  it.each(['background', 'inactive'])('stops refreshing tokens when the app goes %s', (state) => {
    mockAppStateListener(state);
    expect(mockAuth.stopAutoRefresh).toHaveBeenCalledTimes(1);
    expect(mockAuth.startAutoRefresh).not.toHaveBeenCalled();
  });
});
