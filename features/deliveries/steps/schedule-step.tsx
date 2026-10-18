import { useState } from 'react';
import type { ViewStyle } from 'react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Segmented } from '@/components/ui/segmented';
import { selectDraft, useDraftStore } from '../draft-store';
import { dayLabel, dayOptions, slotsForDay, type DayOption } from '../schedule';
import { scheduleSlice } from '../schemas';
import { WizardScreen, type StepProps } from '../wizard';

// AC-7: ASAP or a two hour slot inside seven days. The slot's start instant is
// stored in UTC; ASAP is a null `scheduled_at`.

const DAY_WIDTH = 76; // chip width, a component constant not a spacing step

function PressableChip({
  label,
  selected,
  onPress,
  className,
  style,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  className?: string;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={style}
      className={`items-center justify-center rounded-xl border p-4 ${
        selected ? 'border-brand bg-brand-soft' : 'border-default bg-primary'
      } ${className ?? ''}`}
    >
      <Text
        numberOfLines={1}
        className={`font-sans text-label-md ${selected ? 'text-brand' : 'text-primary'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function ScheduleStep({ onBack, onContinue }: StepProps) {
  const { t } = useTranslation();
  const draft = useDraftStore(selectDraft);
  const update = useDraftStore((state) => state.update);
  const [mode, setMode] = useState<'asap' | 'slot'>(draft.scheduledAt ? 'slot' : 'asap');
  const [dayIndex, setDayIndex] = useState(0);

  const now = new Date();
  const days = dayOptions(now);
  const day: DayOption = days[dayIndex] ?? days[0];
  const slots = slotsForDay(day, now);
  // A slot picked earlier can fall out of the seven day window while the wizard
  // stays open. The step guard would then send the customer back here with no
  // explanation, so the step says it in the same words the list already uses.
  const stale = draft.scheduledAt !== null && !scheduleSlice.safeParse(draft).success;
  const labels = {
    today: t('newDelivery.schedule.dayToday'),
    tomorrow: t('newDelivery.schedule.dayTomorrow'),
  };

  return (
    <WizardScreen
      step={6}
      title={t('newDelivery.schedule.title')}
      body={t('newDelivery.schedule.body')}
      continueLabel={t('newDelivery.continue')}
      continueDisabled={mode === 'slot' && (!draft.scheduledAt || stale)}
      onContinue={() => {
        if (mode === 'asap') update({ scheduledAt: null });
        onContinue();
      }}
      onBack={onBack}
    >
      <View className="gap-6">
        <Segmented
          label={t('newDelivery.schedule.title')}
          options={[
            { value: 'asap', label: t('newDelivery.schedule.asap') },
            { value: 'slot', label: t('newDelivery.schedule.later') },
          ]}
          value={mode}
          onChange={(next) => {
            setMode(next);
            if (next === 'asap') update({ scheduledAt: null });
          }}
        />

        {mode === 'asap' ? (
          <Text className="font-sans text-body-md text-secondary">{t('newDelivery.schedule.asapHint')}</Text>
        ) : (
          <View className="gap-4">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3">
              {days.map((option) => (
                <PressableChip
                  key={option.index}
                  label={dayLabel(option, labels)}
                  selected={option.index === dayIndex}
                  className="px-2"
                  style={{ width: DAY_WIDTH }}
                  onPress={() => {
                    setDayIndex(option.index);
                    update({ scheduledAt: null });
                  }}
                />
              ))}
            </ScrollView>

            {stale ? (
              <Text accessibilityLiveRegion="polite" className="font-sans text-body-md text-danger">
                {t('newDelivery.schedule.outOfRange')}
              </Text>
            ) : null}

            {slots.length === 0 ? (
              <Text accessibilityLiveRegion="polite" className="font-sans text-body-md text-secondary">
                {t('newDelivery.schedule.outOfRange')}
              </Text>
            ) : (
              <View className="flex-row flex-wrap gap-3">
                {slots.map((slot) => (
                  <PressableChip
                    key={slot.iso}
                    label={`${slot.from} – ${slot.to}`}
                    selected={draft.scheduledAt === slot.iso}
                    onPress={() => update({ scheduledAt: slot.iso })}
                  />
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    </WizardScreen>
  );
}
