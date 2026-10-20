import { Check, Flag, X } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { useThemeColors } from '@/theme/use-theme';

// DESIGN.md stepper-header dots, laid out vertically with timestamps: reached
// steps carry the green check, the current step is a filled square, upcoming
// steps are outlines. Terminal states replace the last dot with their own mark.

export type TimelineEntry = {
  label: string;
  timestamp: string | null;
  state: 'done' | 'current' | 'upcoming';
};

export type TimelineTerminal = { label: string; timestamp: string | null; kind: 'cancelled' | 'failed' };

export function StatusTimeline({
  entries,
  terminal,
}: {
  entries: TimelineEntry[];
  terminal?: TimelineTerminal | null;
}) {
  const colors = useThemeColors();

  return (
    <View accessibilityRole="summary" className="gap-0">
      {entries.map((entry, index) => {
        const isLast = index === entries.length - 1 && !terminal;
        return (
          <View key={entry.label} className="flex-row overflow-hidden">
            <View className="relative w-8 items-center">
              <Dot entry={entry} />
              {!isLast ? (
                <View
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                  className="absolute bottom-0 top-6"
                  style={{
                    width: 1,
                    backgroundColor: entry.state === 'upcoming' ? colors.border.subtle : colors.bg.brand,
                  }}
                />
              ) : null}
            </View>
            <View className={isLast ? 'flex-1 pb-1' : 'flex-1 pb-6'}>
              <Text
                className="font-sans text-label-md"
                style={{
                  color: entry.state === 'upcoming' ? colors.text.tertiary : colors.text.primary,
                }}
              >
                {entry.label}
              </Text>
              {entry.timestamp ? (
                <Text className="font-sans text-body-sm text-tertiary">{entry.timestamp}</Text>
              ) : null}
            </View>
          </View>
        );
      })}
      {terminal ? (
        <View className="flex-row">
          <View className="w-8 items-center">
            <View className="h-6 w-6 items-center justify-center rounded-full border border-default bg-secondary">
              {terminal.kind === 'failed' ? (
                <Flag size={12} strokeWidth={1.5} color={colors.text.danger} accessibilityElementsHidden />
              ) : (
                <X size={12} strokeWidth={1.5} color={colors.text.secondary} accessibilityElementsHidden />
              )}
            </View>
          </View>
          <View className="flex-1 pb-1">
            <Text
              className="font-sans text-label-md"
              style={{ color: terminal.kind === 'failed' ? colors.text.danger : colors.text.primary }}
            >
              {terminal.label}
            </Text>
            {terminal.timestamp ? (
              <Text className="font-sans text-body-sm text-tertiary">{terminal.timestamp}</Text>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Dot({ entry }: { entry: TimelineEntry }) {
  const colors = useThemeColors();
  if (entry.state === 'done') {
    return (
      <View
        className="h-6 w-6 items-center justify-center rounded-full"
        style={{ backgroundColor: colors.bg.success }}
      >
        <Check size={12} strokeWidth={2} color={colors.bg.primary} accessibilityElementsHidden />
      </View>
    );
  }
  if (entry.state === 'current') {
    return (
      <View
        className="h-6 w-6 items-center justify-center rounded-full"
        style={{ backgroundColor: colors.bg.brand }}
      >
        <View
          accessibilityElementsHidden
          importantForAccessibility="no"
          className="h-2 w-2 rounded-sm"
          style={{ backgroundColor: colors.text['on-brand'] }}
        />
      </View>
    );
  }
  return <View className="h-6 w-6 rounded-full border border-default bg-primary" />;
}
