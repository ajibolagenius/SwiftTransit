import type { LucideIcon } from 'lucide-react-native';
import { ChevronsUp } from 'lucide-react-native';
import { Platform, Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cn } from './cn';
import { usePressScale } from './use-press-scale';
import { palette } from '@/theme/tokens';
import { useScheme, useThemeColors } from '@/theme/use-theme';

// DESIGN.md navigation: root tabs with a raised centre action. The FAB is 52 px on the brand surface;
// shadows are reserved for floating elements and only in light mode (dark uses the border instead).
const FAB_SIZE = 52;
const FAB_RISE = 18;

export type TabBarItem = { key: string; label: string; icon: LucideIcon };

export function TabBar({
  items,
  activeKey,
  onSelect,
  fab,
}: {
  items: TabBarItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  fab?: { label: string; onPress: () => void };
}) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const mid = Math.ceil(items.length / 2);
  const halves = fab ? [items.slice(0, mid), items.slice(mid)] : [items, []];

  const renderTab = (item: TabBarItem) => {
    const active = item.key === activeKey;
    const Icon = item.icon;
    return (
      <Pressable
        key={item.key}
        accessibilityRole="button"
        accessibilityLabel={item.label}
        accessibilityState={{ selected: active }}
        onPress={() => onSelect(item.key)}
        className="h-12 flex-1 items-center justify-center gap-1"
      >
        <Icon size={24} strokeWidth={1.5} color={active ? colors.text.brand : colors.text.tertiary} />
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.5}
          className={cn('font-sans text-label-sm', active ? 'text-brand' : 'text-tertiary')}
        >
          {item.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      accessibilityRole="none"
      className="absolute inset-x-0 bottom-0 flex-row border-t border-default bg-primary"
      style={{ paddingBottom: Math.max(insets.bottom, 8) }}
    >
      {halves[0].map(renderTab)}
      {fab ? <Fab label={fab.label} onPress={fab.onPress} /> : null}
      {halves[1].map(renderTab)}
    </View>
  );
}

function Fab({ label, onPress }: { label: string; onPress: () => void }) {
  const { animatedStyle, onPressIn, onPressOut } = usePressScale();
  const scheme = useScheme();
  const colors = useThemeColors();

  const float =
    Platform.OS === 'ios'
      ? // DESIGN.md elevation: 0 4 16 rgba(0,0,0,0.08), light mode only.
        {
          shadowColor: palette['neutral-950'],
          shadowOpacity: 0.08,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 4 },
        }
      : { elevation: 4 };

  return (
    <View className="relative h-12 flex-1 items-center">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        className="absolute"
        style={{ top: -FAB_RISE }}
      >
        <Animated.View
          style={[
            animatedStyle,
            { width: FAB_SIZE, height: FAB_SIZE },
            // Light: soft shadow; dark: outline instead (DESIGN.md elevation).
            scheme === 'light' ? float : { borderWidth: 1, borderColor: colors.border.default },
          ]}
          className="items-center justify-center rounded-full bg-interactive-primary"
        >
          <ChevronsUp
            size={24}
            strokeWidth={1.5}
            color={colors.text['on-brand']}
            accessibilityElementsHidden
          />
        </Animated.View>
      </Pressable>
    </View>
  );
}
