const valid = {
  EXPO_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_x',
};

describe('parseEnv', () => {
  beforeAll(() => Object.assign(process.env, valid)); // lets the module-level parse succeed on import
  const load = () => require('@/lib/env').parseEnv as typeof import('@/lib/env').parseEnv;

  it('applies OpenFreeMap defaults for map styles', () => {
    expect(load()(valid)).toMatchObject({
      EXPO_PUBLIC_MAP_STYLE_LIGHT: 'https://tiles.openfreemap.org/styles/positron',
      EXPO_PUBLIC_MAP_STYLE_DARK: 'https://tiles.openfreemap.org/styles/dark',
    });
  });

  it('fails fast with a message naming the missing variable', () => {
    expect(() => load()({ EXPO_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co' })).toThrow(
      /EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY/,
    );
  });

  it('rejects an unknown dev auth stub role', () => {
    expect(() => load()({ ...valid, EXPO_PUBLIC_DEV_AUTH_STUB: 'admin' })).toThrow(
      /EXPO_PUBLIC_DEV_AUTH_STUB/,
    );
  });
});
