import * as Clipboard from 'expo-clipboard';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, Circle, CircleCheck, Copy } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { IconTile } from '@/components/ui/icon-tile';
import { saveAddress } from '@/features/deliveries/addresses';
import { selectDraft, useDraftStore } from '@/features/deliveries/draft-store';
import { errorLabel } from '@/lib/error-label';
import { formatKobo } from '@/lib/money';
import type { Database } from '@/lib/supabase/types';
import { useThemeColors } from '@/theme/use-theme';

// AC-15, AC-16: the tracking code the order row came back with, the status that
// row holds, and an optional copy of the two places into `addresses`.

// Every status the server can hand back, translated. An unmapped value (a status
// added on the server after this build) falls to `booked.status`, never the raw
// enum word.
const STATUS_KEYS = {
  pending_payment: 'booked.statusPendingPayment',
  searching: 'booked.status',
  assigned: 'booked.statusAssigned',
  at_pickup: 'booked.statusAtPickup',
  picked_up: 'booked.statusPickedUp',
  at_dropoff: 'booked.statusAtDropoff',
  delivered: 'booked.statusDelivered',
  cancelled: 'booked.statusCancelled',
  failed: 'booked.statusFailed',
} as const satisfies Record<Database['public']['Enums']['order_status'], string>;

type StatusKey = (typeof STATUS_KEYS)[keyof typeof STATUS_KEYS];

function statusKeyFor(status: string | undefined): StatusKey {
  return (status ? STATUS_KEYS[status as keyof typeof STATUS_KEYS] : undefined) ?? 'booked.status';
}

function ToggleRow({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
  const colors = useThemeColors();
  const Icon = value ? CircleCheck : Circle;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={onToggle}
      hitSlop={4}
      className="flex-row items-center gap-3 py-3"
    >
      <Icon size={20} strokeWidth={1.5} color={value ? colors.text.brand : colors.text.tertiary} />
      <Text className="flex-1 font-sans text-body-md text-primary">{label}</Text>
    </Pressable>
  );
}

export default function BookedScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const colors = useThemeColors();
  const draft = useDraftStore(selectDraft);
  const update = useDraftStore((state) => state.update);
  const clear = useDraftStore((state) => state.clear);
  const params = useLocalSearchParams<{
    orderId?: string;
    trackingCode?: string;
    status?: string;
    totalKobo?: string;
    method?: string;
  }>();

  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const trackingCode = params.trackingCode ?? '';
  const totalKobo = Number(params.totalKobo ?? 0);
  // The status line is the row's own status after `pay_order`, never an assumption,
  // and it is always read through a translation.
  const statusLabel = t(statusKeyFor(params.status));
  const methodLabel = params.method === 'wallet' ? t('booked.methodWallet') : t('booked.methodCard');

  const copyCode = async () => {
    await Clipboard.setStringAsync(trackingCode);
    setCopied(true);
  };

  const saveChosen = async () => {
    const { pickup, dropoff } = draft;
    if (!pickup || !dropoff) return;
    setSaving(true);
    setSaveError(null);
    try {
      let written = 0;
      if (draft.savePickup) {
        await saveAddress({ label: pickup.line.split(',')[0], place: pickup });
        written += 1;
      }
      if (draft.saveDropoff) {
        await saveAddress({ label: dropoff.line.split(',')[0], place: dropoff });
        written += 1;
      }
      setSaved(written > 0);
      await queryClient.invalidateQueries({ queryKey: ['addresses'] });
    } catch (error) {
      const code = error instanceof Error ? error.message : null;
      setSaveError(errorLabel(t, code));
    } finally {
      setSaving(false);
    }
  };

  const sendAnother = () => {
    clear();
    router.dismissTo('/(customer)/(tabs)');
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-primary">
      <ScrollView contentContainerClassName="px-7 pb-8" className="flex-1">
        <Animated.View entering={FadeIn.duration(200)} className="items-center gap-6 pt-9">
          <IconTile icon={Check} size={64} />
          <View className="items-center gap-2">
            <Text accessibilityRole="header" className="text-center font-sans text-h2 text-primary">
              {t('booked.title')}
            </Text>
            <Text className="text-center font-sans text-body-md text-secondary">{statusLabel}</Text>
          </View>
        </Animated.View>

        <View className="gap-5 rounded-2xl border border-default bg-secondary p-6 pt-9">
          <View className="gap-1">
            <Text className="font-sans text-label-sm text-tertiary">{t('booked.trackingLabel')}</Text>
            <View className="flex-row items-center gap-3">
              <Text accessibilityRole="text" className="flex-1 font-sans text-h3 text-primary">
                {trackingCode}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('booked.copy')}
                onPress={() => void copyCode()}
                hitSlop={8}
                className="flex-row items-center gap-2 rounded-full border border-default bg-primary px-4 py-2 active:opacity-70"
              >
                {copied ? (
                  <Check size={16} strokeWidth={1.5} color={colors.text.brand} />
                ) : (
                  <Copy size={16} strokeWidth={1.5} color={colors.text.secondary} />
                )}
                <Text className="font-sans text-label-sm text-secondary">
                  {copied ? t('booked.copied') : t('booked.copy')}
                </Text>
              </Pressable>
            </View>
          </View>

          <Text className="font-sans text-body-md text-secondary">
            {t('booked.paid', { amount: formatKobo(totalKobo), method: methodLabel })}
          </Text>
        </View>

        <View className="gap-3 pt-9">
          <Text className="font-sans text-label-md text-secondary">{t('booked.saveAddresses')}</Text>
          <Text className="font-sans text-body-sm text-tertiary">{t('booked.saveHint')}</Text>
          <ToggleRow
            label={draft.pickup?.line ?? t('summary.pickupLabel')}
            value={draft.savePickup}
            onToggle={() => update({ savePickup: !draft.savePickup })}
          />
          <ToggleRow
            label={draft.dropoff?.line ?? t('summary.dropoffLabel')}
            value={draft.saveDropoff}
            onToggle={() => update({ saveDropoff: !draft.saveDropoff })}
          />
          {saved ? (
            <Text accessibilityLiveRegion="polite" className="font-sans text-body-md text-brand">
              {t('booked.saved')}
            </Text>
          ) : (
            <Button
              variant="secondary"
              loading={saving}
              disabled={!draft.savePickup && !draft.saveDropoff}
              onPress={() => void saveChosen()}
            >
              {t('booked.saveAddresses')}
            </Button>
          )}
          {saveError ? (
            <Text accessibilityLiveRegion="polite" className="font-sans text-body-sm text-danger">
              {saveError}
            </Text>
          ) : null}
        </View>

        <View className="gap-4 pt-9">
          {/* Feature 7 builds the order detail; the row is visible and unavailable now (AC-17 pattern). */}
          <Button disabled onPress={() => undefined}>
            {t('booked.viewOrder')}
          </Button>
          <Text className="text-center font-sans text-body-sm text-tertiary">
            {t('booked.viewOrderHint')}
          </Text>
          <Button variant="link" onPress={sendAnother}>
            {t('booked.sendAnother')}
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
