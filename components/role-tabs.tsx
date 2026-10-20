import { Tabs, useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { TabBar } from '@/components/ui/tab-bar';
import type en from '@/locales/en.json';
import { useThemeColors } from '@/theme/use-theme';
import type { IconComponent } from '@/components/ui/rune-icon';

type ScreenKey = keyof (typeof en)['screens'];

type TabConfig = { name: string; title: ScreenKey; icon: IconComponent };

// Root tabs with the DESIGN.md custom bar and raised centre action.
export function RoleTabs({ tabs, fab }: { tabs: TabConfig[]; fab?: { label: ScreenKey; route: string } }) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg.primary },
      }}
      tabBar={({ state, navigation }) => (
        <TabBar
          items={state.routes.flatMap((route) => {
            const config = tabs.find((tab) => tab.name === route.name);
            return config ? [{ key: route.key, label: t(`screens.${config.title}`), icon: config.icon }] : [];
          })}
          activeKey={state.routes[state.index]?.key ?? ''}
          onSelect={(key) => {
            const route = state.routes.find((item) => item.key === key);
            if (route) navigation.navigate(route.name);
          }}
          fab={
            fab
              ? { label: t(`screens.${fab.label}`), onPress: () => router.push(fab.route as Href) }
              : undefined
          }
        />
      )}
    >
      {tabs.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: t(`screens.${tab.title}`) }} />
      ))}
    </Tabs>
  );
}
