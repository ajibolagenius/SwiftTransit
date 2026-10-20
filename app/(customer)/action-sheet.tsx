import { useRouter } from 'expo-router';
import { Package } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { IconTile } from '@/components/ui/icon-tile';
import { selectDraft, useDraftStore } from '@/features/deliveries/draft-store';
import { firstIncompleteStep } from '@/features/deliveries/schemas';

// AC-1, AC-17: the centre action is the main door into the wizard. Track is shown
// as unavailable, and its hint is read with it.

export default function ActionSheetScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const draft = useDraftStore(selectDraft);
  const resumeStep = useDraftStore((state) => state.resumeStep);

  // The same door serves a resumed draft (AC-20), so a session lost mid wizard
  // is picked up on the step the customer was on.
  const target = resumeStep ?? firstIncompleteStep(draft) ?? 6;

  return (
    <View className="flex-1 gap-6 px-7 pb-8 pt-6">
      <IconTile icon={Package} size={64} className="self-center" />
      <Text accessibilityRole="header" className="text-center font-sans text-h3 text-primary">
        {t('actionSheet.title')}
      </Text>

      <View className="gap-3">
        {/* `replace` closes the sheet and opens step 1 in one action, so Back
            from the wizard lands on Home rather than on a dismissed sheet. */}
        <Button onPress={() => router.replace(`/new-delivery/${target}`)}>{t('actionSheet.send')}</Button>
        <Text className="text-center font-sans text-body-sm text-tertiary">{t('actionSheet.sendHint')}</Text>
      </View>

      <View
        className="gap-3"
        accessibilityRole="summary"
        accessibilityLabel={`${t('actionSheet.track')}. ${t('actionSheet.trackHint')}`}
      >
        <Button disabled onPress={() => undefined}>
          {t('actionSheet.track')}
        </Button>
        <Text className="text-center font-sans text-body-sm text-tertiary">{t('actionSheet.trackHint')}</Text>
      </View>
    </View>
  );
}
