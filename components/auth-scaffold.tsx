import { ChevronLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconButton } from '@/components/ui/icon-button';

// Spec 0003 / DESIGN.md auth screens: back button, header + subtitle, content,
// one primary action pinned above the home indicator.
export function AuthScaffold({
  title,
  subtitle,
  children,
  action,
  notice,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  action?: ReactNode;
  notice?: { text: string; tone?: 'danger' | 'neutral' };
}) {
  const { t } = useTranslation();
  return (
    <SafeAreaView className="flex-1 bg-primary" edges={['top', 'bottom']}>
      <View className="flex-1 px-7 pt-3">
        <IconButton
          icon={ChevronLeft}
          accessibilityLabel={t('auth.back')}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/welcome'))}
        />
        <View className="gap-2 pt-9">
          <Text accessibilityRole="header" className="font-sans text-h2 text-primary">
            {title}
          </Text>
          {subtitle ? <Text className="font-sans text-body-md text-secondary">{subtitle}</Text> : null}
        </View>
        {notice ? (
          <View
            className={
              'mt-7 rounded-xl border p-6 ' +
              (notice.tone === 'danger' ? 'border-danger bg-secondary' : 'border-default bg-secondary')
            }
          >
            <Text
              accessibilityLiveRegion="polite"
              className={
                notice.tone === 'danger'
                  ? 'font-sans text-body-md text-danger'
                  : 'font-sans text-body-md text-secondary'
              }
            >
              {notice.text}
            </Text>
          </View>
        ) : null}
        <View className="flex-1 pt-9">{children}</View>
        {action ? <View className="pb-4 pt-7">{action}</View> : null}
      </View>
    </SafeAreaView>
  );
}
