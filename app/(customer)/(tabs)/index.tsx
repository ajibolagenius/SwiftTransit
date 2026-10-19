import { useRouter } from 'expo-router';
import { ClipboardList, Package } from 'lucide-react-native';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { SelectCard } from '@/components/ui/select-card';
import { selectDraft, useDraftStore } from '@/features/deliveries/draft-store';
import { firstIncompleteStep } from '@/features/deliveries/schemas';

// AC-1: a second door into the wizard. AC-20: a draft left by a sign in detour
// is picked up by that same door, on the step the customer was on.

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const draft = useDraftStore(selectDraft);
  const resumeStep = useDraftStore((state) => state.resumeStep);

  // An empty draft resolves to step 1, so one line covers a fresh booking and
  // a resumed one. A complete draft waits on the last step, not the summary.
  const target = resumeStep ?? firstIncompleteStep(draft) ?? 6;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-primary">
      <ScrollView contentContainerClassName="gap-7 px-7 pb-8 pt-6" className="flex-1">
        <View className="gap-1">
          <Text accessibilityRole="header" className="font-sans text-h2 text-primary">
            {t('app.name')}
          </Text>
          <Text className="font-sans text-body-md text-secondary">{t('home.subtitle')}</Text>
        </View>

        <View className="gap-4">
          <SelectCard
            icon={Package}
            title={t('home.sendTitle')}
            subtitle={t('home.sendSubtitle')}
            onPress={() => router.push(`/new-delivery/${target}`)}
          />

          {/* Feature 7 builds the orders screen; the row is visible and unavailable now (AC-17). */}
          <View
            accessibilityRole="summary"
            accessibilityLabel={`${t('home.trackTitle')}. ${t('home.trackDisabled')}`}
            className="opacity-60"
          >
            <SelectCard
              icon={ClipboardList}
              title={t('home.trackTitle')}
              subtitle={t('home.trackDisabled')}
            />
          </View>
        </View>

        {draft.type ? (
          <Text className="font-sans text-body-sm text-tertiary">
            {t('home.draftNote', { type: t(`newDelivery.type.${draft.type}`) })}
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
