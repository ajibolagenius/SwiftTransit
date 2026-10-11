import '@/global.css';
import '@/lib/i18n';

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { vars } from 'nativewind';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/features/auth/auth-provider';
import { routeGuards } from '@/features/auth/guards';
import { themeVars } from '@/theme/tokens';
import { useScheme, useThemeColors } from '@/theme/use-theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const auth = useAuth();
  const scheme = useScheme();
  const colors = useThemeColors();

  useEffect(() => {
    if (auth.status !== 'loading') SplashScreen.hide();
  }, [auth.status]);

  if (auth.status === 'loading') return null; // splash stays up

  const guard = routeGuards(auth);
  return (
    <View style={[{ flex: 1 }, vars(themeVars(scheme))]}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg.primary } }}>
        <Stack.Protected guard={guard.onboarding}>
          <Stack.Screen name="(onboarding)/index" />
        </Stack.Protected>
        <Stack.Protected guard={guard.signIn || guard.registration}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={guard.customer}>
          <Stack.Screen name="(customer)" />
        </Stack.Protected>
        <Stack.Protected guard={guard.courier}>
          <Stack.Screen name="(courier)" />
        </Stack.Protected>
        <Stack.Protected guard={guard.customer || guard.courier}>
          <Stack.Screen name="chat/[orderId]" />
        </Stack.Protected>
        <Stack.Screen
          name="permission/location"
          options={{ presentation: 'formSheet', sheetAllowedDetents: [0.5], sheetGrabberVisible: true }}
        />
      </Stack>
    </View>
  );
}
