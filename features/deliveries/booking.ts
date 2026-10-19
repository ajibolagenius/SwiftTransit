import * as Crypto from 'expo-crypto';
import { useMutation, useQuery } from '@tanstack/react-query';

import { mockPaymentProvider } from '@/lib/payments/mock-payment-provider';
import type { CardDetails, PayMethod } from '@/lib/payments/payment-provider';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase/types';

import { useDraftStore } from './draft-store';
import { toOrderDraftJsonb, type DeliveryDraft } from './schemas';

// The booking runs on three definer functions and the mock provider, in that
// order. The client never sets a price, a status, or a balance (invariant 4).

export type Order = Database['public']['Tables']['orders']['Row'];

/** Carries the server's dotted error code, or a `payment.<code>` from the provider. */
export class BookingError extends Error {
  constructor(readonly key: string) {
    super(key);
    this.name = 'BookingError';
  }
}

const CODE_PATTERN = /swifttransit\.[a-z_.]+/;

function serverCode(message: string): string {
  // A message with no code in it came from the transport, not the database, so
  // it is reported as offline rather than as an order that does not exist.
  return CODE_PATTERN.exec(message)?.[0] ?? 'network.offline';
}

async function createOrder(draft: DeliveryDraft, method: PayMethod, idempotencyKey: string): Promise<Order> {
  const { data, error } = await supabase.rpc('create_order', {
    draft: toOrderDraftJsonb(draft, method),
    idempotency_key: idempotencyKey,
  });
  if (error) throw new BookingError(serverCode(error.message));
  if (!data) throw new BookingError('swifttransit.order.not_found');
  return data as unknown as Order;
}

async function payOrder(orderId: string, idempotencyKey: string, reference: string): Promise<Order> {
  const { data, error } = await supabase.rpc('pay_order', {
    order_id: orderId,
    idempotency_key: idempotencyKey,
    payment_reference: reference,
  });
  if (error) throw new BookingError(serverCode(error.message));
  if (!data) throw new BookingError('swifttransit.order.not_found');
  return data as unknown as Order;
}

export type BookingInput = { draft: DeliveryDraft; method: PayMethod; card?: CardDetails };
export type BookingOutcome = { order: Order; method: PayMethod };

export async function book({ draft, method, card }: BookingInput): Promise<BookingOutcome> {
  // The live key is the one in the store, not the one on the input. A retry that
  // arrives with a stale draft (a `pay_order` response that never came back) then
  // replays the order the first attempt created instead of booking a second one.
  let key = useDraftStore.getState().draft.idempotencyKey;
  let created = await createOrder(draft, method, key);

  // The expiry job moves an unpaid order to `cancelled` and a courier failure
  // moves one to `failed`. Replaying either would show a dead booking as a
  // confirmed one, so a draft pointing at one spends a fresh key on a fresh
  // order instead. The new key goes back on the draft, so a retry of this call
  // replays the order it is about to create rather than the dead one.
  if (created.status === 'cancelled' || created.status === 'failed') {
    key = Crypto.randomUUID();
    useDraftStore.getState().update({ idempotencyKey: key });
    created = await createOrder(draft, method, key);
  }

  // A replayed key on an order that already moved past `pending_payment` was
  // paid once. Charging it again would take the money a second time.
  if (created.status !== 'pending_payment') return { order: created, method };

  const result = await mockPaymentProvider.pay({
    amountKobo: created.total_kobo,
    method,
    card,
    idempotencyKey: created.id,
  });
  if (!result.ok) throw new BookingError(`payment.${result.code}`);
  const order = await payOrder(created.id, key, result.reference);
  return { order, method };
}

export function useBookingMutation() {
  return useMutation({
    mutationFn: book,
    retry: 0,
    onSuccess: () => {
      // The key has booked one order. The next booking in this same draft must
      // carry a fresh one, or `create_order` would replay the paid order.
      useDraftStore.getState().update({ idempotencyKey: Crypto.randomUUID() });
    },
  });
}

export function useWalletBalance() {
  return useQuery({
    queryKey: ['wallet-balance'],
    staleTime: 30_000,
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase.rpc('wallet_balance');
      if (error) throw error;
      return Number(data ?? 0);
    },
  });
}
