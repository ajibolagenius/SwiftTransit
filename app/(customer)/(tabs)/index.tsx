import { useRouter } from 'expo-router';
import { ClipboardList, Package } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Chip } from '@/components/ui/chip';
import { OrderCard } from '@/components/ui/order-card';
import { SelectCard } from '@/components/ui/select-card';
import { selectDraft, useDraftStore } from '@/features/deliveries/draft-store';
import { firstIncompleteStep } from '@/features/deliveries/schemas';
import { useOrderFreshness } from '@/features/orders/freshness';
import { useOrdersQuery, useSessionUserId } from '@/features/orders/queries';
import {
  cardTitleKey,
  dayLabels,
  displayTrackingCode,
  etaValueFor,
  iconForType,
  statusLabelKey,
  statusTone,
} from '@/features/orders/status-map';

// AC-1: a second door into the wizard. AC-20: a draft left by a sign in detour
// is picked up by that same door, on the step the customer was on.
// Spec 0006 AC-12: the three most recent active orders, hidden when there are none.

const HOME_ACTIVE_COUNT = 3;

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const labels = dayLabels(t);
  const draft = useDraftStore(selectDraft);
  const resumeStep = useDraftStore((state) => state.resumeStep);
  const userId = useSessionUserId();

  const active = useOrdersQuery('active');
  useOrderFreshness(userId);

  const rows = useMemo(
    () => (active.data?.pages ?? []).flatMap((page) => page.rows).slice(0, HOME_ACTIVE_COUNT),
    [active.data],
  );

  // An empty draft resolves to step 1, so one line covers a fresh booking and
  // a resumed one. A complete draft waits on the last step, not the summary.
  const target = resumeStep ?? firstIncompleteStep(draft) ?? 6;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-primary">
      <ScrollView contentContainerClassName="gap-7 px-7 pb-8 pt-6" className="flex-1">
        <View className="gap-1">
          <Text accessibilityRole="header" className="font-sans text-h2 text-primary">
            {t('app.name')}
          </Text>
          <Text className="font-sans text-body-md text-secondary">{t('home.subtitle')}</Text>
        </View>

        <View className="gap-4">
          <SelectCard
            icon={Package}
            title={t('home.sendTitle')}
            subtitle={t('home.sendSubtitle')}
            onPress={() => router.push(`/new-delivery/${target}`)}
          />
          <SelectCard
            icon={ClipboardList}
            title={t('home.trackTitle')}
            subtitle={t('home.trackSubtitle')}
            onPress={() => router.push('/orders')}
          />
        </View>

        {rows.length > 0 ? (
          <View className="gap-4">
            <View className="flex-row items-center justify-between gap-4">
              <Text accessibilityRole="header" className="font-sans text-label-md text-secondary">
                {t('home.activeTitle')}
              </Text>
              <Pressable
                accessibilityRole="link"
                onPress={() => router.push('/orders')}
                hitSlop={8}
                className="py-1"
              >
                <Text className="underline font-sans text-label-md text-link">{t('home.viewAll')}</Text>
              </Pressable>
            </View>
            {rows.map((item) => {
              const eta = etaValueFor(item, labels);
              return (
                <View key={item.id} className="gap-3">
                  <OrderCard
                    icon={iconForType(item.type)}
                    title={t(cardTitleKey(item.type))}
                    trackingId={displayTrackingCode(item.tracking_code)}
                    trackingLabel={t('orders.trackingLabel')}
                    etaLabel={eta ? t('orders.etaLabel') : t('orders.statusLabel')}
                    etaValue={eta || t(statusLabelKey(item.status))}
                    onPress={() => router.push(`/orders/${item.id}`)}
                  />
                  <View className="px-1">
                    <Chip tone={statusTone(item.status)}>{t(statusLabelKey(item.status))}</Chip>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        {draft.type ? (
          <Text className="font-sans text-body-sm text-tertiary">
            {t('home.draftNote', { type: t(`newDelivery.type.${draft.type}`) })}
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
