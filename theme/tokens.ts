// Single source for design tokens (mirrors DESIGN.md). Tailwind config and JS consumers read from here.

export const palette = {
  'green-900': '#0F403B',
  'green-700': '#1A5C54',
  'green-500': '#67CE67',
  'green-200': '#CDE7C1',
  'green-100': '#E8F5E0',
  'neutral-950': '#000000',
  'neutral-900': '#0D0B26',
  'neutral-800': '#111827',
  'neutral-700': '#1E1E1E',
  'neutral-600': '#28303F',
  'neutral-500': '#344054',
  'neutral-400': '#667085',
  'neutral-300': '#8C8C8C',
  'neutral-250': '#9F9F9F',
  'neutral-200': '#ABB7C2',
  'neutral-175': '#C3CBCA',
  'neutral-150': '#CFD6DC',
  'neutral-125': '#D0D5DD',
  'neutral-100': '#E4E4E4',
  'neutral-75': '#EAEAEA',
  'neutral-50': '#F7F7F7',
  'neutral-25': '#FAFAFA',
  'neutral-0': '#FFFFFF',
  'accent-amber': '#D69431',
  danger: '#D92D20',
  'dark-bg': '#1A1A1A',
  'dark-surface': '#333333',
  'dark-border': '#444444',
  'dark-brand-subtle': '#233023',
} as const;

type PaletteKey = keyof typeof palette;

// Semantic tokens: [light, dark]. Group = the Tailwind utility they extend (bg-*, text-*, border-*).
const semanticPairs = {
  bg: {
    primary: ['neutral-0', 'dark-bg'],
    secondary: ['neutral-25', 'dark-surface'],
    tertiary: ['neutral-50', 'dark-surface'],
    inverse: ['neutral-950', 'neutral-0'],
    brand: ['green-900', 'green-500'],
    'brand-subtle': ['green-200', 'dark-brand-subtle'],
    success: ['green-500', 'green-500'],
    'interactive-primary': ['green-900', 'green-500'],
    'interactive-primary-pressed': ['green-700', 'green-200'],
    'interactive-secondary': ['green-200', 'dark-brand-subtle'],
    'interactive-accent': ['accent-amber', 'accent-amber'],
  },
  text: {
    primary: ['neutral-950', 'neutral-0'],
    secondary: ['neutral-500', 'neutral-175'],
    tertiary: ['neutral-300', 'neutral-250'],
    disabled: ['neutral-250', 'neutral-400'],
    inverse: ['neutral-0', 'neutral-950'],
    brand: ['green-900', 'green-500'],
    link: ['green-900', 'green-500'],
    'on-brand': ['neutral-0', 'green-900'],
    danger: ['danger', 'danger'],
  },
  border: {
    default: ['neutral-150', 'dark-border'],
    subtle: ['neutral-125', 'dark-surface'],
    strong: ['neutral-700', 'neutral-200'],
    brand: ['green-900', 'green-500'],
    focus: ['green-500', 'green-500'],
  },
} as const satisfies Record<string, Record<string, readonly [PaletteKey, PaletteKey]>>;

export type Scheme = 'light' | 'dark';
type Semantic = typeof semanticPairs;
export type SemanticColors = { [G in keyof Semantic]: { [K in keyof Semantic[G]]: string } };

const resolve = (scheme: Scheme) =>
  Object.fromEntries(
    Object.entries(semanticPairs).map(([group, tokens]) => [
      group,
      Object.fromEntries(
        (Object.entries(tokens) as [string, readonly [PaletteKey, PaletteKey]][]).map(
          ([name, [light, dark]]) => [name, palette[scheme === 'light' ? light : dark]],
        ),
      ),
    ]),
  ) as SemanticColors;

export const semantic: Record<Scheme, SemanticColors> = { light: resolve('light'), dark: resolve('dark') };

export const cssVar = (group: string, name: string) => `--${group}-${name}`;

// CSS variables NativeWind's vars() applies at the root, per scheme.
export const themeVars = (scheme: Scheme) =>
  Object.fromEntries(
    Object.entries(semantic[scheme]).flatMap(([group, tokens]) =>
      Object.entries(tokens).map(([name, value]) => [cssVar(group, name), value]),
    ),
  );

// Tailwind utility maps, e.g. backgroundColor.primary -> var(--bg-primary).
export const semanticUtilities = Object.fromEntries(
  Object.entries(semanticPairs).map(([group, tokens]) => [
    group,
    Object.fromEntries(Object.keys(tokens).map((name) => [name, `var(${cssVar(group, name)})`])),
  ]),
) as { [G in keyof Semantic]: Record<keyof Semantic[G], string> };

const type = (
  size: number,
  weight: number,
  lineHeight: number,
): [string, { lineHeight: string; fontWeight: string }] => [
  `${size}px`,
  { lineHeight: `${Math.round(size * lineHeight)}px`, fontWeight: String(weight) },
];

export const fontSize = {
  'display-lg': type(32, 400, 1.2),
  'display-md': type(20, 400, 1.3),
  h1: type(32, 600, 1.2),
  h2: type(24, 600, 1.25),
  h3: type(20, 600, 1.3),
  h4: type(18, 600, 1.3),
  h5: type(14, 700, 1.35),
  'subheading-xl': type(22, 500, 1.3),
  'subheading-lg': type(18, 500, 1.35),
  'subheading-md': type(16, 500, 1.4),
  'subheading-sm': type(15, 500, 1.4),
  'subheading-xs': type(13, 500, 1.4),
  'body-lg': type(17, 400, 1.5),
  'body-md': type(14, 400, 1.5),
  'body-sm': type(12, 400, 1.45),
  'body-xs': type(10, 400, 1.4),
  'label-lg': type(17, 500, 1.2),
  'label-md': type(14, 500, 1.2),
  'label-sm': type(12, 500, 1.2),
};

export const spacing = {
  0: '0px',
  1: '4px',
  2: '6px',
  3: '8px',
  4: '10px',
  5: '12px',
  6: '14px',
  7: '16px',
  8: '20px',
  9: '24px',
  10: '32px',
  11: '40px',
  12: '48px',
};

export const radius = {
  none: '0px',
  xs: '2px',
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  '2xl': '16px',
  '3xl': '24px',
  full: '9999px',
};

export const fontFamily = 'Urbanist';
