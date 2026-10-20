import { Camera, Map, type ViewStateChangeEvent } from '@maplibre/maplibre-react-native';
import { useEffect, useRef } from 'react';
import type { NativeSyntheticEvent } from 'react-native';
import { View } from 'react-native';

import { env } from '@/lib/env';
import { useScheme, useThemeColors } from '@/theme/use-theme';

// Lagos is the launch city and the fallback camera (AC-3): a denied or stale
// location fixes the view here rather than blocking the step.
export const LAGOS_CENTRE: [number, number] = [3.3958, 6.4541]; // [lng, lat]
const DEFAULT_ZOOM = 13;
const SETTLE_MS = 600;

/**
 * A map whose selection is the point under the fixed centre pin. The pin never
 * moves; the customer pans the map beneath it.
 */
export function PlaceMap({
  initialCentre,
  pinTone = 'pickup',
  onSettled,
}: {
  initialCentre?: [number, number];
  pinTone?: 'pickup' | 'dropoff';
  onSettled: (centre: [number, number]) => void;
}) {
  const scheme = useScheme();
  const colors = useThemeColors();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const onRegionDidChange = (event: NativeSyntheticEvent<ViewStateChangeEvent>) => {
    const { center, userInteraction } = event.nativeEvent;
    if (!center || !userInteraction) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onSettled(center as [number, number]), SETTLE_MS);
  };

  const pin = pinTone === 'dropoff' ? colors.border.accent : colors.bg.brand;

  return (
    <View className="flex-1 overflow-hidden rounded-2xl border border-default">
      <Map
        style={{ flex: 1 }}
        mapStyle={scheme === 'dark' ? env.EXPO_PUBLIC_MAP_STYLE_DARK : env.EXPO_PUBLIC_MAP_STYLE_LIGHT}
        logo={false}
        attribution // OSM licence requires visible attribution
        onRegionDidChange={onRegionDidChange}
      >
        <Camera initialViewState={{ center: initialCentre ?? LAGOS_CENTRE, zoom: DEFAULT_ZOOM }} />
      </Map>
      <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
        <View
          accessibilityElementsHidden
          importantForAccessibility="no"
          className="h-6 w-6 rounded-full border-2 border-white"
          style={{ backgroundColor: pin }}
        />
      </View>
    </View>
  );
}
