const mockPlain = new Map<string, string>();
const mockSecure = new Map<string, string>();

jest.mock('expo-sqlite/kv-store', () => ({
  getItem: async (k: string) => mockPlain.get(k) ?? null,
  setItem: async (k: string, v: string) => void mockPlain.set(k, v),
  removeItem: async (k: string) => void mockPlain.delete(k),
}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: async (k: string) => mockSecure.get(k) ?? null,
  setItemAsync: async (k: string, v: string) => void mockSecure.set(k, v),
  deleteItemAsync: async (k: string) => void mockSecure.delete(k),
}));
jest.mock('expo-crypto', () => ({
  getRandomBytes: (n: number) => crypto.getRandomValues(new Uint8Array(n)),
}));

import { secureSessionStorage } from '@/lib/secure-session-storage';

const session = JSON.stringify({ access_token: 'eyJ.secret.token', refresh_token: 'refresh-123' });

describe('secureSessionStorage', () => {
  beforeEach(() => {
    mockPlain.clear();
    mockSecure.clear();
  });

  it('round-trips the session', async () => {
    await secureSessionStorage.setItem('sb-auth', session);
    expect(await secureSessionStorage.getItem('sb-auth')).toBe(session);
  });

  it('never writes the token in mockPlain storage', async () => {
    await secureSessionStorage.setItem('sb-auth', session);
    expect(mockPlain.get('sb-auth')).not.toContain('secret');
    expect(mockPlain.get('sb-auth')).not.toContain('refresh-123');
  });

  it('uses a fresh key for every write', async () => {
    await secureSessionStorage.setItem('sb-auth', session);
    const first = mockSecure.get('sb-auth.key');
    await secureSessionStorage.setItem('sb-auth', session);
    expect(mockSecure.get('sb-auth.key')).not.toBe(first);
  });

  it('returns null when nothing is stored', async () => {
    expect(await secureSessionStorage.getItem('sb-auth')).toBeNull();
  });

  // Keychain/Keystore can be wiped (reinstall, restore) while SQLite survives.
  it('returns null instead of throwing when the key is gone', async () => {
    await secureSessionStorage.setItem('sb-auth', session);
    mockSecure.clear();
    expect(await secureSessionStorage.getItem('sb-auth')).toBeNull();
  });

  it('keeps separate entries apart', async () => {
    await secureSessionStorage.setItem('a', 'first');
    await secureSessionStorage.setItem('b', 'second');
    expect(await secureSessionStorage.getItem('a')).toBe('first');
    expect(await secureSessionStorage.getItem('b')).toBe('second');
  });

  it('round-trips non ASCII text (Nigerian names)', async () => {
    const value = JSON.stringify({ name: 'Adébáyọ̀ Ọlọ́rúnṣọlá', note: '₦12,500' });
    await secureSessionStorage.setItem('sb-auth', value);
    expect(await secureSessionStorage.getItem('sb-auth')).toBe(value);
  });

  it('removes both the ciphertext and the key', async () => {
    await secureSessionStorage.setItem('sb-auth', session);
    await secureSessionStorage.removeItem('sb-auth');
    expect(await secureSessionStorage.getItem('sb-auth')).toBeNull();
    expect(mockSecure.size).toBe(0);
  });
});
