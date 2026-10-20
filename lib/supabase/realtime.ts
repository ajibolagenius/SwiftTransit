import type { RealtimeChannel } from '@supabase/supabase-js';
import { useEffect, useRef } from 'react';

import { supabase } from '@/lib/supabase';

// AC-11: one subscribe-and-invalidate helper for every status-driven screen.
// `orders` is in the realtime publication with per-subscriber RLS (spec 0002);
// `order_events` is not, but every event insert accompanies an orders row
// change, so a row event invalidates that order's events query as well.

type Subscription = { cancel: () => void };

// The realtime client reuses any live channel with the same name, so two
// mounted surfaces (home tab, orders tab, detail) would share one channel and
// the first unmount would removeChannel it for the others. A per-subscription
// suffix keeps every surface's channel independent.
let subscriptionSeq = 0;

export function subscribeToOrderRows(
  userId: string | undefined,
  onRow: (orderId: string) => void,
): Subscription {
  if (!userId) return { cancel: () => {} };
  // Stubbed clients (tests, and any future surface without a realtime socket)
  // degrade to plain query refreshes instead of throwing.
  if (typeof supabase.channel !== 'function' || typeof supabase.removeChannel !== 'function') {
    return { cancel: () => {} };
  }

  subscriptionSeq += 1;
  const channel = supabase.channel(`swifttransit-orders:${userId}:${subscriptionSeq}`);
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'orders', filter: `customer_id=eq.${userId}` },
    (payload) => {
      const next = payload.new as { id?: string } | undefined;
      const previous = payload.old as { id?: string } | undefined;
      const orderId = next?.id ?? previous?.id;
      if (orderId) onRow(orderId);
    },
  );
  channel.subscribe();
  return {
    cancel: () => {
      void supabase.removeChannel(channel as RealtimeChannel);
    },
  };
}

/**
 * Keeps one customer's order surfaces fresh. The invalidate callback owns the
 * query keys so this file stays free of feature knowledge.
 */
export function useOrderRowSubscription(userId: string | undefined, onRow: (orderId: string) => void): void {
  const handler = useRef(onRow);
  handler.current = onRow;
  useEffect(() => {
    const subscription = subscribeToOrderRows(userId, (orderId) => handler.current(orderId));
    return () => subscription.cancel();
  }, [userId]);
}
