import { Camera, Map } from '@maplibre/maplibre-react-native';

import { env } from '@/lib/env';
import { useScheme } from '@/theme/use-theme';

// Lagos Island; feature screens pass their own camera once location exists.
const LAGOS: [number, number] = [3.3958, 6.4541];

export function AppMap() {
  const scheme = useScheme();
  return (
    <Map
      style={{ flex: 1 }}
      mapStyle={scheme === 'dark' ? env.EXPO_PUBLIC_MAP_STYLE_DARK : env.EXPO_PUBLIC_MAP_STYLE_LIGHT}
      logo={false}
      attribution // OSM licence requires visible attribution
    >
      <Camera initialViewState={{ center: LAGOS, zoom: 12 }} />
    </Map>
  );
}
