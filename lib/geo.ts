import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

// Place names come from the `geo` Edge Function, which spends Geoapify
// credits. One request per pause in typing, never one per keystroke (AC-4).

export type PlacePrediction = {
  placeId: string;
  name: string;
  line: string;
  lat: number;
  lng: number;
};

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

/** A typed error carrying the function's error key, so the UI can translate it. */
export class GeoError extends Error {
  constructor(readonly key: string) {
    super(key);
    this.name = 'GeoError';
  }
}

async function invokeGeo<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('geo', { body });
  if (error) {
    const context = (error as { context?: Response }).context;
    const payload = (await context?.json().catch(() => null)) as { error?: string } | null;
    throw new GeoError(payload?.error ?? 'geo.upstream');
  }
  return data as T;
}

export async function reverseGeocode(lat: number, lng: number): Promise<PlacePrediction> {
  const { place } = await invokeGeo<{ place: PlacePrediction }>({ action: 'reverse', lat, lng });
  return place;
}

export function usePlaceSearch(text: string) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const trimmed = text.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setQuery('');
      return;
    }
    const timer = setTimeout(() => setQuery(trimmed), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text]);

  const search = useQuery({
    queryKey: ['geo', 'autocomplete', query],
    enabled: query.length >= MIN_QUERY_LENGTH,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { predictions } = await invokeGeo<{ predictions: PlacePrediction[] }>({
        action: 'autocomplete',
        text: query,
      });
      return predictions;
    },
  });

  return {
    predictions: search.data ?? [],
    loading: query.length >= MIN_QUERY_LENGTH && search.isFetching,
    errorKey: search.isError ? (search.error as GeoError).key : null,
    retry: search.refetch,
  };
}
