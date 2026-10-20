import { useQueryClient } from '@tanstack/react-query';

import { useOrderRowSubscription } from '@/lib/supabase/realtime';

import { ordersKeys } from './queries';

// AC-11: one subscription per mounted surface. A change to any of this
// customer's order rows invalidates the list, and when the change is the order
// on screen (or the screen shows no single order), its detail, events and
// courier read too, so a new timeline step appears without a manual refresh.
export function useOrderFreshness(userId: string | undefined, openOrderId?: string) {
  const queryClient = useQueryClient();

  useOrderRowSubscription(userId, (changedId) => {
    void queryClient.invalidateQueries({ queryKey: ['orders'] });
    if (openOrderId && changedId !== openOrderId) return;
    void queryClient.invalidateQueries({ queryKey: ordersKeys.detail(changedId) });
    void queryClient.invalidateQueries({ queryKey: ordersKeys.events(changedId) });
    void queryClient.invalidateQueries({ queryKey: ordersKeys.courier(changedId) });
  });
}
