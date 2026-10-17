import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { Place } from './schemas';

// Saved places are a plain client table write under the owner policy from
// spec 0002. The draft carries `addressId` only when the customer picked one.

export type SavedAddress = {
  id: string;
  label: string;
  line: string;
  lat: number;
  lng: number;
};

export function useSavedAddresses() {
  return useQuery({
    queryKey: ['addresses'],
    staleTime: 60_000,
    queryFn: async (): Promise<SavedAddress[]> => {
      const { data, error } = await supabase
        .from('addresses')
        .select('id,label,line,lat,lng')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as SavedAddress[];
    },
  });
}

/** Owner row insert. RLS refuses anything not owned by `auth.uid()`. */
export async function saveAddress(input: { label: string; place: Place }): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error('swifttransit.auth.no_session');
  const { error } = await supabase.from('addresses').insert({
    owner_id: data.session.user.id,
    label: input.label,
    line: input.place.line,
    lat: input.place.lat,
    lng: input.place.lng,
  });
  if (error) throw error;
}
