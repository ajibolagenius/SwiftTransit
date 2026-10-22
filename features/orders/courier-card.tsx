import { useRouter } from 'expo-router';
import { MessageCircle, Phone } from 'lucide-react-native';
import { Linking, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/ui/icon-button';
import type { CourierInfo } from './queries';

// AC-7: the courier card. Name and phone come from `profiles`, the vehicle from
// the `courier_vehicle` function. Call appears only when the profile carries a
// phone number (that column is nullable). Chat is feature 11's placeholder
// route today.

export function CourierCard({ orderId, courier }: { orderId: string; courier: CourierInfo }) {
  const { t } = useTranslation();
  const router = useRouter();
  const name = `${courier.firstName} ${courier.lastName}`.trim();
  const vehicle =
    courier.vehicleType && courier.vehicleNumber
      ? t('orders.detail.vehicle', {
          type: t(`orders.vehicle.${courier.vehicleType}`),
          number: courier.vehicleNumber,
        })
      : null;

  return (
    <View className="gap-4 rounded-2xl border border-default bg-secondary p-6">
      <View className="flex-row items-center gap-4">
        <View className="min-w-0 flex-1 gap-1">
          {name ? (
            <Text numberOfLines={1} className="font-sans text-subheading-md text-primary">
              {name}
            </Text>
          ) : null}
          {vehicle ? (
            <Text numberOfLines={1} className="font-sans text-body-md text-secondary">
              {vehicle}
            </Text>
          ) : null}
        </View>
        {courier.phone ? (
          <IconButton
            icon={Phone}
            accessibilityLabel={t('orders.detail.call')}
            onPress={() => void Linking.openURL(`tel:${courier.phone}`)}
          />
        ) : null}
        <IconButton
          icon={MessageCircle}
          accessibilityLabel={t('orders.detail.chat')}
          onPress={() => router.push(`/chat/${orderId}`)}
        />
      </View>
    </View>
  );
}
