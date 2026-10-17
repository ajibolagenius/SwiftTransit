import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { z } from 'zod';

import { AuthScaffold } from '@/components/auth-scaffold';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { describeAuthError } from '@/features/auth/errors';
import { sendEmailOtp } from '@/features/auth/otp';
import { Mail } from 'lucide-react-native';

const emailSchema = z.email();

export default function EmailScreen() {
  const { t } = useTranslation();
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [sending, setSending] = useState(false);

  const submit = async () => {
    const parsed = emailSchema.safeParse(email.trim());
    if (!parsed.success) {
      setError(t('auth.email.invalid'));
      return;
    }
    setError(undefined);
    setSending(true);
    try {
      await sendEmailOtp(parsed.data);
      router.push({ pathname: '/verify', params: { channel: 'email', destination: parsed.data } });
    } catch (err) {
      const problem = describeAuthError(err);
      setError(
        problem === 'rate_limited'
          ? t('auth.verify.rateLimited')
          : problem === 'offline'
            ? t('auth.offline')
            : t('auth.email.sendFailed'),
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
      <AuthScaffold
        title={t('auth.email.title')}
        subtitle={t('auth.email.subtitle')}
        notice={
          reason === 'sms_unavailable'
            ? { text: t('auth.email.smsEscapeNotice'), tone: 'neutral' }
            : undefined
        }
        action={
          <Button loading={sending} disabled={email.length === 0} onPress={submit}>
            {t('auth.continue')}
          </Button>
        }
      >
        <Input
          label={t('auth.email.label')}
          icon={Mail}
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setError(undefined);
          }}
          error={error}
          helper={t('auth.email.helper')}
          placeholder={t('auth.email.placeholder')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          autoFocus
        />
      </AuthScaffold>
    </KeyboardAvoidingView>
  );
}
