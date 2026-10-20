import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { Dimensions, Modal, Pressable, Text, View, type GestureResponderEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconTile } from './icon-tile';
import { useReduceMotion } from './use-reduce-motion';
import { useThemeColors } from '@/theme/use-theme';
import type { IconComponent } from '@/components/ui/rune-icon';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// DESIGN.md sheet: scrim, bottom-anchored card, 3xl top corners, 24 px padding, icon tile + title + body + actions.
// DESIGN.md motion (apple-design): the grabber tracks the finger 1:1, commits dismiss on distance or
// projected flick velocity, and hands release velocity to the spring so drag and animation meet without a seam.

const SPRING = { damping: 24, stiffness: 280 };
const DISMISS_DISTANCE = 0.33; // fraction of travel that commits a slow drag
const DISMISS_VELOCITY = 600; // px/s downward that commits a flick
const RUBBER = 0.55; // resistance past the top bound (apple-design rubber-banding)

function rubberband(overshoot: number) {
  if (overshoot >= 0) return overshoot;
  return (overshoot * 200 * RUBBER) / (200 + RUBBER * Math.abs(overshoot));
}

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

  const offset = useSharedValue(0); // px dragged below the resting position
  const velocity = useSharedValue(0); // px/s, smoothed
  const dragStartY = useRef(0);
  const lastTouch = useRef({ y: 0, t: 0 });

  useEffect(() => {
    // DESIGN.md motion: sheets use springs, no bounce for chrome; Reduce Motion cuts the slide.
    rise.value = reduced ? withTiming(0, { duration: 0 }) : withSpring(0, SPRING);
  }, [reduced, rise]);

  // Reanimated shared values are mutable refs and JS-thread writes are the documented API,
  // but the React-compiler immutability rule can't know that, so it is scoped off here.
  /* eslint-disable react-hooks/immutability */
  // Slide the card out, then hand control back to the parent. Folding the drag offset into `rise`
  // first keeps translateY continuous, so the spring starts exactly where the finger left off.
  const exit = useCallback(() => {
    if (offset.value !== 0) {
      rise.value = rise.value + offset.value / travel;
      offset.value = 0;
    }
    const finish = (f?: boolean) => {
      if (f) onDismiss();
    };
    rise.value = reduced
      ? withTiming(1, { duration: 0 }, finish)
      : withSpring(1, { ...SPRING, velocity: velocity.value / travel }, finish);
  }, [offset, onDismiss, reduced, rise, travel, velocity]);

  const onTouchStart = useCallback(
    (e: GestureResponderEvent) => {
      dragStartY.current = e.nativeEvent.pageY;
      lastTouch.current = { y: e.nativeEvent.pageY, t: e.timeStamp };
      offset.value = 0;
      velocity.value = 0;
    },
    [offset, velocity],
  );

  const onTouchMove = useCallback(
    (e: GestureResponderEvent) => {
      const y = e.nativeEvent.pageY;
      offset.value = rubberband(y - dragStartY.current);
      const dt = e.timeStamp - lastTouch.current.t;
      if (dt > 0) {
        const v = ((y - lastTouch.current.y) / dt) * 1000;
        velocity.value = 0.8 * velocity.value + 0.2 * v; // smooth the short-window estimate
      }
      lastTouch.current = { y, t: e.timeStamp };
    },
    [offset, velocity],
  );

  const onTouchEnd = useCallback(() => {
    const commit =
      offset.value > travel * DISMISS_DISTANCE || (offset.value > 8 && velocity.value > DISMISS_VELOCITY);
    if (commit) {
      exit();
    } else if (offset.value !== 0) {
      // Snap back carries the release velocity so the settle continues the finger's motion.
      offset.value = withSpring(0, { ...SPRING, velocity: velocity.value });
    }
  }, [exit, offset, travel, velocity]);
  /* eslint-enable react-hooks/immutability */

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, (1 - rise.value) * 0.4 - offset.value / (travel * 3)),
  }));
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: rise.value * travel + offset.value }],
  }));

  return (
    <View accessibilityViewIsModal className="flex-1">
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={dismissLabel}
        onPress={exit}
        style={[scrimStyle, { backgroundColor: colors.bg.scrim }]}
        className="absolute inset-0"
      />
      <Animated.View
        style={[cardStyle, { paddingBottom: insets.bottom + 20 }]}
        className="absolute inset-x-0 bottom-0 gap-5 rounded-t-3xl bg-primary px-9 pt-3"
      >
        <View
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchEnd}
          className="-mx-8 self-center px-8 py-3"
        >
          <View
            pointerEvents="none"
            className="self-center rounded-full"
            style={{ width: 40, height: 4, backgroundColor: colors.text.tertiary }}
          />
        </View>
        <View className="gap-5 pt-3">
          {Icon ? <IconTile icon={Icon} size={64} className="self-center" /> : null}
          <Text accessibilityRole="header" className="text-center font-sans text-h3 text-primary">
            {title}
          </Text>
          {children}
        </View>
      </Animated.View>
    </View>
  );
}
