import type { LucideIcon } from 'lucide-react-native';
import { Circle, CircleCheck } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { cn } from './cn';
import { IconTile } from './icon-tile';
import { usePressScale } from './use-press-scale';
import { useThemeColors } from '@/theme/use-theme';

// DESIGN.md select-card: icon tile + title + subtitle + trailing radio.
// Selected = brand-soft surface with a brand border.
export function SelectCard({
  icon,
  title,
  subtitle,
  selected = false,
  onPress,
  className,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  selected?: boolean;
  onPress?: () => void;
  className?: string;
}) {
  const { animatedStyle, onPressIn, onPressOut } = usePressScale();
  const colors = useThemeColors();
  const Radio = selected ? CircleCheck : Circle;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      accessibilityState={{ selected }}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      className={className}
    >
      <Animated.View
        style={animatedStyle}
        className={cn(
          'gap-4 rounded-xl border p-6',
          selected ? 'border-brand bg-brand-soft' : 'border-default bg-primary',
        )}
      >
        <View className="flex-row items-center gap-4">
          <IconTile icon={icon} />
          <View className="min-w-0 flex-1 gap-1">
            <Text numberOfLines={1} className="font-sans text-subheading-md text-primary">
              {title}
            </Text>
            {subtitle ? (
              <Text numberOfLines={2} className="font-sans text-body-md text-secondary">
                {subtitle}
              </Text>
            ) : null}
          </View>
          <Radio size={20} strokeWidth={1.5} color={selected ? colors.text.brand : colors.text.tertiary} />
        </View>
      </Animated.View>
    </Pressable>
  );
}
