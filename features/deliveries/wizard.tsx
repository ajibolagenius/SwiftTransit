import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeIn, FadeInLeft, FadeInRight } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { StepperHeader } from '@/components/ui/stepper-header';
import { useReduceMotion } from '@/components/ui/use-reduce-motion';
import { STEP_COUNT, type StepNumber } from './schemas';

// The wizard frame: back row, stepper header, one step's content, and the
// pinned primary action (DESIGN.md: one green button at the bottom of a form).

const BACK_BUTTON_SIZE = 44; // IconButton's own component constant, not a spacing step.

export type StepProps = { onBack: () => void; onContinue: () => void };

export function WizardScreen({
  step,
  title,
  body,
  continueLabel,
  continueDisabled = false,
  onContinue,
  onBack,
  children,
}: {
  step: StepNumber;
  title: string;
  body: string;
  continueLabel: string;
  continueDisabled?: boolean;
  onContinue: () => void;
  onBack: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const reduced = useReduceMotion();
  const previous = useRef(step);
  const forward = step >= previous.current;
  useEffect(() => {
    previous.current = step;
  }, [step]);

  // DESIGN.md motion: wizard steps slide horizontally over ~250 ms; Reduce Motion
  // cross-fades instead. SlideIn* is avoided: on Reanimated 4.5 it leaves this
  // flex-1 container's content ~60 pt too high once the animation settles.
  const entering = reduced
    ? FadeIn.duration(200)
    : forward
      ? FadeInRight.duration(250)
      : FadeInLeft.duration(250);

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-primary">
      <View className="flex-row items-center gap-4 px-7 pb-4 pt-2">
        <IconButton icon={ChevronLeft} accessibilityLabel={t('newDelivery.back')} onPress={onBack} />
        <Text accessibilityRole="header" className="flex-1 text-center font-sans text-h3 text-primary">
          {t('newDelivery.title')}
        </Text>
        <View style={{ width: BACK_BUTTON_SIZE }} accessibilityElementsHidden importantForAccessibility="no">
          <View />
        </View>
      </View>

      <View className="flex-1 px-7">
        <StepperHeader
          progressLabel={t('newDelivery.stepOf', { step, total: STEP_COUNT })}
          title={t(`newDelivery.steps.${step}`)}
          step={step}
          total={STEP_COUNT}
        />
        <Animated.View key={step} entering={entering} className="flex-1">
          <View className="gap-2 pt-9">
            <Text className="font-sans text-subheading-xl text-primary">{title}</Text>
            <Text className="font-sans text-body-md text-secondary">{body}</Text>
          </View>
          <View className="flex-1 pt-7">{children}</View>
        </Animated.View>
      </View>

      <View className="px-7 pb-4 pt-4">
        <Button disabled={continueDisabled} onPress={onContinue}>
          {continueLabel}
        </Button>
      </View>
    </SafeAreaView>
  );
}
