import { Text, View } from 'react-native';

import { cn } from './cn';
import { useThemeColors } from '@/theme/use-theme';
import type { IconComponent } from '@/components/ui/rune-icon';

type ChipTone = 'brand' | 'amber' | 'neutral';

// DESIGN.md chips: small rounded-full tags, leading icon + label-sm.
// amber = outline only (Fragile); accent colour never carries text on white.
export function Chip({
  icon: Icon,
  tone = 'brand',
  children,
  className,
}: {
  icon?: IconComponent;
  tone?: ChipTone;
  children: string;
  className?: string;
}) {
  const colors = useThemeColors();
  const iconColor =
    tone === 'brand' ? colors.text.brand : tone === 'amber' ? colors.text.primary : colors.text.secondary;

  return (
    <View
      accessibilityRole="text"
      className={cn(
        'flex-row items-center gap-1 rounded-full px-4 py-2',
        tone === 'brand' && 'bg-interactive-secondary',
        tone === 'amber' && 'border border-accent bg-transparent',
        tone === 'neutral' && 'bg-tertiary',
        className,
      )}
    >
      {Icon ? <Icon size={12} strokeWidth={1.5} color={iconColor} accessibilityElementsHidden /> : null}
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.5}
        className={cn(
          'font-sans text-label-sm',
          tone === 'brand' ? 'text-brand' : tone === 'amber' ? 'text-primary' : 'text-secondary',
        )}
      >
        {children}
      </Text>
    </View>
  );
}
