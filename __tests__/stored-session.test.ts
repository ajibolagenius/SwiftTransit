import { hasStoredSession } from '@/features/auth/stored-session';

const mockGetItem = jest.fn();

jest.mock('@/lib/env', () => ({
  env: { EXPO_PUBLIC_SUPABASE_URL: 'https://abcd1234.supabase.co' },
}));
jest.mock('@/lib/secure-session-storage', () => ({
  secureSessionStorage: { getItem: (...args: unknown[]) => mockGetItem(...args) },
}));

describe('hasStoredSession', () => {
  beforeEach(() => mockGetItem.mockReset());

  // covers: AC-8
  // Regression: Supabase persists the session under `sb-<project-ref>-auth-token` (the first
  // hostname label). Deriving the key from the full host never matches, so a stored session
  // read as absent and the expired-session banner never fires.
  it('reads the session under the same key Supabase writes it to', async () => {
    mockGetItem.mockResolvedValue('{"access_token":"x"}');
    await hasStoredSession();
    expect(mockGetItem).toHaveBeenCalledWith('sb-abcd1234-auth-token');
  });

  // covers: AC-8
  it('returns true when a session is stored', async () => {
    mockGetItem.mockResolvedValue('{"access_token":"x"}');
    await expect(hasStoredSession()).resolves.toBe(true);
  });

  // covers: AC-8
  it('returns false when nothing is stored', async () => {
    mockGetItem.mockResolvedValue(null);
    await expect(hasStoredSession()).resolves.toBe(false);
  });

  // covers: AC-8
  it('returns false when storage throws', async () => {
    mockGetItem.mockRejectedValue(new Error('keychain unavailable'));
    await expect(hasStoredSession()).resolves.toBe(false);
  });
});
