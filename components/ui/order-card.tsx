import type { LucideIcon } from 'lucide-react-native';
import { MoreVertical, Package } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { IconButton } from './icon-button';
import { IconTile } from './icon-tile';
import { usePressScale } from './use-press-scale';

// DESIGN.md order-card: quiet surface, package icon, title, tracking/ETA pairs, overflow menu.
export function OrderCard({
  title,
  trackingId,
  trackingLabel,
  etaLabel,
  etaValue,
  icon = Package,
  overflowLabel,
  onPress,
  onOverflowPress,
  className,
}: {
  title: string;
  trackingId: string;
  trackingLabel: string;
  etaLabel: string;
  etaValue: string;
  icon?: LucideIcon;
  overflowLabel?: string;
  onPress?: () => void;
  onOverflowPress?: () => void;
  className?: string;
}) {
  const { animatedStyle, onPressIn, onPressOut } = usePressScale();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${trackingLabel} ${trackingId}, ${etaLabel} ${etaValue}`}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      className={className}
    >
      <Animated.View style={animatedStyle} className="gap-4 rounded-2xl bg-secondary p-7">
        <View className="flex-row items-center gap-4">
          <IconTile icon={icon} />
          <View className="min-w-0 flex-1 gap-1">
            <Text numberOfLines={1} className="font-sans text-subheading-md text-primary">
              {title}
            </Text>
          </View>
          {onOverflowPress && overflowLabel ? (
            <IconButton
              icon={MoreVertical}
              accessibilityLabel={overflowLabel}
              size={44}
              onPress={onOverflowPress}
            />
          ) : null}
        </View>
        <View className="flex-row gap-7">
          <Meta label={trackingLabel} value={trackingId} />
          <Meta label={etaLabel} value={etaValue} />
        </View>
      </Animated.View>
    </Pressable>
  );
}

// label = tertiary (metadata), value = primary (must stay readable per DESIGN.md named rules)
function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 gap-1">
      <Text className="font-sans text-label-sm text-tertiary">{label}</Text>
      <Text numberOfLines={1} className="font-sans text-body-md text-primary">
        {value}
      </Text>
    </View>
  );
}
