import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

import { ordersKeys } from './queries';

// AC-9: the only write this feature makes. The status machine and the refund
// live in `change_order_status`; the client asks, the server decides. The
// caller maps `key` onto copy through `errorLabel`, like the booking flow.

export class CancelError extends Error {
  constructor(readonly key: string) {
    super(key);
    this.name = 'CancelError';
  }
}

const CODE_PATTERN = /swifttransit\.[a-z_.]+/;

function serverCode(message: string): string {
  // No code in the message means the transport failed, not the policy refused.
  return CODE_PATTERN.exec(message)?.[0] ?? 'network.offline';
}

export function useCancelOrder(orderId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<void> => {
      if (!orderId) throw new CancelError('swifttransit.order.not_found');
      const { data, error } = await supabase.rpc('change_order_status', {
        order_id: orderId,
        new_status: 'cancelled',
      });
      if (error) throw new CancelError(serverCode(error.message));
      if (!data) throw new CancelError('swifttransit.order.not_found');
    },
    retry: 0,
    onSuccess: () => {
      if (orderId) {
        void queryClient.invalidateQueries({ queryKey: ordersKeys.detail(orderId) });
        void queryClient.invalidateQueries({ queryKey: ordersKeys.events(orderId) });
      }
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
