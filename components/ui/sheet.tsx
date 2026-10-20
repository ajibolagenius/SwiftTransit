import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Dimensions, Modal, Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconTile } from './icon-tile';
import { useReduceMotion } from './use-reduce-motion';
import { useThemeColors } from '@/theme/use-theme';
import type { IconComponent } from '@/components/ui/rune-icon';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// DESIGN.md sheet: scrim, bottom-anchored card, 3xl top corners, 24 px padding, icon tile + title + body + actions.

export function Sheet({
  open,
  onDismiss,
  title,
  dismissLabel,
  icon,
  children,
}: {
  open: boolean;
  onDismiss: () => void;
  title: string;
  dismissLabel: string;
  icon?: IconComponent;
  children?: ReactNode;
}) {
  return (
    <Modal visible={open} transparent statusBarTranslucent animationType="none" onRequestClose={onDismiss}>
      {open ? (
        <SheetBody onDismiss={onDismiss} title={title} dismissLabel={dismissLabel} icon={icon}>
          {children}
        </SheetBody>
      ) : null}
    </Modal>
  );
}

function SheetBody({
  onDismiss,
  title,
  dismissLabel,
  icon: Icon,
  children,
}: {
  onDismiss: () => void;
  title: string;
  dismissLabel: string;
  icon?: IconComponent;
  children?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const reduced = useReduceMotion();
  const rise = useSharedValue(1); // 1 = parked below the screen, 0 = settled
  const travel = Dimensions.get('window').height * 0.6;

  useEffect(() => {
    // DESIGN.md motion: sheets use springs, no bounce for chrome; Reduce Motion cuts the slide.
    rise.value = reduced ? withTiming(0, { duration: 0 }) : withSpring(0, { damping: 24, stiffness: 280 });
  }, [reduced, rise]);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: (1 - rise.value) * 0.4 }));
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ translateY: rise.value * travel }] }));

  return (
    <View accessibilityViewIsModal className="flex-1">
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={dismissLabel}
        onPress={onDismiss}
        style={[scrimStyle, { backgroundColor: colors.bg.inverse }]}
        className="absolute inset-0"
      />
      <Animated.View
        style={[cardStyle, { paddingBottom: insets.bottom + 20 }]}
        className="absolute inset-x-0 bottom-0 gap-5 rounded-t-3xl bg-primary px-9 pt-9"
      >
        {Icon ? <IconTile icon={Icon} size={64} className="self-center" /> : null}
        <Text accessibilityRole="header" className="text-center font-sans text-h3 text-primary">
          {title}
        </Text>
        {children}
      </Animated.View>
    </View>
  );
}
