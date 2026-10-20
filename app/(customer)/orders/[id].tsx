import { useLocalSearchParams, useRouter } from 'expo-router';
import { XCircle } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip } from '@/components/ui/chip';
import { IconButton } from '@/components/ui/icon-button';
import { Sheet } from '@/components/ui/sheet';
import { StatusTimeline, type TimelineEntry, type TimelineTerminal } from '@/components/ui/status-timeline';
import { CourierCard } from '@/features/orders/courier-card';
import { useOrderFreshness } from '@/features/orders/freshness';
import { CancelConfirm, useCancelConfirm } from '@/features/orders/order-actions';
import { useOrderCourier, useOrderDetail, useOrderEvents, useSessionUserId } from '@/features/orders/queries';
import { OrderReceipt } from '@/features/orders/receipt';
import { RouteMap } from '@/features/orders/route-map';
import {
  buildTimeline,
  cardTitleKey,
  dayLabels,
  displayTrackingCode,
  formatMoment,
  isCancelAllowed,
  statusLabelKey,
  statusTone,
} from '@/features/orders/status-map';
import { useThemeColors } from '@/theme/use-theme';

// Spec 0006 AC-4 to AC-9: the detail renders from a fresh select by id, never
// from data handed through navigation, and every figure comes from that row.

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-4 px-7 pt-9">
      <Text accessibilityRole="header" className="font-sans text-label-md text-secondary">
        {title}
      </Text>
      {children}
    </View>
  );
}

function AddressBlock({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-1">
      <Text className="font-sans text-label-sm text-tertiary">{label}</Text>
      <Text className="font-sans text-body-md text-primary">{value}</Text>
    </View>
  );
}

export default function OrderDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const labels = dayLabels(t);
  const userId = useSessionUserId();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [confirming, setConfirming] = useState(false);

  const detail = useOrderDetail(id);
  const events = useOrderEvents(id);
  const order = detail.data ?? null;
  const courier = useOrderCourier(order);
  const cancel = useCancelConfirm(order?.id);

  // AC-11: a realtime row change refreshes this screen, its events and the list.
  useOrderFreshness(userId, id);

  const header = (
    <View className="flex-row items-center gap-4 px-7 pb-2 pt-2">
      <IconButton
        accessibilityLabel={t('orders.detail.back')}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/orders'))}
      />
      <Text accessibilityRole="header" numberOfLines={1} className="flex-1 font-sans text-h4 text-primary">
        {t('orders.detail.title')}
      </Text>
    </View>
  );

  // A failed background refetch keeps the loaded order on screen; only a read
  // that never produced data shows the error state.
  if (detail.isError && !detail.data) {
    return (
      <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-primary">
        {header}
        <View className="flex-1 items-center justify-center gap-4 px-9">
          <Text className="text-center font-sans text-body-md text-secondary">{t('orders.loadFailed')}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void detail.refetch()}
            className="rounded-xl bg-interactive-primary px-9 py-4 active:opacity-90"
          >
            <Text className="font-sans text-label-md text-on-brand">{t('orders.retry')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (detail.isPending) {
    return (
      <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-primary">
        {header}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator accessibilityRole="progressbar" color={colors.text.brand} />
        </View>
      </SafeAreaView>
    );
  }

  // AC-14: someone else's id and a missing id render the same state. The app
  // never says whether the order exists.
  if (!order) {
    return (
      <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-primary">
        {header}
        <View className="flex-1 items-center justify-center gap-3 px-9">
          <Text className="text-center font-sans text-subheading-md text-primary">
            {t('orders.detail.notFoundTitle')}
          </Text>
          <Text className="text-center font-sans text-body-md text-secondary">
            {t('orders.detail.notFoundBody')}
          </Text>
          <Pressable
            accessibilityRole="link"
            onPress={() => (router.canGoBack() ? router.dismissTo('/orders') : router.replace('/orders'))}
            hitSlop={8}
            className="py-3"
          >
            <Text className="underline font-sans text-label-md text-link">{t('orders.detail.goBack')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const eventRows = events.data ?? [];
  const timeline = buildTimeline(order, eventRows);
  const reachedIndex = timeline.steps.reduce((best, step, index) => (step.reached ? index : best), -1);
  const settled = order.status === 'delivered' || timeline.terminal !== null;

  const entries: TimelineEntry[] = timeline.steps.map((step, index) => ({
    label: t(`orders.timeline.${step.key}`),
    timestamp: step.timestamp ? formatMoment(step.timestamp, labels) : null,
    state: !step.reached ? 'upcoming' : index === reachedIndex && !settled ? 'current' : 'done',
  }));

  const terminalEvent = timeline.terminal
    ? [...eventRows].reverse().find((event) => event.status === timeline.terminal)
    : undefined;
  const terminal: TimelineTerminal | null = timeline.terminal
    ? {
        kind: timeline.terminal,
        label: timeline.expired ? t('orders.timeline.expired') : t(`orders.timeline.${timeline.terminal}`),
        timestamp: terminalEvent ? formatMoment(terminalEvent.created_at, labels) : null,
      }
    : null;

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-primary">
      {header}
      <ScrollView contentContainerClassName="pb-8">
        <View className="gap-3 px-7 pt-2">
          <Text className="font-sans text-label-sm text-tertiary">{t('orders.trackingLabel')}</Text>
          <View className="flex-row items-center gap-3">
            <Text className="flex-1 font-sans text-h3 text-primary">
              {displayTrackingCode(order.tracking_code)}
            </Text>
            <Chip tone={statusTone(order.status)}>{t(statusLabelKey(order.status))}</Chip>
          </View>
          <Text className="font-sans text-body-md text-secondary">{t(cardTitleKey(order.type))}</Text>
        </View>

        <Section title={t('orders.detail.progressTitle')}>
          <StatusTimeline entries={entries} terminal={terminal} />
        </Section>

        <Section title={t('orders.detail.routeTitle')}>
          <RouteMap
            accessibilityLabel={t('orders.detail.routeMap')}
            pickup={{ lat: order.pickup_lat, lng: order.pickup_lng }}
            dropoff={{ lat: order.dropoff_lat, lng: order.dropoff_lng }}
          />
          <View className="gap-4">
            <AddressBlock label={t('orders.detail.pickupLabel')} value={order.pickup_line} />
            <AddressBlock label={t('orders.detail.dropoffLabel')} value={order.dropoff_line} />
          </View>
        </Section>

        {courier.data ? (
          <Section title={t('orders.detail.courierTitle')}>
            <CourierCard orderId={order.id} courier={courier.data} />
          </Section>
        ) : null}

        <Section title={t('orders.detail.receiptTitle')}>
          <OrderReceipt order={order} />
        </Section>

        {isCancelAllowed(order.status) ? (
          <View className="px-7 pt-9">
            <Pressable
              accessibilityRole="button"
              onPress={() => setConfirming(true)}
              className="flex-row items-center justify-center rounded-xl border border-default py-4 active:opacity-70"
            >
              <Text className="font-sans text-label-md text-danger">{t('orders.detail.cancelDelivery')}</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <Sheet
        open={confirming}
        onDismiss={() => setConfirming(false)}
        title={t('orders.cancelTitle')}
        dismissLabel={t('orders.sheetDismiss')}
        icon={XCircle}
      >
        <CancelConfirm
          order={order}
          pending={cancel.pending}
          error={cancel.failed}
          onCancel={() => cancel.run(() => setConfirming(false))}
          onDismiss={() => setConfirming(false)}
        />
      </Sheet>
    </SafeAreaView>
  );
}
