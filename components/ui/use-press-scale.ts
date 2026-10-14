import { useCallback, useEffect, useState } from 'react';
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useReduceMotion } from './use-reduce-motion';

// DESIGN.md motion: press feedback scales to 0.97 over ~100 ms; Reduce Motion drops the scale.
const PRESS_DURATION_MS = 100;
const PRESS_SCALE = 0.97;

export function usePressScale() {
  const reduced = useReduceMotion();
  const [pressed, setPressed] = useState(false);
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withTiming(pressed && !reduced ? PRESS_SCALE : 1, { duration: PRESS_DURATION_MS });
  }, [pressed, reduced, scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const onPressIn = useCallback(() => setPressed(true), []);
  const onPressOut = useCallback(() => setPressed(false), []);

  return { animatedStyle, onPressIn, onPressOut };
}
