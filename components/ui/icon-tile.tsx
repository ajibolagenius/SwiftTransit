import { View } from 'react-native';

import { cn } from './cn';
import { useThemeColors } from '@/theme/use-theme';
import type { IconComponent } from '@/components/ui/rune-icon';

// DESIGN.md icon-tile: 40 px circle on the brand-subtle surface. Decorative: hidden from assistive tech.
export function IconTile({
  icon: Icon,
  size = 40,
  className,
}: {
  icon: IconComponent;
  size?: number;
  className?: string;
}) {
  const colors = useThemeColors();
  return (
    <View
      accessibilityElementsHidden
      style={{ width: size, height: size }}
      className={cn('items-center justify-center rounded-full bg-interactive-secondary', className)}
    >
      <Icon size={Math.round(size / 2)} strokeWidth={1.5} color={colors.text.primary} />
    </View>
  );
}
