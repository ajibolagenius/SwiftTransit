import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform } from 'react-native';

import { AuthScaffold } from '@/components/auth-scaffold';
import { Button } from '@/components/ui/button';
import { PhoneInput } from '@/components/ui/phone-input';
import { describeAuthError } from '@/features/auth/errors';
import { sendPhoneOtp } from '@/features/auth/otp';
import { toE164 } from '@/features/auth/phone';

export default function PhoneScreen() {
  const { t } = useTranslation();
  const [digits, setDigits] = useState('');
  const [error, setError] = useState<string>();
  const [sending, setSending] = useState(false);

  const submit = async () => {
    const e164 = toE164(digits);
    if (!e164) {
      setError(t('auth.phone.invalidNumber'));
      return;
    }
    setError(undefined);
    setSending(true);
    try {
      await sendPhoneOtp(e164);
      router.push({ pathname: '/verify', params: { channel: 'phone', destination: e164 } });
    } catch (err) {
      const problem = describeAuthError(err);
      setError(
        problem === 'rate_limited'
          ? t('auth.verify.rateLimited')
          : problem === 'offline'
            ? t('auth.offline')
            : t('auth.phone.sendFailed'),
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
      <AuthScaffold
        title={t('auth.phone.title')}
        subtitle={t('auth.phone.subtitle')}
        action={
          <Button loading={sending} disabled={digits.length === 0} onPress={submit}>
            {t('auth.continue')}
          </Button>
        }
      >
        <PhoneInput
          label={t('auth.phone.label')}
          value={digits}
          onChangeText={(text) => {
            setDigits(text.replace(/\D/g, ''));
            setError(undefined);
          }}
          error={error}
          helper={t('auth.phone.helper')}
          placeholder={t('auth.phone.placeholder')}
          autoFocus
        />
      </AuthScaffold>
    </KeyboardAvoidingView>
  );
}
