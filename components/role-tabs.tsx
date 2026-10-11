import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import type en from '@/locales/en.json';
import { useThemeColors } from '@/theme/use-theme';

type ScreenKey = keyof (typeof en)['screens'];

// Stock tab bar themed with tokens; the custom bar with the centre action is scope feature 4.
export function RoleTabs({ tabs }: { tabs: { name: string; title: ScreenKey }[] }) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text.brand,
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarStyle: { backgroundColor: colors.bg.primary, borderTopColor: colors.border.default },
        tabBarLabelStyle: { fontFamily: 'Urbanist', fontWeight: '500' },
        sceneStyle: { backgroundColor: colors.bg.primary },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: t(`screens.${tab.title}`) }} />
      ))}
    </Tabs>
  );
}
