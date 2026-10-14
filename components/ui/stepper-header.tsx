import { Check } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { cn } from './cn';
import { useThemeColors } from '@/theme/use-theme';

// DESIGN.md stepper-header: brand-soft card, "Step N of 6", step name, and dots.
// done = success check, current = filled brand square, upcoming = outline circle.
export function StepperHeader({
  progressLabel,
  title,
  step,
  total,
  className,
}: {
  progressLabel: string;
  title: string;
  step: number;
  total: number;
  className?: string;
}) {
  const colors = useThemeColors();

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={`${progressLabel}, ${title}`}
      className={cn('gap-3 rounded-xl bg-brand-soft p-5', className)}
    >
      <View className="gap-1">
        <Text className="font-sans text-label-sm text-tertiary">{progressLabel}</Text>
        <Text accessibilityRole="header" className="font-sans text-subheading-lg text-primary">
          {title}
        </Text>
      </View>
      <View className="flex-row items-center gap-2" accessibilityElementsHidden>
        {Array.from({ length: total }, (_, i) => {
          const n = i + 1;
          if (n < step) return <Check key={n} size={14} strokeWidth={2} color={colors.bg.success} />;
          if (n === step) return <View key={n} className="h-2 w-2 bg-interactive-primary" />;
          return <View key={n} className="h-2 w-2 rounded-full border border-strong" />;
        })}
      </View>
    </View>
  );
}
