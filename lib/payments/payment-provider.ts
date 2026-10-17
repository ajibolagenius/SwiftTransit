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
};

export type PayErrorCode = 'invalid_card' | 'card_declined' | 'timeout' | 'offline';

export type PayResult = { ok: true; reference: string } | { ok: false; code: PayErrorCode };

export interface PaymentProvider {
  pay(request: PayRequest): Promise<PayResult>;
}
