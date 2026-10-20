import { useQuery } from '@tanstack/react-query';

import type { HandlingFlag, PackageSize, Place } from './schemas';
import { supabase } from '@/lib/supabase';

// The price is whatever Postgres says it is. Nothing here computes a figure
// the app could argue with (spec 0005 invariant 1).

export type Quote = {
  base_kobo: number;
  route_km: number;
  distance_kobo: number;
  handling_kobo: number;
  total_kobo: number;
};

export type QuoteInput = {
  pickup: Place;
  dropoff: Place;
  size: PackageSize;
  flags: HandlingFlag[];
};

export function quoteKey(input: QuoteInput) {
  return [
    'quote',
    input.pickup.lat,
    input.pickup.lng,
    input.dropoff.lat,
    input.dropoff.lng,
    input.size,
    [...input.flags].sort().join(','),
  ] as const;
}

async function fetchQuote(input: QuoteInput): Promise<Quote> {
  const { data, error } = await supabase.rpc('quote_price', {
    pickup_lat: input.pickup.lat,
    pickup_lng: input.pickup.lng,
    dropoff_lat: input.dropoff.lat,
    dropoff_lng: input.dropoff.lng,
    size: input.size,
    flags: input.flags,
  });
  if (error) throw error;
  return data as unknown as Quote;
}

export function useQuote(input: QuoteInput | null) {
  return useQuery({
    queryKey: input ? quoteKey(input) : ['quote', 'incomplete'],
    enabled: input !== null,
    staleTime: 5 * 60 * 1000,
    queryFn: () => fetchQuote(input as QuoteInput),
  });
}
