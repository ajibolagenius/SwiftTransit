// Spec 0003 error mapping: Supabase auth errors are matched on their message text.
export type AuthProblem = 'invalid' | 'expired' | 'rate_limited' | 'send_failed' | 'offline';

export function describeAuthError(error: unknown): AuthProblem {
  if (error instanceof TypeError) return 'offline'; // fetch failed: no network
  const message = error instanceof Error ? error.message : String(error);
  const text = message.toLowerCase();
  if (text.includes('rate limit') || text.includes('too many requests')) return 'rate_limited';
  if (text.includes('expired')) return 'expired';
  if (text.includes('invalid')) return 'invalid';
  return 'send_failed';
}
