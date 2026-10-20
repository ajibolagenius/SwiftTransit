import type { ReactElement } from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { RUNE_ICONS, type IconName } from '@/assets/rune-glass.generated';

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
  const { xml } = RUNE_ICONS[name];
  return function RuneIcon({ size = 24, color, accessibilityElementsHidden }: IconProps) {
    const svg = <SvgXml xml={xml} width={size} height={size} color={color} />;
    return accessibilityElementsHidden ? <View accessibilityElementsHidden>{svg}</View> : svg;
  };
}

export const icons = Object.fromEntries(
  (Object.keys(RUNE_ICONS) as IconName[]).map((name) => [name, makeIcon(name)]),
) as Record<IconName, IconComponent>;

export type { IconName };
