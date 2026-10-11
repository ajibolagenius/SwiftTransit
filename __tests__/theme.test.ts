import resolveConfig from 'tailwindcss/resolveConfig';

import tailwindConfig from '@/tailwind.config';
import { fontSize, palette, radius, semantic, semanticUtilities, spacing, themeVars } from '@/theme/tokens';
import { useScheme, useThemeColors } from '@/theme/use-theme';

// tsconfig keeps Node types out of the app, so type just the one fs call used here.
const { readFileSync } = jest.requireActual<{ readFileSync(path: string, enc: 'utf8'): string }>('fs');
const useColorScheme = jest.spyOn(require('react-native'), 'useColorScheme');

// Reads the YAML front matter of DESIGN.md as { section: { key: value | { prop: value } } }.
// Enough for its flat two/three level shape; not a general YAML parser.
function designTokens() {
  const text = readFileSync('DESIGN.md', 'utf8'); // jest runs from the project root;
  const front = text.split(/^---$/m)[1];
  const out: Record<string, Record<string, string | Record<string, string>>> = {};
  let section = '';
  let item = '';
  for (const line of front.split('\n')) {
    const m = line.match(/^( *)"?([\w-]+)"?:\s*"?([^"]*)"?\s*$/);
    if (!m) continue;
    const [, indent, key, value] = m;
    if (indent.length === 0) out[(section = key)] = {};
    else if (indent.length === 2) {
      item = key;
      out[section][key] = value || {};
    } else (out[section][item] as Record<string, string>)[key] = value;
  }
  return out;
}

const design = designTokens();

describe('theme tokens mirror DESIGN.md', () => {
  // covers: AC-2
  it('has every DESIGN.md colour with the same hex value', () => {
    expect(palette).toEqual(design.colors);
  });

  // covers: AC-2
  it('has every DESIGN.md spacing step and radius', () => {
    // DESIGN.md has no zero step; tokens add `0` / `none` for resets.
    expect(spacing).toEqual({ 0: '0px', ...design.spacing });
    expect(radius).toEqual({ none: '0px', ...design.rounded });
  });

  // covers: AC-2
  it('has every DESIGN.md type style with matching size, weight and line height', () => {
    const typography = design.typography as Record<string, Record<string, string>>;
    const expected = Object.fromEntries(
      Object.entries(typography).map(([name, t]) => {
        const size = parseInt(t.fontSize, 10);
        return [
          name.replace(/^heading-/, ''),
          [
            t.fontSize,
            {
              lineHeight: `${Math.round(size * Number(t.lineHeight))}px`,
              fontWeight: t.fontWeight,
            },
          ],
        ];
      }),
    );
    expect(fontSize).toEqual(expected);
  });
});

describe('semantic colours', () => {
  const groups = Object.keys(semantic.light) as (keyof typeof semantic.light)[];
  const hexes = new Set<string>(Object.values(palette));

  // covers: AC-2
  it('resolve to palette colours in both schemes', () => {
    for (const scheme of ['light', 'dark'] as const)
      for (const group of groups)
        for (const value of Object.values(semantic[scheme][group])) expect(hexes).toContain(value);
  });

  // covers: AC-2
  it('switch the core surface and text colours between light and dark', () => {
    expect(semantic.light.bg.primary).toBe(palette['neutral-0']);
    expect(semantic.dark.bg.primary).toBe(palette['dark-bg']);
    expect(semantic.light.text.primary).not.toBe(semantic.dark.text.primary);
  });

  // covers: AC-2
  it('give every NativeWind class a CSS variable that is set in both schemes', () => {
    const light = themeVars('light');
    const dark = themeVars('dark');
    for (const group of groups)
      for (const value of Object.values(semanticUtilities[group])) {
        const name = value.match(/^var\((--[\w-]+)\)$/)?.[1];
        expect(name).toBeDefined();
        expect(light[name!]).toMatch(/^#[0-9A-F]{6}$/);
        expect(dark[name!]).toMatch(/^#[0-9A-F]{6}$/);
      }
  });
});

describe('tailwind config', () => {
  const { theme } = resolveConfig(tailwindConfig);

  // covers: AC-2
  it('maps semantic classes to the scheme variables', () => {
    expect(theme.backgroundColor.primary).toBe('var(--bg-primary)');
    expect(theme.textColor.secondary).toBe('var(--text-secondary)');
    expect(theme.borderColor.DEFAULT).toBe('var(--border-default)');
  });

  it('only allows DESIGN.md tokens, not Tailwind defaults', () => {
    expect(theme.colors).not.toHaveProperty('red');
    expect(theme.spacing).not.toHaveProperty('13');
    expect(theme.fontSize).not.toHaveProperty('base');
    expect(theme.borderRadius).toEqual(radius);
  });

  // covers: AC-3
  it('uses Urbanist as the sans family', () => {
    expect(theme.fontFamily.sans).toEqual(['Urbanist']);
  });
});

describe('useScheme', () => {
  it.each([
    ['dark', 'dark'],
    ['light', 'light'],
    [null, 'light'],
    ['unspecified', 'light'],
  ])('follows the system setting %p as %p', (system, expected) => {
    useColorScheme.mockReturnValue(system as never);
    expect(useScheme()).toBe(expected);
  });

  // covers: AC-2
  it('hands JS consumers the colours for the current scheme', () => {
    useColorScheme.mockReturnValue('dark');
    expect(useThemeColors()).toBe(semantic.dark);
  });
});
