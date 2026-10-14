import type { LayoutChangeEvent } from 'react-native';
import { Pressable, Text, View } from 'react-native';
import { useEffect, useState } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { cn } from './cn';
import { useReduceMotion } from './use-reduce-motion';

// DESIGN.md segmented: brand-subtle pill on a tertiary track, equal-width segments.
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const reduced = useReduceMotion();
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const inset = 4; // p-1: the DESIGN.md track padding step
  const segmentWidth = trackWidth > 0 ? (trackWidth - inset * 2) / options.length : 0;

  const shift = useSharedValue(index * segmentWidth);
  useEffect(() => {
    shift.value = withTiming(index * segmentWidth, { duration: reduced ? 0 : 150 });
  }, [index, segmentWidth, reduced, shift]);
  const thumbStyle = useAnimatedStyle(() => ({
    left: inset,
    width: segmentWidth,
    transform: [{ translateX: shift.value }],
  }));

  const onLayout = (e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width);

  return (
    <View
      accessibilityLabel={label}
      onLayout={onLayout}
      className="relative flex-row rounded-full bg-tertiary p-1"
    >
      {segmentWidth > 0 ? (
        <Animated.View
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={thumbStyle}
          className="absolute inset-y-1 rounded-full bg-interactive-secondary"
        />
      ) : null}
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            className="h-10 flex-1 items-center justify-center px-3 active:opacity-70"
          >
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.5}
              className={cn('font-sans text-label-sm', selected ? 'text-brand' : 'text-secondary')}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
