import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { cn } from './cn';
import { usePressScale } from './use-press-scale';
import { useThemeColors } from '@/theme/use-theme';

type ButtonVariant = 'primary' | 'secondary' | 'link';

// DESIGN.md button-primary/button-secondary: 52 px tall. Not on the spacing scale, so a component constant.
const BUTTON_HEIGHT = 52;

export function Button({
  variant = 'primary',
  loading = false,
  disabled = false,
  underline = false,
  onPress,
  children,
  className,
}: {
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  underline?: boolean;
  onPress?: () => void;
  children: string;
  className?: string;
}) {
  const { animatedStyle, onPressIn, onPressOut } = usePressScale();
  const colors = useThemeColors();

  if (variant === 'link') {
    return (
      <Pressable
        accessibilityRole="link"
        accessibilityState={{ disabled }}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        hitSlop={12}
        className={cn('py-3', disabled && 'opacity-50', className)}
      >
        <Animated.Text
          style={animatedStyle}
          className={cn('font-sans text-label-md text-link', underline && 'underline')}
        >
          {children}
        </Animated.Text>
      </Pressable>
    );
  }

  const surface =
    variant === 'primary'
      ? disabled
        ? 'bg-tertiary'
        : 'bg-interactive-primary'
      : disabled
        ? 'bg-tertiary border border-default'
        : 'bg-primary border border-default';
  const pressedSurface =
    variant === 'primary' ? 'bg-interactive-primary-pressed' : 'bg-tertiary border border-strong';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, busy: loading }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      className={className}
    >
      {({ pressed }) => (
        <Animated.View
          style={[animatedStyle, { height: BUTTON_HEIGHT }]}
          className={cn(
            'w-full flex-row items-center justify-center rounded-xl px-9',
            pressed && !disabled ? pressedSurface : surface,
          )}
        >
          {/* The label stays mounted (invisible) while loading so the width never jumps. */}
          <View className="items-center justify-center">
            <Text
              numberOfLines={1}
              className={cn(
                'font-sans text-label-md',
                variant === 'primary' ? 'text-on-brand' : 'text-primary',
                disabled && 'text-disabled',
                loading && 'opacity-0',
              )}
            >
              {children}
            </Text>
            {loading ? (
              <ActivityIndicator
                className="absolute"
                color={variant === 'primary' ? colors.text['on-brand'] : colors.text.primary}
              />
            ) : null}
          </View>
        </Animated.View>
      )}
    </Pressable>
  );
}
