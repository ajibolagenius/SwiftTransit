// geo: place names for the booking wizard (spec 0005 task 4).
// Autocomplete and reverse geocoding only. Routing arrives with feature 10,
// which adds an action here rather than inventing a second function.
//
// The caller's own Supabase token is verified before a single Geoapify credit
// is spent, so a stranger cannot drain the 3,000 credit daily quota through
// this project. The upstream key never leaves the function.
//
// POST /functions/v1/geo, Authorization: Bearer <user JWT>
// body: { action: 'autocomplete', text, bias? } | { action: 'reverse', lat, lng }

import { Client } from 'https://esm.sh/@supabase/supabase-js@2';

type GeoapifyResult = {
  place_id?: string;
  name?: string;
  street?: string;
  suburb?: string;
  city?: string;
  state?: string;
  country?: string;
  country_code?: string;
  address_line?: string;
  lat?: number;
  lon?: number;
};

type Prediction = {
  placeId: string;
  name: string;
  line: string;
  lat: number;
  lng: number;
};

// Nigerial first: the product books deliveries in Lagos, so a search for
// "Ikeja" must not have to compete with an Ikeja somewhere else.
const BIAS_COUNTRY = 'ng';

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

function fail(error: string, status: number) {
  return json({ error }, status);
}

function lineFor(r: GeoapifyResult): string {
  if (r.address_line) return r.address_line;
  return [r.street, r.suburb, r.city, r.state].filter(Boolean).join(', ');
}

function nameFor(r: GeoapifyResult, index: number): string {
  if (r.name) return r.name;
  const line = lineFor(r);
  return line.split(',')[0] ?? `Place ${index + 1}`;
}

function toPrediction(r: GeoapifyResult, index: number): Prediction | null {
  if (typeof r.lat !== 'number' || typeof r.lon !== 'number') return null;
  return {
    placeId: r.place_id ?? String(index),
    name: nameFor(r, index),
    line: lineFor(r),
    lat: r.lat,
    lng: r.lon,
  };
}

async function callGeoapify(path: string, params: Record<string, string>): Promise<Response> {
  const key = Deno.env.get('GEOAPIFY_API_KEY');
  if (!key) throw new Error('geo.no_key');
  const query = new URLSearchParams({ ...params, apiKey: key });
  return await fetch(`https://api.geoapify.com/v1/${path}?${query}`, {
    headers: { Accept: 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return fail('method not allowed', 405);
  }

  const token = req.headers.get('Authorization')?.split(' ')[1];
  if (!token) return fail('swifttransit.auth.no_session', 401);

  const userClient = new Client(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return fail('swifttransit.auth.invalid_session', 401);

  let body: { action?: string; text?: string; lat?: number; lng?: number; bias?: string };
  try {
    body = await req.json();
  } catch {
    return fail('geo.bad_request', 400);
  }

  let upstream: Response;
  try {
    if (body.action === 'autocomplete') {
      const text = (body.text ?? '').trim();
      if (text.length < 2) return json({ predictions: [] });
      upstream = await callGeoapify('geocode/autocomplete', {
        text,
        bias: `country:${body.bias ?? BIAS_COUNTRY}`,
        limit: '6',
      });
    } else if (body.action === 'reverse') {
      if (typeof body.lat !== 'number' || typeof body.lng !== 'number') {
        return fail('geo.bad_request', 400);
      }
      upstream = await callGeoapify('geocode/reverse', {
        lat: String(body.lat),
        lon: String(body.lng),
        accuracy: 'street_address',
      });
    } else {
      return fail('geo.bad_request', 400);
    }
  } catch (error) {
    // The only failure this branch can raise is a missing key, and its message
    // is ours, so nothing upstream leaks to the caller.
    if (error instanceof Error && error.message === 'geo.no_key') {
      return fail('geo.no_key', 503);
    }
    return fail('geo.upstream', 502);
  }

  if (upstream.status === 429) return fail('geo.quota', 429);
  if (!upstream.ok) return fail('geo.upstream', 502);

  const payload = (await upstream.json().catch(() => null)) as { results?: GeoapifyResult[] } | null;
  const results = payload?.results ?? [];

  if (body.action === 'reverse') {
    const place = toPrediction(results[0] ?? {}, 0);
    // A pin over open water is still a place the customer can book from; the
    // coordinates are the truth and the name is decoration.
    return json({
      place: place ?? {
        placeId: 'pin',
        name: '',
        line: '',
        lat: body.lat,
        lng: body.lng,
      },
    });
  }

  const predictions = results.map(toPrediction).filter((p): p is Prediction => p !== null);
  return json({ predictions });
});
