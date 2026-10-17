import { router } from 'expo-router';
import { MapPin } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Text, View } from 'react-native';
import * as Location from 'expo-location';

import { Button } from '@/components/ui/button';
import { IconTile } from '@/components/ui/icon-tile';

// Spec 0003 AC-12: shared location permission sheet (formSheet) at permission/location.
// Allow, ask-later, and a denied path that opens device settings. Any flow can link here.
export default function LocationPermissionSheet() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<'ask' | 'denied'>('ask');
  const [busy, setBusy] = useState(false);

  const allow = async () => {
    setBusy(true);
    try {
      const { status: next } = await Location.requestForegroundPermissionsAsync();
      if (next === 'granted') router.back();
      else setStatus('denied');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="flex-1 items-center gap-6 px-7 pb-8 pt-6">
      <IconTile icon={MapPin} size={64} />
      <View className="items-center gap-2">
        <Text accessibilityRole="header" className="text-center font-sans text-h3 text-primary">
          {t('permission.location.title')}
        </Text>
        <Text className="text-center font-sans text-body-md text-secondary">
          {status === 'denied' ? t('permission.location.denied') : t('permission.location.body')}
        </Text>
      </View>

      <View className="w-full gap-4 pt-2">
        {status === 'denied' ? (
          <Button onPress={() => Linking.openSettings()}>{t('permission.location.openSettings')}</Button>
        ) : (
          <Button loading={busy} onPress={allow}>
            {t('permission.location.allow')}
          </Button>
        )}
        <Button variant="link" onPress={() => router.back()}>
          {t('permission.location.later')}
        </Button>
      </View>
    </View>
  );
}
