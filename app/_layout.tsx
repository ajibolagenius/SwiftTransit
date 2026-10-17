import '@/global.css';
import '@/lib/i18n';

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { vars } from 'nativewind';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { AuthProvider, useAuth } from '@/features/auth/auth-provider';
import { routeGuards } from '@/features/auth/guards';
import { readOnboardingSeen } from '@/features/auth/onboarding-storage';
import { themeVars } from '@/theme/tokens';
import { useScheme, useThemeColors } from '@/theme/use-theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Read the carousel flag once before the protected tree renders (spec 0003 client rule).
  const [ready, setReady] = useState(false);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    readOnboardingSeen().then((value) => {
      setSeen(value);
      setReady(true);
    });
  }, []);

  if (!ready) return null; // splash stays up

  return (
    <SafeAreaProvider>
      <AuthProvider initialOnboardingSeen={seen}>
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

  // AC-9: a failed profiles read never routes to registration; it offers a retry.
  if (auth.status === 'signed-in' && auth.profileError) return <ProfileRetryScreen />;

  const guard = routeGuards(auth, auth.onboardingSeen);
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
        <Stack.Screen name="auth/callback" />
        <Stack.Screen name="legal/terms" />
        <Stack.Screen name="legal/privacy" />
        {__DEV__ ? <Stack.Screen name="dev/gallery" /> : null}
      </Stack>
    </View>
  );
}

function ProfileRetryScreen() {
  const { t } = useTranslation();
  const { refresh, signOut } = useAuth();
  const scheme = useScheme();
  return (
    <View style={[{ flex: 1 }, vars(themeVars(scheme))]}>
      <StatusBar style="auto" />
      <SafeAreaView className="flex-1 bg-primary" edges={['top', 'bottom']}>
        <View className="flex-1 items-center justify-center gap-7 px-11">
          <Text accessibilityRole="header" className="text-center font-sans text-h3 text-primary">
            {t('auth.profileError.title')}
          </Text>
          <Text className="text-center font-sans text-body-md text-secondary">
            {t('auth.profileError.body')}
          </Text>
          <View className="w-full gap-4">
            <Button onPress={() => void refresh()}>{t('auth.profileError.retry')}</Button>
            <Button variant="link" onPress={() => void signOut()}>
              {t('auth.profileError.signOut')}
            </Button>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
