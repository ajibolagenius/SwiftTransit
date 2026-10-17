import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/auth-provider';
import { buildAuthorizeUrl, exchangeCallbackUrl, type OAuthProvider } from '@/features/auth/oauth';

// Spec 0003: the OAuth hook lives here; navigation to registration is driven by the
// AuthProvider onAuthStateChange path, not by this handler.
function useSignInWithOAuth() {
  const { refresh } = useAuth();
  const [busy, setBusy] = useState<OAuthProvider | null>(null);
  const [failed, setFailed] = useState(false);

  const start = async (provider: OAuthProvider) => {
    setBusy(provider);
    setFailed(false);
    try {
      const url = await buildAuthorizeUrl(provider);
      const result = await WebBrowser.openAuthSessionAsync(url, 'swifttransit://auth/callback');
      if (result.type === 'success' && 'url' in result && result.url.includes('code=')) {
        await exchangeCallbackUrl(result.url);
        await refresh();
      } else if (result.type !== 'cancel') {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setBusy(null);
    }
  };

  return { start, busy, failed };
}

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const auth = useAuth();
  const { start, busy, failed } = useSignInWithOAuth();

  return (
    <SafeAreaView className="flex-1 bg-primary" edges={['top', 'bottom']}>
      <View className="flex-1 px-7 pt-11">
        <View className="items-center gap-2">
          <Image
            source={require('../../assets/splash-icon.png')}
            className="h-16 w-16"
            resizeMode="contain"
          />
          <Text accessibilityRole="header" className="text-center font-sans text-h1 text-primary">
            {t('auth.welcome.title')}
          </Text>
          <Text className="text-center font-sans text-body-md text-secondary">
            {t('auth.welcome.subtitle')}
          </Text>
        </View>

        {auth.status === 'signed-out' && auth.expired ? (
          <View className="mt-9 rounded-xl border border-danger bg-secondary p-6">
            <Text accessibilityLiveRegion="polite" className="font-sans text-body-md text-danger">
              {t('auth.welcome.sessionExpired')}
            </Text>
          </View>
        ) : null}

        {auth.offline ? (
          <View className="mt-9 rounded-xl border border-default bg-secondary p-6">
            <Text accessibilityLiveRegion="polite" className="font-sans text-body-md text-secondary">
              {t('auth.offline')}
            </Text>
          </View>
        ) : null}

        <View className="flex-1" />

        <View className="gap-4">
          <Button disabled={auth.offline} onPress={() => router.push('/phone')}>
            {t('auth.welcome.phone')}
          </Button>
          <Button variant="secondary" disabled={auth.offline} onPress={() => router.push('/email')}>
            {t('auth.welcome.email')}
          </Button>
          <Button
            variant="secondary"
            disabled={auth.offline}
            loading={busy === 'google'}
            onPress={() => start('google')}
          >
            {t('auth.welcome.google')}
          </Button>
          <Button
            variant="secondary"
            disabled={auth.offline}
            loading={busy === 'apple'}
            onPress={() => start('apple')}
          >
            {t('auth.welcome.apple')}
          </Button>
          {failed ? (
            <Text accessibilityLiveRegion="polite" className="text-center font-sans text-body-sm text-danger">
              {t('auth.welcome.oauthFailed')}
            </Text>
          ) : null}
          <Text className="pt-2 text-center font-sans text-body-sm text-secondary">
            {t('auth.welcome.termsPrefix')}{' '}
            <Text
              accessibilityRole="link"
              onPress={() => router.push('/legal/terms')}
              className="text-link underline"
            >
              {t('legal.terms')}
            </Text>{' '}
            {t('auth.welcome.termsAnd')}{' '}
            <Text
              accessibilityRole="link"
              onPress={() => router.push('/legal/privacy')}
              className="text-link underline"
            >
              {t('legal.privacy')}
            </Text>
            .
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
