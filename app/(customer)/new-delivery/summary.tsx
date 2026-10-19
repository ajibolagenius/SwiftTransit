import { Redirect, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import type { TFunction } from 'i18next';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { useAuth } from '@/features/auth/auth-provider';
import { BookingError, useBookingMutation, useWalletBalance } from '@/features/deliveries/booking';
import { selectDraft, useDraftStore } from '@/features/deliveries/draft-store';
import { useQuote } from '@/features/deliveries/pricing';
import { formatSlot } from '@/features/deliveries/schedule';
import { firstIncompleteStep, type DeliveryDraft } from '@/features/deliveries/schemas';
import { errorLabel } from '@/lib/error-label';
import { cvvValid, expiryValid, luhnValid } from '@/lib/payments/mock-payment-provider';
import type { CardDetails, PayMethod } from '@/lib/payments/payment-provider';
import { formatKilometres, formatKobo, formatWeight } from '@/lib/money';

// AC-9, AC-12: every figure here comes from one `quote_price` call or from
// `wallet_balance`. The app adds nothing up and changes nothing about a price.

function dayLabels(t: TFunction) {
  return { today: t('newDelivery.schedule.dayToday'), tomorrow: t('newDelivery.schedule.dayTomorrow') };
}

function SummaryRow({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('summary.editAria', { field: label })}
      onPress={onPress}
      className="flex-row items-start justify-between gap-4 border-b border-default py-4 active:opacity-70"
    >
      <View className="min-w-0 flex-1 gap-1">
        <Text className="font-sans text-label-sm text-tertiary">{label}</Text>
        <Text className="font-sans text-body-md text-primary">{value}</Text>
      </View>
      <Text className="font-sans text-label-md text-link">{t('summary.edit')}</Text>
    </Pressable>
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
        className={
          strong ? 'font-sans text-subheading-md text-primary' : 'font-sans text-body-md text-primary'
        }
      >
        {value}
      </Text>
    </View>
  );
}

/** Digits only, with the slash added after the month, so `0429` reads `04/29`. */
function formatExpiryInput(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 4);
  return digits.length <= 2 ? digits : `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export default function SummaryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const draft = useDraftStore(selectDraft);
  const booking = useBookingMutation();
  const { offline } = useAuth();

  const [method, setMethod] = useState<PayMethod>('card');
  const [card, setCard] = useState<CardDetails>({ number: '', expiry: '', cvv: '' });
  const [showCardErrors, setShowCardErrors] = useState(false);

  // AC-8: an incomplete draft never reaches a price. It reaches the empty step.
  const missing = firstIncompleteStep(draft);

  const quoteInput =
    missing === null && draft.pickup && draft.dropoff && draft.packageSize
      ? { pickup: draft.pickup, dropoff: draft.dropoff, size: draft.packageSize, flags: draft.handlingFlags }
      : null;
  const quote = useQuote(quoteInput);
  const balance = useWalletBalance();

  if (missing !== null) {
    return <Redirect href={`/new-delivery/${missing}`} />;
  }
  const filled = draft as DeliveryDraft;

  const total = quote.data?.total_kobo ?? null;
  const balanceKobo = balance.data ?? null;
  const shortWallet = method === 'wallet' && total !== null && balanceKobo !== null && balanceKobo < total;
  const cardProblems = {
    number: !luhnValid(card.number),
    expiry: !expiryValid(card.expiry),
    cvv: !cvvValid(card.cvv),
  };
  const cardReady = !cardProblems.number && !cardProblems.expiry && !cardProblems.cvv;
  // An invalid card does not grey out Pay. The customer presses it, sees which
  // field is wrong, and fixes it (see `pay`).
  const canPay = !offline && total !== null && !quote.isError && !shortWallet && !booking.isPending;
  const errorKey = booking.error instanceof BookingError ? booking.error.key : null;

  const pay = () => {
    if (method === 'card' && !cardReady) {
      setShowCardErrors(true);
      return;
    }
    booking.mutate(
      { draft: filled, method, card: method === 'card' ? card : undefined },
      {
        onSuccess: ({ order, method: paidWith }) => {
          router.push({
            pathname: '/new-delivery/booked',
            params: {
              orderId: order.id,
              trackingCode: order.tracking_code,
              status: order.status,
              totalKobo: String(order.total_kobo),
              method: paidWith,
            },
          });
        },
      },
    );
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-primary">
      <View className="flex-row items-center gap-4 px-7 pb-4 pt-2">
        <IconButton
          icon={ChevronLeft}
          accessibilityLabel={t('newDelivery.back')}
          onPress={() => router.back()}
        />
        <Text accessibilityRole="header" className="flex-1 font-sans text-h3 text-primary">
          {t('summary.title')}
        </Text>
      </View>

      <ScrollView contentContainerClassName="pb-8" className="flex-1 px-7">
        <Text className="pb-4 font-sans text-body-md text-secondary">{t('summary.subtitle')}</Text>

        <View className="pb-4">
          <SummaryRow
            label={t('summary.pickupLabel')}
            value={filled.pickup.line}
            onPress={() => router.push('/new-delivery/2')}
          />
          <SummaryRow
            label={t('summary.dropoffLabel')}
            value={filled.dropoff.line}
            onPress={() => router.push('/new-delivery/3')}
          />
          <SummaryRow
            label={t('summary.receiverLabel')}
            value={`${filled.receiverName}, ${filled.receiverPhone}`}
            onPress={() => router.push('/new-delivery/4')}
          />
          <SummaryRow
            label={t('summary.packageLabel')}
            value={[
              t(`newDelivery.package.${filled.packageSize}`),
              formatWeight(filled.weightKg),
              ...filled.handlingFlags.map((flag) => t(`newDelivery.package.${flag}`)),
            ].join(' · ')}
            onPress={() => router.push('/new-delivery/5')}
          />
          <SummaryRow
            label={t('summary.scheduleLabel')}
            value={filled.scheduledAt ? formatSlot(filled.scheduledAt, dayLabels(t)) : t('summary.asap')}
            onPress={() => router.push('/new-delivery/6')}
          />
        </View>

        <View className="gap-2 rounded-xl border border-default bg-secondary p-5">
          <Text className="font-sans text-label-md text-secondary">{t('summary.priceTitle')}</Text>
          {quote.isError ? (
            <View className="gap-4 py-2">
              <Text accessibilityLiveRegion="polite" className="font-sans text-body-md text-danger">
                {t('summary.priceFailed')}
              </Text>
              <Button variant="secondary" onPress={() => void quote.refetch()}>
                {t('newDelivery.retry')}
              </Button>
            </View>
          ) : !quote.data ? (
            <Text className="py-4 font-sans text-body-md text-tertiary">{t('summary.priceLoading')}</Text>
          ) : (
            <View className="gap-1">
              <PriceLine label={t('summary.base')} value={formatKobo(quote.data.base_kobo)} />
              <PriceLine
                label={`${t('summary.distance')} · ${formatKilometres(quote.data.route_km)}`}
                value={formatKobo(quote.data.distance_kobo)}
              />
              <PriceLine label={t('summary.handling')} value={formatKobo(quote.data.handling_kobo)} />
              <PriceLine label={t('summary.total')} value={formatKobo(quote.data.total_kobo)} strong />
            </View>
          )}
        </View>

        <View className="gap-4 py-6">
          <Text className="font-sans text-label-md text-secondary">{t('summary.payMethodLabel')}</Text>
          <Segmented
            label={t('summary.payMethodLabel')}
            options={[
              { value: 'card', label: t('summary.methodCard') },
              { value: 'wallet', label: t('summary.methodWallet') },
            ]}
            value={method}
            onChange={setMethod}
          />

          {method === 'wallet' ? (
            <View className="gap-2">
              <PriceLine
                label={t('summary.walletBalance')}
                value={balanceKobo === null ? t('summary.priceLoading') : formatKobo(balanceKobo)}
              />
              {shortWallet ? (
                <Text accessibilityLiveRegion="polite" className="font-sans text-body-md text-danger">
                  {t('summary.insufficient')}
                </Text>
              ) : null}
            </View>
          ) : (
            <View className="gap-4">
              <Text className="font-sans text-body-sm text-tertiary">{t('summary.cardHint')}</Text>
              <Input
                label={t('summary.cardNumberLabel')}
                placeholder={t('summary.cardNumberPlaceholder')}
                value={card.number}
                onChangeText={(value) => setCard((current) => ({ ...current, number: value }))}
                keyboardType="number-pad"
                autoComplete="cc-number"
                textContentType="creditCardNumber"
                maxLength={19}
                error={showCardErrors && cardProblems.number ? t('summary.cardNumberInvalid') : undefined}
              />
              <View className="flex-row gap-4">
                <Input
                  className="flex-1"
                  label={t('summary.cardExpiryLabel')}
                  placeholder={t('summary.cardExpiryPlaceholder')}
                  value={card.expiry}
                  onChangeText={(value) =>
                    setCard((current) => ({ ...current, expiry: formatExpiryInput(value) }))
                  }
                  keyboardType="number-pad"
                  autoComplete="cc-exp"
                  maxLength={5}
                  error={showCardErrors && cardProblems.expiry ? t('summary.cardExpiryInvalid') : undefined}
                />
                <Input
                  className="flex-1"
                  label={t('summary.cardCvvLabel')}
                  placeholder={t('summary.cardCvvPlaceholder')}
                  value={card.cvv}
                  onChangeText={(value) => setCard((current) => ({ ...current, cvv: value }))}
                  keyboardType="number-pad"
                  autoComplete="cc-csc"
                  maxLength={4}
                  error={showCardErrors && cardProblems.cvv ? t('summary.cardCvvInvalid') : undefined}
                />
              </View>
            </View>
          )}
        </View>

        {offline ? (
          <Text accessibilityLiveRegion="polite" className="pb-3 font-sans text-body-md text-danger">
            {t('summary.offline')}
          </Text>
        ) : null}
        {errorKey ? (
          <Text accessibilityLiveRegion="polite" className="pb-3 font-sans text-body-md text-danger">
            {errorLabel(t, errorKey)}
          </Text>
        ) : null}

        <Button disabled={!canPay} loading={booking.isPending} onPress={pay}>
          {booking.isPending
            ? t('summary.booking')
            : t('summary.pay', { amount: total === null ? '' : formatKobo(total) })}
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
