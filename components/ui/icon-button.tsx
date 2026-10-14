import type { LucideIcon } from 'lucide-react-native';
import { ChevronLeft } from 'lucide-react-native';
import { Pressable } from 'react-native';
import Animated from 'react-native-reanimated';

import { cn } from './cn';
import { usePressScale } from './use-press-scale';
import { useThemeColors } from '@/theme/use-theme';

// DESIGN.md button-icon: 44 px circle with a border; the 44 pt target is the platform minimum, not a spacing step.
const ICON_BUTTON_SIZE = 44;
const ICON_SIZE = 20; // DESIGN.md: one icon set at 20/24 px, 1.5 stroke.

export function IconButton({
  icon: Icon = ChevronLeft,
  accessibilityLabel,
  onPress,
  disabled = false,
  size = ICON_BUTTON_SIZE,
  iconSize = ICON_SIZE,
  tone = 'default',
  className,
}: {
  icon?: LucideIcon;
  accessibilityLabel: string;
  onPress?: () => void;
  disabled?: boolean;
  size?: number;
  iconSize?: number;
  tone?: 'default' | 'brand';
  className?: string;
}) {
  const { animatedStyle, onPressIn, onPressOut } = usePressScale();
  const colors = useThemeColors();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      className={cn(disabled && 'opacity-50', className)}
    >
      <Animated.View
        style={[animatedStyle, { width: size, height: size }]}
        className={cn(
          'items-center justify-center rounded-full border',
          tone === 'brand' ? 'border-brand bg-interactive-secondary' : 'border-default bg-primary',
        )}
      >
        <Icon
          size={iconSize}
          strokeWidth={1.5}
          color={tone === 'brand' ? colors.text.brand : colors.text.primary}
          accessibilityElementsHidden
        />
      </Animated.View>
    </Pressable>
  );
}
