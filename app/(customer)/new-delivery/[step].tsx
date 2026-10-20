import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';

import { PlaceStep } from '@/features/deliveries/steps/place-step';
import { PackageStep } from '@/features/deliveries/steps/package-step';
import { ReceiverStep } from '@/features/deliveries/steps/receiver-step';
import { ScheduleStep } from '@/features/deliveries/steps/schedule-step';
import { TypeStep } from '@/features/deliveries/steps/type-step';
import { selectDraft, useDraftStore } from '@/features/deliveries/draft-store';
import { firstIncompleteStep, isStepNumber } from '@/features/deliveries/schemas';

// AC-8: a step is reachable only when every earlier step is complete. A deep link
// or a stray tap lands on the first incomplete step instead of an empty form.

export default function DeliveryStepRoute() {
  const params = useLocalSearchParams<{ step?: string }>();
  const router = useRouter();
  const draft = useDraftStore(selectDraft);
  const setResumeStep = useDraftStore((state) => state.setResumeStep);

  const parsed = Number(params.step);
  const step = isStepNumber(parsed) ? parsed : 1;
  const missing = firstIncompleteStep(draft);

  // AC-20: remember where the customer was, so a sign in detour lands them back here.
  useEffect(() => {
    setResumeStep(step);
  }, [step, setResumeStep]);

  if (missing !== null && step > missing) {
    return <Redirect href={`/new-delivery/${missing}`} />;
  }

  const onBack = () => router.back();
  const onContinue = () => router.push(step === 6 ? '/new-delivery/summary' : `/new-delivery/${step + 1}`);

  if (step === 1) return <TypeStep onBack={onBack} onContinue={onContinue} />;
  if (step === 2) return <PlaceStep step={2} onBack={onBack} onContinue={onContinue} />;
  if (step === 3) return <PlaceStep step={3} onBack={onBack} onContinue={onContinue} />;
  if (step === 4) return <ReceiverStep onBack={onBack} onContinue={onContinue} />;
  if (step === 5) return <PackageStep onBack={onBack} onContinue={onContinue} />;
  return <ScheduleStep onBack={onBack} onContinue={onContinue} />;
}
