import { MapPin, Package, Truck } from 'lucide-react-native';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Image, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { Button } from '@/components/ui/button';
import { IconTile } from '@/components/ui/icon-tile';
import { useAuth } from '@/features/auth/auth-provider';

// Spec 0003 AC-1: three slides, shown once per install. Slide 3 copy is defined in the spec
// (its Figma export is missing). Each slide has a "Jump to Sign in" skip; slide 3 the final action.
const SLIDES = [
  { icon: Truck, title: 'deliverAnything', body: 'deliverAnythingBody' },
  { icon: Package, title: 'createDelivery', body: 'createDeliveryBody' },
  { icon: MapPin, title: 'trackEveryStep', body: 'trackEveryStepBody' },
] as const;

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const { markOnboardingSeen } = useAuth();
  const listRef = useRef<FlatList<(typeof SLIDES)[number]>>(null);
  const [index, setIndex] = useState(0);
  const [slideWidth, setSlideWidth] = useState(0);
  const last = index === SLIDES.length - 1;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width);
    if (next !== index) setIndex(next);
  };

  const finish = () => {
    markOnboardingSeen(); // one-way flag: skip or complete, never shown again this install
    router.replace('/welcome');
  };

  const next = () => {
    if (last) {
      finish();
      return;
    }
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  };

  return (
    <View className="flex-1 bg-primary">
      <View className="items-center gap-2 pt-11">
        <Image
          source={require('../../assets/splash-icon.png')}
          style={{ width: 56, height: 56 }}
          resizeMode="contain"
        />
        <Text className="font-sans text-h4 text-brand">{t('app.name')}</Text>
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onLayout={(e) => setSlideWidth(e.nativeEvent.layout.width)}
        onMomentumScrollEnd={onScroll}
        renderItem={({ item, index: i }) => (
          <View style={{ width: slideWidth || undefined }} className="flex-1">
            <View className="flex-1 items-center gap-7 px-11 pt-11">
              <View
                className="w-full items-center justify-center rounded-3xl bg-brand-soft"
                style={{ height: 176 }}
              >
                <IconTile icon={item.icon} size={88} />
              </View>
              <View className="items-center gap-3">
                <Text accessibilityRole="header" className="text-center font-sans text-h1 text-primary">
                  {t(`onboarding.${item.title}`)}
                </Text>
                <Text className="text-center font-sans text-body-lg text-secondary">
                  {t(`onboarding.${item.body}`)}
                </Text>
              </View>
              <View
                className="mt-auto flex-row gap-2 pb-9"
                accessibilityElementsHidden
                importantForAccessibility="no"
              >
                {SLIDES.map((_, d) => (
                  <View
                    key={d}
                    className={d === i ? 'h-2 w-6 rounded-full bg-brand' : 'h-2 w-2 rounded-full bg-tertiary'}
                  />
                ))}
              </View>
            </View>
          </View>
        )}
      />

      <View className="gap-1 px-7 pb-4">
        <Button onPress={next}>{last ? t('onboarding.getStarted') : t('onboarding.next')}</Button>
        <Button variant="link" underline onPress={finish}>
          {t('onboarding.jumpToSignIn')}
        </Button>
      </View>
    </View>
  );
}
