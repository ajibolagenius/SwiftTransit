import { useColorScheme } from 'react-native';

import { semantic, type Scheme } from './tokens';

export function useScheme(): Scheme {
  return useColorScheme() === 'dark' ? 'dark' : 'light';
}

// Resolved semantic colours for JS consumers (navigation, maps, status bar).
export function useThemeColors() {
  return semantic[useScheme()];
}
