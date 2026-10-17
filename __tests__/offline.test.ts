import { probeReachable } from '@/features/auth/offline';

const SUPABASE_URL = 'https://project.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_test_key';

jest.mock('@/lib/env', () => ({
  env: {
    EXPO_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_key',
  },
}));
// offline.ts imports the Supabase client but never calls it. Stub it so the real
// encrypted, storage-backed client does not load under Jest.
jest.mock('@/lib/supabase', () => ({ supabase: {} }));

let fetchMock: jest.Mock;

beforeEach(() => {
  fetchMock = jest.fn();
  global.fetch = fetchMock;
});

describe('probeReachable', () => {
  // covers: AC-10
  it('reports reachable when the health endpoint returns ok', async () => {
    fetchMock.mockResolvedValue({ ok: true });
    await expect(probeReachable()).resolves.toBe(true);
  });

  // covers: AC-10
  it('reports offline when the health endpoint returns a non-2xx status', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401 });
    await expect(probeReachable()).resolves.toBe(false);
  });

  // covers: AC-10
  it('reports offline when the request throws, as it does with no network', async () => {
    fetchMock.mockRejectedValue(new Error('Network request failed'));
    await expect(probeReachable()).resolves.toBe(false);
  });

  // covers: AC-10
  // Regression: Supabase GoTrue answers 401 on /auth/v1/health without an apikey, so a
  // probe that omits it always reads as offline and disables every sign-in button.
  it('sends the publishable key as the apikey header the health check requires', async () => {
    fetchMock.mockResolvedValue({ ok: true });
    await probeReachable();
    expect(fetchMock).toHaveBeenCalledWith(
      `${SUPABASE_URL}/auth/v1/health`,
      expect.objectContaining({ headers: { apikey: PUBLISHABLE_KEY } }),
    );
  });
});
