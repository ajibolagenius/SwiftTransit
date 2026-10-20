import { Link } from 'expo-router';
import { User } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { selectDraft, useDraftStore } from '../draft-store';
import { receiverSlice, toE164 } from '../schemas';
import { WizardScreen, type StepProps } from '../wizard';

// AC-5: a name plus a Nigerian mobile, normalised to E.164 before it is stored,
// and one line that says who will see it, linking to the privacy policy.

export function ReceiverStep({ onBack, onContinue }: StepProps) {
  const { t } = useTranslation();
  const draft = useDraftStore(selectDraft);
  const update = useDraftStore((state) => state.update);

  const [name, setName] = useState(draft.receiverName ?? '');
  // The field carries the national number; +234 is the default dial code.
  const [phone, setPhone] = useState((draft.receiverPhone ?? '').replace('+234', ''));

  const e164 = toE164(phone);
  const nameProblem = receiverSlice.shape.receiverName.safeParse(name.trim()).success
    ? null
    : t('newDelivery.receiver.nameInvalid');
  const phoneProblem = e164 ? null : t('newDelivery.receiver.phoneInvalid');

  // The inline error shows live as a field turns invalid (AC-5), the same way the
  // package step surfaces its weight error, while Continue stays disabled until
  // both checks pass. The `!e164` branch only narrows the type for the store.
  const continueBooking = () => {
    if (!e164) {
      return;
    }
    update({ receiverName: name.trim(), receiverPhone: e164 });
    onContinue();
  };

  return (
    <WizardScreen
      step={4}
      title={t('newDelivery.receiver.title')}
      body={t('newDelivery.receiver.body')}
      continueLabel={t('newDelivery.continue')}
      continueDisabled={!name.trim() || !e164}
      onContinue={continueBooking}
      onBack={onBack}
    >
      <ScrollView contentContainerClassName="gap-6 pb-4">
        <Input
          label={t('newDelivery.receiver.nameLabel')}
          placeholder={t('newDelivery.receiver.namePlaceholder')}
          value={name}
          onChangeText={setName}
          icon={User}
          autoComplete="name"
          textContentType="name"
          error={name.length > 0 ? (nameProblem ?? undefined) : undefined}
        />
        <PhoneInput
          label={t('newDelivery.receiver.phoneLabel')}
          placeholder={t('newDelivery.receiver.phonePlaceholder')}
          value={phone}
          onChangeText={setPhone}
          helper={t('newDelivery.receiver.body')}
          error={phone.length > 0 ? (phoneProblem ?? undefined) : undefined}
        />
        <View className="gap-2 rounded-xl border border-default bg-tertiary p-5">
          <Text className="font-sans text-body-sm text-secondary">{t('newDelivery.receiver.privacy')}</Text>
          {/* Link doesn't forward className; style the child Text instead. */}
          <Link href="/legal/privacy" asChild>
            <Text accessibilityRole="link" className="py-1 font-sans text-label-md text-link">
              {t('newDelivery.receiver.privacyLink')}
            </Text>
          </Link>
        </View>
      </ScrollView>
    </WizardScreen>
  );
}
