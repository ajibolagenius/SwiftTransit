import { probeReachable } from '@/features/auth/offline';
import type { CardDetails, PaymentProvider, PayRequest, PayResult } from './payment-provider';

// AC-11, AC-18: a fake gateway with stable rules. About 1.5 seconds pending, a
// `mock_` reference, a card ending 0002 that always declines, an offline block,
// and one reference per idempotency key. No real card works here and no money
// moves.

const PENDING_MS = 1500;
const DECLINE_SUFFIX = '0002';

// A gateway keeps its own record of what a key already paid for, so a retry
// after a lost response cannot take the money twice. This mock has no server to
// hold that record, so the reference is derived from the key instead. The
// replay answer then survives anything the app does, including a restart.
const referenceFor = (key: string, method: PayRequest['method']) =>
  `mock_${method === 'wallet' ? 'wallet_' : ''}${key}`;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function luhnValid(input: string): boolean {
  const digits = input.replace(/\D/g, '');
  if (digits.length < 12) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    const value = Number(digits[i]);
    const added = double ? (value * 2 > 9 ? value * 2 - 9 : value * 2) : value;
    sum += added;
    double = !double;
  }
  return sum % 10 === 0;
}

/** MM/YY, a real month, and not in the past. */
export function expiryValid(input: string, now = new Date()): boolean {
  const match = /^(\d{2})\/(\d{2})$/.exec(input.trim());
  if (!match) return false;
  const month = Number(match[1]);
  if (month < 1 || month > 12) return false;
  const year = 2000 + Number(match[2]);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
  return endOfMonth.getTime() >= now.getTime();
}

export function cvvValid(input: string): boolean {
  return /^\d{3,4}$/.test(input.trim());
}

export function cardDetailsValid(card: CardDetails): boolean {
  return luhnValid(card.number) && expiryValid(card.expiry) && cvvValid(card.cvv);
}

export const mockPaymentProvider: PaymentProvider = {
  async pay(request: PayRequest): Promise<PayResult> {
    if (!(await probeReachable())) return { ok: false, code: 'offline' };

    if (request.method === 'wallet') {
      await wait(PENDING_MS);
      return { ok: true, reference: referenceFor(request.idempotencyKey, 'wallet') };
    }

    const card = request.card;
    if (!card || !cardDetailsValid(card)) return { ok: false, code: 'invalid_card' };

    await wait(PENDING_MS);
    if (card.number.replace(/\D/g, '').endsWith(DECLINE_SUFFIX)) return { ok: false, code: 'card_declined' };
    return { ok: true, reference: referenceFor(request.idempotencyKey, 'card') };
  },
};
