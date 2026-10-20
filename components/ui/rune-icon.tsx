import type { ReactElement } from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { RUNE_ICONS, type IconName } from '@/assets/rune-glass.generated';
import { useThemeColors } from '@/theme/use-theme';

// RuneIcons Glass glyphs carry fixed grey/white gradients, so `color` and `strokeWidth`
// only theme the `normal`-style fallbacks; they are accepted no-ops on glass icons.
export type IconProps = {
  size?: number;
  strokeWidth?: number;
  color?: string;
  accessibilityElementsHidden?: boolean;
};

export type IconComponent = (props: IconProps) => ReactElement;

export function makeIcon(name: IconName): IconComponent {
  const { style, xml } = RUNE_ICONS[name];
  return function RuneIcon({ size = 24, color, accessibilityElementsHidden }: IconProps) {
    const colors = useThemeColors();
    // Normal-style glyphs paint with currentColor; without a theme default they render
    // black-on-black in dark mode. Glass gradients ignore the color entirely.
    const tint = color ?? (style === 'normal' ? colors.text.primary : undefined);
    const svg = <SvgXml xml={xml} width={size} height={size} color={tint} />;
    return accessibilityElementsHidden ? <View accessibilityElementsHidden>{svg}</View> : svg;
  };
}

export const icons = Object.fromEntries(
  (Object.keys(RUNE_ICONS) as IconName[]).map((name) => [name, makeIcon(name)]),
) as Record<IconName, IconComponent>;

export type { IconName };
