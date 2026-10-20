import type { FeatureCollection, LineString, Point } from 'geojson';
import { Camera, GeoJSONSource, Layer, Map } from '@maplibre/maplibre-react-native';
import { View } from 'react-native';

import { env } from '@/lib/env';
import { useScheme, useThemeColors } from '@/theme/use-theme';

// AC-6: the route as it was booked. Two pins and the line between them, nothing
// live. Feature 10 adds the courier marker here; the source and layer ids below
// are where it goes.

type LatLng = { lat: number; lng: number };

// MapLibre wants the bounds as one flat west, south, east, north tuple.
function boundsOf(a: LatLng, b: LatLng): [number, number, number, number] {
  return [Math.min(a.lng, b.lng), Math.min(a.lat, b.lat), Math.max(a.lng, b.lng), Math.max(a.lat, b.lat)];
}

export function RouteMap({
  pickup,
  dropoff,
  accessibilityLabel,
}: {
  pickup: LatLng;
  dropoff: LatLng;
  accessibilityLabel: string;
}) {
  const scheme = useScheme();
  const colors = useThemeColors();

  const route: FeatureCollection<LineString> = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [
            [pickup.lng, pickup.lat],
            [dropoff.lng, dropoff.lat],
          ],
        },
      },
    ],
  };

  const pins: FeatureCollection<Point, { kind: 'pickup' | 'dropoff' }> = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { kind: 'pickup' },
        geometry: { type: 'Point', coordinates: [pickup.lng, pickup.lat] },
      },
      {
        type: 'Feature',
        properties: { kind: 'dropoff' },
        geometry: { type: 'Point', coordinates: [dropoff.lng, dropoff.lat] },
      },
    ],
  };

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      className="aspect-video overflow-hidden rounded-2xl border border-default"
    >
      <Map
        style={{ flex: 1 }}
        mapStyle={scheme === 'dark' ? env.EXPO_PUBLIC_MAP_STYLE_DARK : env.EXPO_PUBLIC_MAP_STYLE_LIGHT}
        logo={false}
        attribution // OSM licence requires visible attribution
      >
        <Camera
          initialViewState={{
            bounds: boundsOf(pickup, dropoff),
            padding: { top: 28, bottom: 28, left: 28, right: 28 },
          }}
          maxZoom={15}
        />
        <GeoJSONSource id="order-route" data={route}>
          <Layer
            type="line"
            id="order-route-line"
            paint={{
              'line-color': scheme === 'dark' ? colors.bg.success : colors.bg.brand,
              'line-width': 3,
              'line-dasharray': [2, 1.6],
            }}
          />
        </GeoJSONSource>
        <GeoJSONSource id="order-pins" data={pins}>
          <Layer
            type="circle"
            id="order-pin-pickup"
            filter={['==', ['get', 'kind'], 'pickup']}
            paint={{
              'circle-radius': 8,
              'circle-color': colors.bg.brand,
              'circle-stroke-color': colors.bg.primary,
              'circle-stroke-width': 2,
            }}
          />
          <Layer
            type="circle"
            id="order-pin-dropoff"
            filter={['==', ['get', 'kind'], 'dropoff']}
            paint={{
              'circle-radius': 8,
              'circle-color': colors.border.accent,
              'circle-stroke-color': colors.bg.primary,
              'circle-stroke-width': 2,
            }}
          />
        </GeoJSONSource>
      </Map>
    </View>
  );
}
