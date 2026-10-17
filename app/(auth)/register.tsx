import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, type Control } from 'react-hook-form';
import { Mail, User, UserRound } from 'lucide-react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { z } from 'zod';

import { AuthScaffold } from '@/components/auth-scaffold';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectCard } from '@/components/ui/select-card';
import { useAuth } from '@/features/auth/auth-provider';
import type { Role } from '@/features/auth/guards';
import { completeRegistration } from '@/features/auth/register';

const schema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: z.union([z.literal(''), z.email()]),
});

type Form = z.infer<typeof schema>;

export default function RegisterScreen() {
  const { t } = useTranslation();
  const auth = useAuth();
  const user = auth.status === 'signed-in' ? auth.session?.user : undefined;
  const emailOnAccount = Boolean(user?.email);
  const [role, setRole] = useState<Role>('customer');
  const [emailTaken, setEmailTaken] = useState(false);
  const [failed, setFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { control, handleSubmit } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: (user?.user_metadata?.given_name as string) ?? '',
      lastName: (user?.user_metadata?.family_name as string) ?? '',
      email: user?.email ?? '',
    },
  });

  const submit = handleSubmit(async (values) => {
    setSubmitting(true);
    setFailed(false);
    setEmailTaken(false);
    const problem = await completeRegistration({
      firstName: values.firstName,
      lastName: values.lastName,
      role,
      email: emailOnAccount ? undefined : values.email || undefined,
    });
    if (problem === 'email_taken') setEmailTaken(true);
    else if (problem) setFailed(true);
    else await auth.refresh(); // the guard routes to the right tabs once the profile exists
    setSubmitting(false);
  });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
      <AuthScaffold
        title={t('auth.register.title')}
        subtitle={t('auth.register.subtitle')}
        notice={failed ? { text: t('auth.register.failed'), tone: 'danger' } : undefined}
        action={
          <Button loading={submitting} onPress={submit}>
            {t('auth.register.submit')}
          </Button>
        }
      >
        <View className="gap-7">
          <FormField
            control={control}
            name="firstName"
            label={t('auth.register.firstName')}
            placeholder={t('auth.register.firstNamePlaceholder')}
            errorCopy={t('auth.register.nameRequired')}
            icon={User}
            textContentType="givenName"
            autoComplete="given-name"
          />
          <FormField
            control={control}
            name="lastName"
            label={t('auth.register.lastName')}
            placeholder={t('auth.register.lastNamePlaceholder')}
            errorCopy={t('auth.register.nameRequired')}
            icon={User}
            textContentType="familyName"
            autoComplete="family-name"
          />
          {emailOnAccount ? (
            <Input label={t('auth.register.email')} icon={Mail} value={user?.email ?? ''} editable={false} />
          ) : (
            <FormField
              control={control}
              name="email"
              label={t('auth.register.emailOptional')}
              placeholder={t('auth.register.emailPlaceholder')}
              errorCopy={t('auth.email.invalid')}
              icon={Mail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              error={emailTaken ? t('auth.register.emailTaken') : undefined}
            />
          )}
          <View className="gap-2">
            <Text className="font-sans text-label-md text-secondary">{t('auth.register.accountType')}</Text>
            <View className="flex-row gap-4">
              <SelectCard
                className="flex-1"
                icon={UserRound}
                title={t('auth.register.courier')}
                subtitle={t('auth.register.courierHint')}
                selected={role === 'courier'}
                onPress={() => setRole('courier')}
              />
              <SelectCard
                className="flex-1"
                icon={User}
                title={t('auth.register.client')}
                subtitle={t('auth.register.clientHint')}
                selected={role === 'customer'}
                onPress={() => setRole('customer')}
              />
            </View>
          </View>
          <Text className="font-sans text-body-sm text-secondary">
            {t('auth.register.termsPrefix')}{' '}
            <Text
              accessibilityRole="link"
              onPress={() => router.push('/legal/terms')}
              className="text-link underline"
            >
              {t('legal.terms')}
            </Text>{' '}
            {t('auth.register.termsAnd')}{' '}
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
      </AuthScaffold>
    </KeyboardAvoidingView>
  );
}

function FormField({
  control,
  name,
  label,
  placeholder,
  errorCopy,
  icon,
  error,
  ...inputProps
}: {
  control: Control<Form>;
  name: keyof Form;
  label: string;
  placeholder: string;
  errorCopy: string;
  icon: typeof User;
  error?: string;
} & Record<string, unknown>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, onBlur }, fieldState }) => (
        <Input
          label={label}
          icon={icon}
          value={value}
          placeholder={placeholder}
          onChangeText={onChange}
          onBlur={onBlur}
          error={error ?? (fieldState.error ? errorCopy : undefined)}
          {...inputProps}
        />
      )}
    />
  );
}
