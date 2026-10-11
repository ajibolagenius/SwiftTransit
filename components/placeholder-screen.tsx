import { Link, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type en from '@/locales/en.json';

type ScreenKey = keyof (typeof en)['screens'];

// Scaffold-only stand-in until each scope feature builds the real screen.
export function PlaceholderScreen({
  title,
  feature,
  design,
  links = [],
  children,
}: {
  title: ScreenKey;
  feature: number;
  design?: string;
  links?: { href: Href; label: ScreenKey }[];
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <SafeAreaView className="flex-1 bg-primary">
      <View className="gap-3 px-7 pt-9">
        <Text accessibilityRole="header" className="font-sans text-h2 text-primary">
          {t(`screens.${title}`)}
        </Text>
        <Text className="font-sans text-body-md text-secondary">
          {t('placeholder.comingSoon', { feature: `scope feature ${feature}` })}
        </Text>
        {design ? (
          <Text className="font-sans text-body-sm text-tertiary">
            {t('placeholder.design', { file: design })}
          </Text>
        ) : null}
        {links.map((link) => (
          // Link doesn't forward className; style the child Text instead.
          <Link key={String(link.href)} href={link.href} asChild>
            <Text accessibilityRole="link" className="py-3 font-sans text-label-md text-link">
              {t(`screens.${link.label}`)}
            </Text>
          </Link>
        ))}
      </View>
      {children ? <View className="mt-7 flex-1">{children}</View> : null}
    </SafeAreaView>
  );
}
