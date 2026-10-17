import { Pressable, Text, View } from 'react-native';

import { cn } from './cn';

// DESIGN.md balance-card: brand-subtle surface, label, display amount, white pill action.
// Amount arrives already formatted (integer kobo is formatted at display only); tabular figures stop it jittering.

// Urbanist has no U+20A6, so the system naira glyph overhangs its advance into the first digit. U+2009 is in
// Urbanist, so it sets a real gap rather than pulling in another fallback glyph.
const LEADING_CURRENCY_SYMBOL = /^(\D)(?=\d)/;

export function BalanceCard({
  label,
  amount,
  actionLabel,
  onActionPress,
  className,
}: {
  label: string;
  amount: string;
  actionLabel: string;
  onActionPress?: () => void;
  className?: string;
}) {
  return (
    <View className={cn('gap-4 rounded-2xl bg-interactive-secondary p-7', className)}>
      <View className="gap-1">
        <Text className="font-sans text-label-sm text-secondary">{label}</Text>
        <Text style={{ fontVariant: ['tabular-nums'] }} className="font-sans text-display-lg text-primary">
          {amount.replace(LEADING_CURRENCY_SYMBOL, '$1 ')}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={onActionPress}
        className="h-11 self-start rounded-full bg-primary px-8 active:opacity-70"
      >
        <View className="flex-1 items-center justify-center">
          <Text className="font-sans text-label-md text-primary">{actionLabel}</Text>
        </View>
      </Pressable>
    </View>
  );
}
