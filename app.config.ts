import type { ExpoConfig } from 'expo/config';

const urbanist = (weight: number, name: string) =>
  `./node_modules/@expo-google-fonts/urbanist/${weight}${name}/Urbanist_${weight}${name}.ttf`;
const fontWeights = [
  [400, 'Regular'],
  [500, 'Medium'],
  [600, 'SemiBold'],
  [700, 'Bold'],
] as const;

const config: ExpoConfig = {
  name: 'SwiftTransit',
  slug: 'swifttransit',
  scheme: 'swifttransit',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  extra: {
    // Supabase OAuth app credentials (public by nature; the secrets live server-side).
    googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '',
    appleClientId: process.env.EXPO_PUBLIC_APPLE_CLIENT_ID ?? '',
  },
  ios: {
    bundleIdentifier: 'com.ajibolagenius.swifttransit',
    supportsTablet: false,
  },
  android: {
    package: 'com.ajibolagenius.swifttransit',
    adaptiveIcon: {
      backgroundColor: '#CDE7C1',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    'expo-router',
    // Xcode 27 SDK requires the UIScene lifecycle; built in from SDK 58, remove then.
    ['expo-build-properties', { ios: { enableSceneSupport: true } }],
    'expo-status-bar',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 120,
        backgroundColor: '#CDE7C1',
        dark: { image: './assets/splash-icon-dark.png', backgroundColor: '#1A1A1A' },
      },
    ],
    [
      'expo-font',
      {
        // One family name + fontWeight on both platforms (iOS reads "Urbanist" from the files' typographic family).
        ios: { fonts: fontWeights.map(([w, n]) => urbanist(w, n)) },
        android: {
          fonts: [
            {
              fontFamily: 'Urbanist',
              fontDefinitions: fontWeights.map(([w, n]) => ({ path: urbanist(w, n), weight: w })),
            },
          ],
        },
      },
    ],
    'expo-localization',
    'expo-secure-store',
    'expo-sqlite',
    'expo-web-browser',
    [
      'expo-location',
      {
        locationWhenInUseUsageDescription:
          'SwiftTransit uses your location to show couriers and routes near you. You can still book deliveries without it.',
        locationAlwaysAndWhenInUseUsageDescription:
          'SwiftTransit uses your location to show couriers and routes near you. You can still book deliveries without it.',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission:
          'SwiftTransit uses your photos to attach package pictures to a delivery. You can book without a photo.',
      },
    ],
    '@maplibre/maplibre-react-native',
  ],
  experiments: { typedRoutes: true },
};

export default config;
