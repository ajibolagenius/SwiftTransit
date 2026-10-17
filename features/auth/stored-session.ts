import { env } from '@/lib/env';
import { secureSessionStorage } from '@/lib/secure-session-storage';

// True when a session was persisted at launch (used to tell an expiry from a plain
// sign out, AC-8). Supabase keys the session as `sb-<project-ref>-auth-token`.
export async function hasStoredSession(): Promise<boolean> {
  try {
    const key = `sb-${env.EXPO_PUBLIC_SUPABASE_URL.replace(/^https?:\/\//, '')}-auth-token`;
    return (await secureSessionStorage.getItem(key)) !== null;
  } catch {
    return false;
  }
}
