import { probeReachable } from '@/features/auth/offline';
import {
  cardDetailsValid,
  cvvValid,
  expiryValid,
  luhnValid,
  mockPaymentProvider,
} from '@/lib/payments/mock-payment-provider';
import type { CardDetails } from '@/lib/payments/payment-provider';

jest.mock('@/features/auth/offline', () => ({
  probeReachable: jest.fn(() => Promise.resolve(true)),
}));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' }));

const reachable = probeReachable as jest.MockedFunction<typeof probeReachable>;

const goodCard: CardDetails = { number: '4242 4242 4242 4242', expiry: '04/29', cvv: '123' };
// Luhn valid and ending 0002: the mock gateway's standing decline.
const declinedCard: CardDetails = { number: '4111111111310002', expiry: '04/29', cvv: '123' };

/** Let the mock gateway finish its pending wait without sleeping the suite. */
async function pay(input: Parameters<typeof mockPaymentProvider.pay>[0]) {
  jest.useFakeTimers();
  const promise = mockPaymentProvider.pay(input);
  await jest.runAllTimersAsync();
  jest.useRealTimers();
  return promise;
}

beforeEach(() => {
  reachable.mockResolvedValue(true);
});

describe('card field checks', () => {
  // covers: AC-11
  it('accepts a Luhn valid number and refuses a mistyped one', () => {
    expect(luhnValid('4242 4242 4242 4242')).toBe(true);
    expect(luhnValid('4242424242424241')).toBe(false);
    expect(luhnValid('424242')).toBe(false);
  });

  // covers: AC-11
  it('needs a real month that has not gone', () => {
    const now = new Date(2026, 10, 1); // 1 November 2026
    expect(expiryValid('04/29', now)).toBe(true);
    expect(expiryValid('04/26', now)).toBe(false);
    expect(expiryValid('13/29', now)).toBe(false);
    expect(expiryValid('April 29', now)).toBe(false);
  });

  // covers: AC-11
  it('needs three or four digits of cvv, and the whole card to agree', () => {
    expect(cvvValid('123')).toBe(true);
    expect(cvvValid('1234')).toBe(true);
    expect(cvvValid('12')).toBe(false);
    expect(cardDetailsValid(goodCard)).toBe(true);
    expect(cardDetailsValid({ ...goodCard, number: '4242424242424241' })).toBe(false);
  });
});

describe('mockPaymentProvider', () => {
  // covers: AC-11
  it('returns a mock reference for a good card', async () => {
    const result = await pay({ amountKobo: 224900, method: 'card', card: goodCard });
    expect(result).toEqual({ ok: true, reference: 'mock_aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' });
  });

  // covers: AC-11
  it('stays pending for about a second and a half before it answers', async () => {
    jest.useFakeTimers();
    const promise = mockPaymentProvider.pay({ amountKobo: 224900, method: 'card', card: goodCard });
    let settled = false;
    void promise.then(() => {
      settled = true;
    });
    await jest.advanceTimersByTimeAsync(1200);
    expect(settled).toBe(false);
    await jest.runAllTimersAsync();
    expect(settled).toBe(true);
    jest.useRealTimers();
    await expect(promise).resolves.toMatchObject({ ok: true });
  });

  // covers: AC-11
  it('always declines the card ending 0002', async () => {
    const result = await pay({ amountKobo: 224900, method: 'card', card: declinedCard });
    expect(result).toEqual({ ok: false, code: 'card_declined' });
  });

  // covers: AC-11
  it('refuses a malformed card before it waits', async () => {
    const result = await pay({
      amountKobo: 224900,
      method: 'card',
      card: { ...goodCard, cvv: '1' },
    });
    expect(result).toEqual({ ok: false, code: 'invalid_card' });
  });

  // covers: AC-12
  it('hands the wallet path a reference too, because pay_order needs one', async () => {
    const result = await pay({ amountKobo: 224900, method: 'wallet' });
    expect(result).toEqual({
      ok: true,
      reference: 'mock_wallet_aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    });
  });

  // covers: AC-18
  it('says offline when Supabase cannot be reached, before any wait', async () => {
    reachable.mockResolvedValue(false);
    const result = await pay({ amountKobo: 224900, method: 'card', card: goodCard });
    expect(result).toEqual({ ok: false, code: 'offline' });
  });
});
