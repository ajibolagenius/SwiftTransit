import { makeRedirectUri } from 'expo-auth-session';

import { supabase } from '@/lib/supabase';

export type OAuthProvider = 'google' | 'apple';

// Supabase's mobile PKCE flow. signInWithOAuth with skipBrowserRedirect builds the
// authorize URL and stores the code verifier in the encrypted session storage (spec 0001);
// exchangeCodeForSession reads it back once the browser returns the code to our scheme.
export async function buildAuthorizeUrl(provider: OAuthProvider): Promise<string> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      skipBrowserRedirect: true,
      redirectTo: makeRedirectUri({ path: 'auth/callback', queryParams: { provider } }),
    },
  });
  if (error || !data?.url) throw error ?? new Error('oauth session unavailable');
  return data.url;
}

export async function exchangeCallbackUrl(callbackUrl: string) {
  const code = new URL(callbackUrl).searchParams.get('code');
  if (!code) throw new Error('invalid oauth callback');
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
}
