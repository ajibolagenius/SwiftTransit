// Integration tests for the geo Edge Function (spec 0005: AC-3, AC-4, AC-19).
//
// The function is Deno code that this repo does not typecheck or run, so the
// suite captures the handler passed to Deno.serve and stands in the two things
// the function reaches out to: the caller's Supabase session and the Geoapify
// HTTP calls. Everything between those boundaries runs for real.
//
// These cases exist because of a shipped bug: the reader looked for places
// under `results`, while Geoapify answers both endpoints as GeoJSON with the
// places under `features` and each place's fields under `properties`. A
// correctly authenticated search therefore returned an empty list. The bias
// value was also wrong (`country:ng` instead of `countrycode:ng`), which Geoapify
// rejects with a 400 before it answers anything.

const SUPABASE_MODULE = 'https://esm.sh/@supabase/supabase-js@2';

type Json = Record<string, unknown>;

// package.json maps the esm.sh specifier above to this stand in, because the
// edge runtime resolves a URL and Node does not. `state.session` is what the
// fake `getUser` answers with.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const supabaseMock = require(SUPABASE_MODULE) as {
  state: { session: { data: { user: { id: string } | null }; error: { message: string } | null } };
};

let mockFetch: jest.Mock;
let mockEnv: Record<string, string | undefined>;
let handler: Handler;

type Handler = (req: unknown) => Promise<Response>;

beforeAll(() => {
  // `require` runs the module now rather than at file top, so Deno exists by the
  // time Deno.serve is called, and the captured handler is the real one.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('./index');
});

beforeEach(() => {
  mockEnv = {
    GEOAPIFY_API_KEY: 'test-key',
    SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_ANON_KEY: 'anon-key',
  };
  supabaseMock.state.session = { data: { user: { id: 'customer-1' } }, error: null };
  mockFetch = jest.fn();
  globalThis.fetch = mockFetch as unknown as typeof fetch;
});

// Installed before the module under test loads, because Deno.env.get is called
// inside the handler and needs to see the per test environment.
(globalThis as Json).Deno = {
  serve: (h: Handler) => {
    handler = h;
  },
  env: { get: (name: string) => mockEnv?.[name] },
};

// Places default to Nigerian, because that is what Geoapify answers for a Lagos
// search. A case passes `country_code` to say otherwise, or set it to undefined
// to reproduce an answer with no country code at all.
function feature(props: Json, lng = 3.38, lat = 6.6) {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [lng, lat] },
    properties: { country_code: 'ng', ...props },
  };
}

function foreignFeature(name: string, placeId: string, lat: number, lon: number) {
  return feature(
    { place_id: placeId, name, formatted: `${name}, Japan`, country_code: 'jp', lat, lon },
    lon,
    lat,
  );
}

function autocompleteBody(placeList: unknown[]) {
  return { type: 'FeatureCollection', query: ['ikeja'], features: placeList };
}

function ikejaFeatures(): unknown[] {
  return [
    feature(
      {
        place_id: '101',
        name: 'Ikeja City Mall',
        formatted: 'Ikeja City Mall, Lagos-Ibadan Expressway, Ikeja 100001, LA, Nigeria',
        street: 'Lagos-Ibadan Expressway',
        suburb: 'Ikeja',
        city: 'Lagos',
        state: 'LA',
        country_code: 'ng',
        lat: 6.6018,
        lon: 3.3515,
      },
      3.3515,
      6.6018,
    ),
    feature(
      {
        place_id: '102',
        name: 'Ikeja GRA',
        formatted: 'Ikeja GRA, Ikeja, LA, Nigeria',
        lat: 6.588,
        lon: 3.362,
      },
      3.362,
      6.588,
    ),
    feature(
      {
        place_id: '103',
        name: 'Ikeja Computer Village',
        formatted: 'Computer Village, Ikeja, LA, Nigeria',
        lat: 6.59,
        lon: 3.37,
      },
      3.37,
      6.59,
    ),
    feature(
      { place_id: '104', name: 'Ogba', formatted: 'Ogba, Ikeja, LA, Nigeria', lat: 6.54, lon: 3.335 },
      3.335,
      6.54,
    ),
    feature(
      {
        place_id: '105',
        name: 'Allen Avenue',
        formatted: 'Allen Avenue, Ikeja, LA, Nigeria',
        lat: 6.596,
        lon: 3.345,
      },
      3.345,
      6.596,
    ),
    feature(
      {
        place_id: '106',
        name: 'Ikeja Bus Station',
        formatted: 'Ikeja Motor Terminal, Ikeja, LA, Nigeria',
        lat: 6.599,
        lon: 3.351,
      },
      3.351,
      6.599,
    ),
  ];
}

function call(body: unknown, options: { token?: string | null; method?: string } = {}): Promise<Response> {
  const method = options.method ?? 'POST';
  const token = options.token === undefined ? 'valid-token' : options.token;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const request = {
    method,
    headers: new Headers(headers),
    json: () => Promise.resolve(body),
  };
  return handler(request);
}

function upstreamOk(payload: unknown) {
  return { ok: true, status: 200, json: () => Promise.resolve(payload) };
}

async function jsonOf(res: Response): Promise<Json> {
  return (await res.json()) as Json;
}

describe('geo autocomplete', () => {
  it('asks Geoapify for the search text biased to Nigeria (AC-4)', async () => {
    mockFetch.mockResolvedValue(upstreamOk(autocompleteBody(ikejaFeatures())));

    const res = await call({ action: 'autocomplete', text: 'Ikeja' });

    expect(res.status).toBe(200);
    const url = new URL(mockFetch.mock.calls[0][0]);
    expect(url.pathname).toBe('/v1/geocode/autocomplete');
    expect(url.searchParams.get('text')).toBe('Ikeja');
    // `country:ng` is not a spelling Geoapify accepts, and the old value made
    // every search a 400.
    expect(url.searchParams.get('bias')).toBe('countrycode:ng');
    expect(url.searchParams.get('limit')).toBe('6');
  });

  it('returns one prediction per GeoJSON feature (AC-3)', async () => {
    mockFetch.mockResolvedValue(upstreamOk(autocompleteBody(ikejaFeatures())));

    const body = await jsonOf(await call({ action: 'autocomplete', text: 'Ikeja' }));

    const predictions = body.predictions as Json[];
    expect(predictions).toHaveLength(6);
    expect(predictions[0]).toMatchObject({
      placeId: '101',
      name: 'Ikeja City Mall',
      line: 'Ikeja City Mall, Lagos-Ibadan Expressway, Ikeja 100001, LA, Nigeria',
      lat: 6.6018,
      lng: 3.3515,
    });
  });

  it('returns nothing for a results shaped payload, because Geoapify answers as GeoJSON (AC-3)', async () => {
    // The shape the function read before the fix. Pinning it empty keeps the
    // parser honest: only the GeoJSON keys may produce places.
    mockFetch.mockResolvedValue(upstreamOk({ results: ikejaFeatures() }));

    const body = await jsonOf(await call({ action: 'autocomplete', text: 'Ikeja' }));

    expect(body.predictions).toEqual([]);
  });

  it('drops a feature with no coordinates (AC-3)', async () => {
    const features = ikejaFeatures();
    features[0] = feature({ place_id: '101', name: 'Nowhere Without Coordinates' });
    features[1] = feature({ place_id: '107', name: 'Also coordinate free', lat: undefined, lon: undefined });
    mockFetch.mockResolvedValue(upstreamOk(autocompleteBody(features)));

    const body = await jsonOf(await call({ action: 'autocomplete', text: 'Ikeja' }));

    expect(body.predictions).toHaveLength(4);
  });

  it('drops places known to be in another country when a local one matched (AC-4)', async () => {
    // The live answer for "Ikeja": two Nigerian places and four in Japan, in
    // that order, because `bias` only nudges Geoapify's ranking.
    const live = [
      feature(
        { place_id: '101', name: 'Ikeja', formatted: 'Ikeja, LA, Nigeria', lat: 6.5975, lon: 3.3433 },
        3.3433,
        6.5975,
      ),
      foreignFeature('Ikeda', '501', 34.8217, 135.4284),
      foreignFeature('Ikeda', '502', 42.9288, 143.4485),
      feature(
        {
          place_id: '102',
          name: 'Ikija',
          formatted: 'Ikija, Degesin, OG, Nigeria',
          lat: 7.0333,
          lon: 3.3167,
        },
        3.3167,
        7.0333,
      ),
      foreignFeature('Ikeda', '503', 36.4213, 137.8746),
    ];
    mockFetch.mockResolvedValue(upstreamOk(autocompleteBody(live)));

    const body = await jsonOf(await call({ action: 'autocomplete', text: 'Ikeja' }));

    const predictions = body.predictions as Json[];
    expect(predictions.map((p) => p.name)).toEqual(['Ikeja', 'Ikija']);
    expect(JSON.stringify(predictions)).not.toContain('Japan');
  });

  it('keeps the foreign places when nothing matched in Nigeria (AC-4)', async () => {
    mockFetch.mockResolvedValue(
      upstreamOk(
        autocompleteBody([
          foreignFeature('Ikeda', '501', 34.8217, 135.4284),
          foreignFeature('Ariana', '502', 36.078, 136.992),
        ]),
      ),
    );

    const body = await jsonOf(await call({ action: 'autocomplete', text: 'Ikeda' }));

    expect(body.predictions).toHaveLength(2);
  });

  it('keeps a place whose answer carries no country code (AC-4)', async () => {
    // Geoapify omits the field on some valid local answers, so an unknown
    // country is not evidence of a foreign one.
    mockFetch.mockResolvedValue(
      upstreamOk(
        autocompleteBody([
          feature(
            { place_id: '101', name: 'Ikeja', formatted: 'Ikeja, LA, Nigeria', lat: 6.5975, lon: 3.3433 },
            3.3433,
            6.5975,
          ),
          feature(
            {
              place_id: '601',
              name: 'Adeola Odeku',
              formatted: 'Adeola Odeku Street, Victoria Island, LA',
              country_code: undefined,
              lat: 6.4282,
              lon: 3.4341,
            },
            3.4341,
            6.4282,
          ),
          foreignFeature('Ikeda', '501', 34.8217, 135.4284),
        ]),
      ),
    );

    const body = await jsonOf(await call({ action: 'autocomplete', text: 'Adeola' }));

    expect((body.predictions as Json[]).map((p) => p.placeId)).toEqual(['101', '601']);
  });

  it('names a place from its address line when Geoapify sends no name (AC-3)', async () => {
    mockFetch.mockResolvedValue(
      upstreamOk(
        autocompleteBody([
          feature(
            {
              place_id: '201',
              formatted: '14 Adeola Odeku Street, Victoria Island, LA, Nigeria',
              lat: 6.4282,
              lon: 3.4341,
            },
            3.4341,
            6.4282,
          ),
        ]),
      ),
    );

    const body = await jsonOf(await call({ action: 'autocomplete', text: 'Adeola' }));

    const predictions = body.predictions as Json[];
    expect(predictions[0].name).toBe('14 Adeola Odeku Street');
    expect(predictions[0].line).toBe('14 Adeola Odeku Street, Victoria Island, LA, Nigeria');
  });

  it('sends no request when the text is shorter than two characters (AC-4)', async () => {
    const body = await jsonOf(await call({ action: 'autocomplete', text: 'I' }));

    expect(body.predictions).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('keeps the upstream key out of the response (AC-19)', async () => {
    mockFetch.mockResolvedValue(upstreamOk(autocompleteBody(ikejaFeatures())));

    const text = JSON.stringify(await jsonOf(await call({ action: 'autocomplete', text: 'Ikeja' })));

    expect(text).not.toContain('test-key');
  });
});

describe('geo reverse', () => {
  it('leaves the answer alone wherever the pin is (AC-3)', async () => {
    // The country filter belongs to search only: a pin the customer dropped is
    // the truth, even in a country this app does not serve.
    mockFetch.mockResolvedValue(
      upstreamOk({
        type: 'FeatureCollection',
        features: [foreignFeature('Ikeda', '501', 34.8217, 135.4284)],
      }),
    );

    const body = await jsonOf(await call({ action: 'reverse', lat: 34.8217, lng: 135.4284 }));

    expect(body.place).toMatchObject({ name: 'Ikeda', lat: 34.8217, lng: 135.4284 });
  });

  it('turns a map pin into a named place (AC-3)', async () => {
    mockFetch.mockResolvedValue(
      upstreamOk({
        type: 'FeatureCollection',
        features: [
          feature({
            place_id: '301',
            name: 'Tizeti HQ Test Address',
            formatted: 'Tizeti HQ Test Address, Eletu Odibo Street, Ikeja 102216, LA, Nigeria',
            lat: 6.5986,
            lon: 3.343,
          }),
        ],
      }),
    );

    const body = await jsonOf(await call({ action: 'reverse', lat: 6.5986, lng: 3.343 }));

    const place = body.place as Json;
    expect(place).toMatchObject({
      placeId: '301',
      name: 'Tizeti HQ Test Address',
      line: 'Tizeti HQ Test Address, Eletu Odibo Street, Ikeja 102216, LA, Nigeria',
      lat: 6.5986,
      lng: 3.343,
    });
    const url = new URL(mockFetch.mock.calls[0][0]);
    expect(url.pathname).toBe('/v1/geocode/reverse');
    expect(url.searchParams.get('lat')).toBe('6.5986');
    expect(url.searchParams.get('lon')).toBe('3.343');
  });

  it('keeps the coordinates when the pin sits over open water (AC-3)', async () => {
    mockFetch.mockResolvedValue(upstreamOk({ type: 'FeatureCollection', features: [] }));

    const body = await jsonOf(await call({ action: 'reverse', lat: 4.5, lng: 6.9 }));

    expect(body.place).toMatchObject({ placeId: 'pin', name: '', line: '', lat: 4.5, lng: 6.9 });
  });

  it('rejects a reverse call with no coordinates (AC-19)', async () => {
    const res = await call({ action: 'reverse', lat: 6.5 });

    expect(res.status).toBe(400);
    expect(await jsonOf(res)).toEqual({ error: 'geo.bad_request' });
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('geo access control and upstream failures (AC-19)', () => {
  it('refuses to spend a Geoapify credit without a caller token', async () => {
    const res = await call({ action: 'autocomplete', text: 'Ikeja' }, { token: null });

    expect(res.status).toBe(401);
    expect(await jsonOf(res)).toEqual({ error: 'swifttransit.auth.no_session' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('refuses a caller whose session does not verify', async () => {
    supabaseMock.state.session = { data: { user: null }, error: { message: 'invalid jwt' } };

    const res = await call({ action: 'autocomplete', text: 'Ikeja' });

    expect(res.status).toBe(401);
    expect(await jsonOf(res)).toEqual({ error: 'swifttransit.auth.invalid_session' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('reports a retryable quota error when Geoapify rate limits', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 429, json: () => Promise.resolve({}) });

    const res = await call({ action: 'autocomplete', text: 'Ikeja' });

    expect(res.status).toBe(429);
    expect(await jsonOf(res)).toEqual({ error: 'geo.quota' });
  });

  it('reports a retryable upstream error when Geoapify answers badly', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'bad bias' }),
    });

    const res = await call({ action: 'autocomplete', text: 'Ikeja' });

    expect(res.status).toBe(502);
    expect(await jsonOf(res)).toEqual({ error: 'geo.upstream' });
  });

  it('answers 503 when no key is configured, without naming the cause upstream', async () => {
    delete mockEnv.GEOAPIFY_API_KEY;

    const res = await call({ action: 'autocomplete', text: 'Ikeja' });

    expect(res.status).toBe(503);
    expect(await jsonOf(res)).toEqual({ error: 'geo.no_key' });
  });

  it('rejects anything that is not a POST', async () => {
    const res = await call({}, { method: 'GET' });

    expect(res.status).toBe(405);
  });

  it('rejects a body that is not valid JSON', async () => {
    const res = await handler({
      method: 'POST',
      headers: new Headers({ Authorization: 'Bearer valid-token' }),
      json: () => Promise.reject(new Error('unexpected end of input')),
    });

    expect(res.status).toBe(400);
    expect(await jsonOf(res)).toEqual({ error: 'geo.bad_request' });
  });

  it('rejects an unknown action', async () => {
    const res = await call({ action: 'route', text: 'Ikeja' });

    expect(res.status).toBe(400);
    expect(await jsonOf(res)).toEqual({ error: 'geo.bad_request' });
  });
});
