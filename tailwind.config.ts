import type { Config } from 'tailwindcss';

import { fontFamily, fontSize, palette, radius, semanticUtilities, spacing } from './theme/tokens';

// Theme values are replaced, not extended: only DESIGN.md tokens are valid classes.
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './features/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    colors: { transparent: 'transparent', ...palette },
    backgroundColor: ({ theme }) => ({ ...theme('colors'), ...semanticUtilities.bg }),
    textColor: ({ theme }) => ({ ...theme('colors'), ...semanticUtilities.text }),
    borderColor: ({ theme }) => ({
      ...theme('colors'),
      ...semanticUtilities.border,
      DEFAULT: semanticUtilities.border.default,
    }),
    // In extend so it beats nativewind/preset's own extend.fontFamily.sans ("system font").
    extend: { fontFamily: { sans: [fontFamily] } },
    fontSize,
    spacing,
    borderRadius: radius,
  },
} satisfies Config;
