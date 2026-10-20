import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { AuthScaffold } from '@/components/auth-scaffold';
import { Button } from '@/components/ui/button';
import { OtpInput } from '@/components/ui/otp-input';
import { useAuth } from '@/features/auth/auth-provider';
import { describeAuthError } from '@/features/auth/errors';
import { sendEmailOtp, sendPhoneOtp, verifyEmailOtp, verifyPhoneOtp } from '@/features/auth/otp';
import { displayNumber } from '@/features/auth/phone';
import { useResendTimer } from '@/features/auth/use-resend-timer';

type Channel = 'phone' | 'email';

function formatCountdown(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export default function VerifyScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ channel?: string; destination?: string }>();
  const channel: Channel | null =
    params.channel === 'email' ? 'email' : params.channel === 'phone' ? 'phone' : null;
  const destination = params.destination;
  const refresh = useAuth().refresh;

  const [code, setCode] = useState('');
  const [problem, setProblem] = useState<ReturnType<typeof describeAuthError>>();
  const [verifying, setVerifying] = useState(false);
  // The code was sent on the way here, so the resend countdown starts now. Lazy init keeps
  // Date.now out of the render body (the same form the timer hook uses).
  const [sentAt, setSentAt] = useState<number | null>(() => Date.now());
  const busy = useRef(false);

  // AC-14 / client rules: verify is never an orphaned screen after a cold restart.
  useEffect(() => {
    if (!channel || !destination) router.replace('/welcome');
  }, [channel, destination]);

  const { remaining, canResend } = useResendTimer(sentAt);

  if (!channel || !destination) return null;

  const submit = async (token: string) => {
    if (busy.current || token.length < 6) return;
    busy.current = true;
    setVerifying(true);
    setProblem(undefined);
    try {
      if (channel === 'phone') await verifyPhoneOtp(destination, token);
      else await verifyEmailOtp(destination, token);
      await refresh();
      router.replace('/register');
    } catch (err) {
      setProblem(describeAuthError(err));
      setCode('');
    } finally {
      busy.current = false;
      setVerifying(false);
    }
  };

  const resend = async () => {
    if (!canResend) return;
    setProblem(undefined);
    try {
      if (channel === 'phone') await sendPhoneOtp(destination);
      else await sendEmailOtp(destination);
      setSentAt(Date.now());
      setCode('');
    } catch (err) {
      setProblem(describeAuthError(err));
    }
  };

  // AC-11: the SMS escape hatch switches the whole flow to the email channel.
  const switchToEmail = () => {
    router.replace({ pathname: '/email', params: { reason: 'sms_unavailable' } });
  };

  const errorCopy =
    problem === 'expired'
      ? t('auth.verify.expired')
      : problem === 'rate_limited'
        ? t('auth.verify.rateLimited')
        : problem === 'offline'
          ? t('auth.offline')
          : problem
            ? t('auth.verify.invalid')
            : undefined;

  return (
    <AuthScaffold
      title={channel === 'phone' ? t('auth.verify.titlePhone') : t('auth.verify.titleEmail')}
      subtitle={
        channel === 'phone'
          ? t('auth.verify.subtitlePhone', { number: displayNumber(destination) })
          : t('auth.verify.subtitleEmail', { email: destination })
      }
      action={
        <Button loading={verifying} disabled={code.length < 6} onPress={() => submit(code)}>
          {t('auth.verify.submit')}
        </Button>
      }
    >
      <View className="gap-7">
        <OtpInput
          label={t('auth.verify.codeLabel')}
          value={code}
          onChange={setCode}
          error={errorCopy}
          onComplete={(token) => void submit(token)}
        />
        <View className="flex-row items-center">
          <Text className="font-sans text-body-md text-secondary">{t('auth.verify.notReceived')}</Text>
          <Button variant="link" disabled={!canResend} onPress={resend} className="py-0 pl-1">
            {canResend
              ? t('auth.verify.resendNow')
              : t('auth.verify.resendIn', { time: formatCountdown(remaining) })}
          </Button>
        </View>
        {channel === 'phone' ? (
          <Button variant="link" underline onPress={switchToEmail} className="self-start">
            {t('auth.verify.useEmail')}
          </Button>
        ) : null}
      </View>
    </AuthScaffold>
  );
}
