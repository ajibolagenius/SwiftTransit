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

  // covers: AC-6
  it('rejects a Supabase URL that is not a URL', () => {
    expect(() => load()({ ...valid, EXPO_PUBLIC_SUPABASE_URL: 'abc.supabase' })).toThrow(
      /EXPO_PUBLIC_SUPABASE_URL/,
    );
  });

  it('rejects an empty publishable key', () => {
    expect(() => load()({ ...valid, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '' })).toThrow(
      /EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY/,
    );
  });

  it('points the developer at .env.example when it fails', () => {
    expect(() => load()({})).toThrow(/Copy \.env\.example to \.env/);
  });

  // covers: AC-9
  it('drops variables it does not know, so a stray secret never reaches the app', () => {
    expect(load()({ ...valid, SUPABASE_SERVICE_ROLE_KEY: 'secret' })).not.toHaveProperty(
      'SUPABASE_SERVICE_ROLE_KEY',
    );
  });
});

describe('env (module load)', () => {
  const keys = [
    ...Object.keys(valid),
    'EXPO_PUBLIC_MAP_STYLE_LIGHT',
    'EXPO_PUBLIC_MAP_STYLE_DARK',
    'EXPO_PUBLIC_DEV_AUTH_STUB',
  ];
  afterEach(() => keys.forEach((k) => delete process.env[k]));
  const loadEnv = () => {
    let env!: typeof import('@/lib/env').env;
    jest.isolateModules(() => {
      env = require('@/lib/env').env;
    });
    return env;
  };

  it('treats blank optional vars in .env as unset and uses the defaults', () => {
    Object.assign(process.env, valid, {
      EXPO_PUBLIC_MAP_STYLE_LIGHT: '',
      EXPO_PUBLIC_MAP_STYLE_DARK: '',
      EXPO_PUBLIC_DEV_AUTH_STUB: '',
    });
    expect(loadEnv()).toEqual({
      ...valid,
      EXPO_PUBLIC_MAP_STYLE_LIGHT: 'https://tiles.openfreemap.org/styles/positron',
      EXPO_PUBLIC_MAP_STYLE_DARK: 'https://tiles.openfreemap.org/styles/dark',
    });
  });

  // covers: AC-6, AC-9
  it('fails fast at startup when a required var is missing', () => {
    Object.assign(process.env, valid);
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    expect(loadEnv).toThrow(/EXPO_PUBLIC_SUPABASE_URL/);
  });
});

describe('repo secret hygiene', () => {
  // tsconfig keeps Node types out of the app; jest runs from the project root.
  const fs = jest.requireActual<{ readFileSync(path: string, enc: 'utf8'): string }>('fs');
  const read = (file: string) => fs.readFileSync(file, 'utf8');

  // covers: AC-9
  it('documents every variable the app reads in .env.example', () => {
    const used = new Set(read('lib/env.ts').match(/EXPO_PUBLIC_\w+/g));
    const documented = read('.env.example');
    for (const name of used) expect(documented).toContain(name);
  });

  // covers: AC-9
  it('keeps .env out of git', () => {
    expect(read('.gitignore').split('\n')).toContain('.env');
  });
});
