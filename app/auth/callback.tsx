import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { exchangeCallbackUrl } from '@/features/auth/oauth';

// swifttransit://auth/callback?code=...&state=...  (spec 0003 OAuth handoff).
// Covers the cold-start case where the browser relaunches the app instead of resolving
// the pending openAuthSessionAsync. On success the AuthProvider guard routes onward.
export default function AuthCallbackScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ code?: string }>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    if (!params.code) {
      router.replace('/welcome');
      return;
    }
    const callbackUrl = `swifttransit://auth/callback?code=${encodeURIComponent(params.code)}`;
    exchangeCallbackUrl(callbackUrl)
      .then(() => active && router.replace('/register'))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [params.code]);

  return (
    <SafeAreaView className="flex-1 bg-primary" edges={['top', 'bottom']}>
      <View className="flex-1 items-center justify-center px-7">
        <Text className="text-center font-sans text-body-md text-secondary">
          {failed ? t('auth.welcome.oauthFailed') : t('auth.welcome.finishing')}
        </Text>
      </View>
    </SafeAreaView>
  );
}
