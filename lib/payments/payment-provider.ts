// The payment boundary (spec 0001: mocked provider). The app talks to this
// interface only, so a real gateway is a swap in `lib/payments/`, not a rewrite
// of the booking flow. Money is integer kobo; nothing here moves real money.

export type PayMethod = 'card' | 'wallet';

export type CardDetails = {
  number: string;
  expiry: string;
  cvv: string;
};

export type PayRequest = {
  amountKobo: number;
  method: PayMethod;
  card?: CardDetails;
  /**
   * The order this charge pays for, stable across every retry of it. An
   * adapter must answer a repeated key with the original charge, never a
   * second one, because a booking whose `pay_order` call was lost is replayed
   * with the same order id.
   */
  idempotencyKey: string;
};

export type PayErrorCode = 'invalid_card' | 'card_declined' | 'timeout' | 'offline';

export type PayResult = { ok: true; reference: string } | { ok: false; code: PayErrorCode };

export interface PaymentProvider {
  pay(request: PayRequest): Promise<PayResult>;
}
