import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase/types';

import { statusesForFilter, type OrderEventRow, type OrderRow } from './status-map';

// Spec 0006 Option 1: plain selects under the row level security from spec 0002.
// The query keys are stable because the realtime helper invalidates by them.

export const PAGE_SIZE = 20;

export type OrderFilter = 'all' | 'active' | 'past';

export type OrdersPage = { rows: OrderRow[]; from: number; to: number };

export const ordersKeys = {
  list: (userId: string | undefined, filter: OrderFilter) => ['orders', filter, userId] as const,
  detail: (id: string) => ['order', id] as const,
  events: (id: string) => ['order-events', id] as const,
  courier: (id: string) => ['order-courier', id] as const,
};

/** Read off the Supabase session, not the auth context, so the dev role stub still resolves. */
export function useSessionUserId(): string | undefined {
  const [userId, setUserId] = useState<string | undefined>(undefined);
  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setUserId(data.session?.user.id);
    });
    return () => {
      active = false;
    };
  }, []);
  return userId;
}

const LIST_COLUMNS =
  'id,tracking_code,type,status,scheduled_at,pickup_line,pickup_lat,pickup_lng,dropoff_line,dropoff_lat,dropoff_lng,receiver_name,receiver_phone,instructions,package_size,weight_kg,handling_flags,scheduled_at,base_kobo,distance_kobo,handling_kobo,total_kobo,payment_method,courier_id,created_at';

export function useOrdersQuery(filter: OrderFilter, enabled = true) {
  const userId = useSessionUserId();
  const ready = enabled && Boolean(userId);

  return useInfiniteQuery({
    queryKey: ordersKeys.list(userId, filter),
    enabled: ready,
    staleTime: 30_000,
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<OrdersPage> => {
      const statuses = statusesForFilter(filter);
      let query = supabase
        .from('orders')
        .select(LIST_COLUMNS)
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);
      if (statuses) query = query.in('status', [...statuses]);
      const { data, error } = await query;
      if (error) throw error;
      return { rows: (data ?? []) as OrderRow[], from: pageParam, to: pageParam + PAGE_SIZE - 1 };
    },
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((n, p) => n + p.rows.length, 0);
      return lastPage.rows.length < PAGE_SIZE ? undefined : loaded;
    },
  });
}

/** AC-4: the detail renders from a fresh select by id. RLS answers with no row for someone else's order. */
export function useOrderDetail(id: string | undefined) {
  return useQuery({
    queryKey: ordersKeys.detail(id ?? ''),
    enabled: Boolean(id),
    staleTime: 30_000,
    queryFn: async (): Promise<OrderRow | null> => {
      const { data, error } = await supabase.from('orders').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return (data as OrderRow | null) ?? null;
    },
  });
}

export function useOrderEvents(id: string | undefined) {
  return useQuery({
    queryKey: ordersKeys.events(id ?? ''),
    enabled: Boolean(id),
    staleTime: 30_000,
    queryFn: async (): Promise<OrderEventRow[]> => {
      const { data, error } = await supabase
        .from('order_events')
        .select('id,order_id,status,actor_id,created_at')
        .eq('order_id', id!)
        .order('created_at', { ascending: true })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as OrderEventRow[];
    },
  });
}

export type CourierInfo = {
  firstName: string;
  lastName: string;
  phone: string | null;
  vehicleType: Database['public']['Enums']['vehicle_type'] | null;
  vehicleNumber: string | null;
};

/** AC-7: name and phone from `profiles` (participants may read it), vehicle from the `courier_vehicle` rpc. */
export function useOrderCourier(order: OrderRow | null | undefined) {
  return useQuery({
    queryKey: ordersKeys.courier(order?.id ?? ''),
    enabled: Boolean(order?.courier_id),
    staleTime: 30_000,
    queryFn: async (): Promise<CourierInfo | null> => {
      if (!order?.courier_id) return null;
      const [{ data: profile, error: profileError }, { data: vehicle, error: vehicleError }] =
        await Promise.all([
          supabase
            .from('profiles')
            .select('first_name,last_name,phone')
            .eq('id', order.courier_id)
            .maybeSingle(),
          supabase.rpc('courier_vehicle', { order_id: order.id }),
        ]);
      if (profileError) throw profileError;
      // `courier_vehicle` returns a table, so the RPC answers with an array.
      // No rows means no vehicle yet, not a failure: the card shows without it.
      if (vehicleError) throw vehicleError;
      const v = (
        (vehicle ?? []) as {
          vehicle_type: Database['public']['Enums']['vehicle_type'];
          vehicle_number: string;
        }[]
      )[0];
      return {
        firstName: profile?.first_name ?? '',
        lastName: profile?.last_name ?? '',
        phone: profile?.phone ?? null,
        vehicleType: v?.vehicle_type ?? null,
        vehicleNumber: v?.vehicle_number ?? null,
      };
    },
  });
}
