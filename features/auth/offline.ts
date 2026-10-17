import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';

// Spec 0003 offline rule: navigator.onLine is unreliable in RN; probe Supabase itself.
export async function probeReachable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${env.EXPO_PUBLIC_SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY },
      signal: controller.signal,
    });
    clearTimeout(timer);
    return response.ok;
  } catch {
    return false;
  }
}
