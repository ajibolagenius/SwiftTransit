import { describeAuthError, type AuthProblem } from '@/features/auth/errors';

const PROBLEMS: AuthProblem[] = ['invalid', 'expired', 'rate_limited', 'send_failed', 'offline'];

// Spec 0003 maps Supabase auth failures onto a small set of states the screens understand.
describe('describeAuthError', () => {
  // covers: AC-10
  it('reads a network TypeError as offline before looking at the message', () => {
    expect(describeAuthError(new TypeError('Network request failed'))).toBe('offline');
  });

  it('treats a TypeError as offline even when its text mentions an invalid code', () => {
    expect(describeAuthError(new TypeError('invalid, but really no network'))).toBe('offline');
  });

  // covers: AC-5
  it.each(['Too many requests', 'rate limit exceeded', 'Rate Limited'])(
    'maps %j to rate_limited regardless of case',
    (message) => {
      expect(describeAuthError(new Error(message))).toBe('rate_limited');
    },
  );

  // covers: AC-6
  it('maps an expired token message to expired', () => {
    expect(describeAuthError(new Error('Token has expired'))).toBe('expired');
  });

  it('maps a wrong code message to invalid', () => {
    expect(describeAuthError(new Error('Invalid OTP code'))).toBe('invalid');
  });

  it('checks rate limit before expiry so a combined message stays rate limited', () => {
    expect(describeAuthError(new Error('too many requests, token expired'))).toBe('rate_limited');
  });

  it('checks expiry before invalid so a combined message reads as expired', () => {
    expect(describeAuthError(new Error('invalid or expired code'))).toBe('expired');
  });

  // covers: AC-2, AC-3
  it('returns send_failed for a delivery failure it cannot classify', () => {
    expect(describeAuthError(new Error('gateway refused to send'))).toBe('send_failed');
  });

  it('classifies a thrown non Error value using its string form', () => {
    expect(describeAuthError('invalid signature')).toBe('invalid');
  });

  it('classifies undefined without throwing', () => {
    expect(describeAuthError(undefined)).toBe('send_failed');
  });

  // Security: the category is the only thing exposed, never the provider message or a key.
  it('never leaks the raw error text into the returned problem', () => {
    const problem = describeAuthError(new Error('send failed, key sb_secret_12345'));
    expect(PROBLEMS).toContain(problem);
    expect(problem).not.toMatch(/sb_secret/);
  });

  it('always returns one of the known problem categories', () => {
    for (const input of [new TypeError('x'), new Error('expired'), 'invalid', {}, null, 42]) {
      expect(PROBLEMS).toContain(describeAuthError(input));
    }
  });
});
