import { ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Chip } from '@/components/ui/chip';
import { formatSlot } from '@/features/deliveries/schedule';
import { formatKobo, formatWeight } from '@/lib/money';

import { cardTitleKey, dayLabels, type OrderRow } from './status-map';

// AC-8: everything on the receipt is a column of the order row, formatted at
// display time only. Money stays integer kobo until `lib/money` renders it.

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start justify-between gap-4 border-b border-default py-4">
      <Text className="font-sans text-label-sm text-tertiary">{label}</Text>
      <Text className="min-w-0 flex-1 text-end font-sans text-body-md text-primary">{value}</Text>
    </View>
  );
}

function PriceLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View className="flex-row items-center justify-between gap-4 py-1">
      <Text
        className={strong ? 'font-sans text-label-md text-primary' : 'font-sans text-body-md text-secondary'}
      >
        {label}
      </Text>
      <Text
        style={{ fontVariant: ['tabular-nums'] }}
        className={
          strong ? 'font-sans text-subheading-md text-primary' : 'font-sans text-body-md text-primary'
        }
      >
        {value}
      </Text>
    </View>
  );
}

export function OrderReceipt({ order }: { order: OrderRow }) {
  const { t } = useTranslation();
  const labels = dayLabels(t);
  const flags = order.handling_flags ?? [];

  return (
    <View className="gap-5">
      <View>
        <Row label={t('orders.detail.typeLabel')} value={t(cardTitleKey(order.type))} />
        <Row label={t('orders.detail.sizeLabel')} value={t(`newDelivery.package.${order.package_size}`)} />
        <Row label={t('orders.detail.weightLabel')} value={formatWeight(order.weight_kg)} />
        <View className="flex-row items-start justify-between gap-4 border-b border-default py-4">
          <Text className="font-sans text-label-sm text-tertiary">{t('orders.detail.handlingLabel')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="max-w-[60%] flex-1">
            <View className="flex-row gap-2">
              {flags.length ? (
                flags.map((flag) => (
                  <Chip key={flag} tone="amber">
                    {t(`newDelivery.package.${flag}`)}
                  </Chip>
                ))
              ) : (
                <Text className="font-sans text-body-md text-secondary">{t('orders.detail.none')}</Text>
              )}
            </View>
          </ScrollView>
        </View>
        <Row label={t('orders.detail.receiverLabel')} value={order.receiver_name} />
        <Row label={t('orders.detail.phoneLabel')} value={order.receiver_phone} />
        <Row
          label={t('orders.detail.notesLabel')}
          value={order.instructions.trim() || t('orders.detail.none')}
        />
        <Row
          label={t('orders.detail.scheduleLabel')}
          value={order.scheduled_at ? formatSlot(order.scheduled_at, labels) : t('summary.asap')}
        />
        <Row label={t('orders.detail.pickupLabel')} value={order.pickup_line} />
        <Row label={t('orders.detail.dropoffLabel')} value={order.dropoff_line} />
      </View>

      <View className="gap-2 rounded-xl border border-default bg-secondary p-5">
        <Text className="font-sans text-label-md text-secondary">{t('summary.priceTitle')}</Text>
        <View className="gap-1 border-t border-dashed border-default pt-2">
          <PriceLine label={t('orders.detail.base')} value={formatKobo(order.base_kobo)} />
          <PriceLine label={t('orders.detail.distance')} value={formatKobo(order.distance_kobo)} />
          <PriceLine label={t('orders.detail.handlingFee')} value={formatKobo(order.handling_kobo)} />
          <PriceLine label={t('orders.detail.total')} value={formatKobo(order.total_kobo)} strong />
        </View>
      </View>
    </View>
  );
}
