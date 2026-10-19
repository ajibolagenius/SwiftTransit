import { FileText, Package, ShoppingBasket, UtensilsCrossed } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';

import { SelectCard } from '@/components/ui/select-card';
import { useDraftStore, selectDraft } from '../draft-store';
import { orderTypes, type OrderType } from '../schemas';
import { WizardScreen, type StepProps } from '../wizard';

// AC-2: the type is a label for the courier. It changes no price and no rule.

const ICONS: Record<OrderType, LucideIcon> = {
  document: FileText,
  parcel: Package,
  food: UtensilsCrossed,
  groceries: ShoppingBasket,
};

export function TypeStep({ onBack, onContinue }: StepProps) {
  const { t } = useTranslation();
  const draft = useDraftStore(selectDraft);
  const update = useDraftStore((state) => state.update);

  return (
    <WizardScreen
      step={1}
      title={t('newDelivery.type.title')}
      body={t('newDelivery.type.body')}
      continueLabel={t('newDelivery.continue')}
      continueDisabled={!draft.type}
      onContinue={onContinue}
      onBack={onBack}
    >
      <ScrollView contentContainerClassName="gap-4 pb-4">
        {orderTypes.map((type) => (
          <SelectCard
            key={type}
            icon={ICONS[type]}
            title={t(`newDelivery.type.${type}`)}
            subtitle={t(`newDelivery.type.${type}Hint`)}
            selected={draft.type === type}
            onPress={() => update({ type })}
          />
        ))}
      </ScrollView>
    </WizardScreen>
  );
}
