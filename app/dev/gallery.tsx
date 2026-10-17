import {
  Bell,
  Bike,
  Clock,
  GlassWater,
  House,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Send,
  Truck,
  User,
  Wallet,
  ClipboardList,
  X,
} from 'lucide-react-native';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { BalanceCard } from '@/components/ui/balance-card';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { OrderCard } from '@/components/ui/order-card';
import { OtpInput } from '@/components/ui/otp-input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Segmented } from '@/components/ui/segmented';
import { SelectCard } from '@/components/ui/select-card';
import { Sheet } from '@/components/ui/sheet';
import { StepperHeader } from '@/components/ui/stepper-header';
import { TabBar } from '@/components/ui/tab-bar';

// Dev-only design system gallery (scope feature 4). Reached from the onboarding placeholder in dev builds.
export default function Screen() {
  const { t } = useTranslation();
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [name, setName] = useState('Adebayo Okafor');
  const [phone, setPhone] = useState('8021234567');
  const [otp, setOtp] = useState('204');
  const [filter, setFilter] = useState<'all' | 'active' | 'past'>('all');
  const [vehicle, setVehicle] = useState<'bike' | 'van'>('bike');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('index');

  // Money is integer kobo; format only at display, en-NG / NGN (AGENTS.md).
  const balance = useMemo(
    () => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(4305000 / 100),
    [],
  );

  if (!__DEV__) return null;

  return (
    <SafeAreaView className="flex-1 bg-primary">
      {/* DESIGN.md navigation: custom header row, 44 px back button with a centred title. */}
      <View className="flex-row items-center px-7 py-3">
        <IconButton icon={House} accessibilityLabel={t('gallery.back')} onPress={() => router.back()} />
        <Text
          accessibilityRole="header"
          className="absolute inset-x-0 text-center font-sans text-h4 text-primary"
        >
          {t('screens.gallery')}
        </Text>
        <View className="w-11" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-8 px-7 pt-3"
        contentContainerStyle={{ paddingBottom: 160 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-2 rounded-2xl bg-secondary p-7">
          <Text accessibilityRole="header" className="font-sans text-subheading-lg text-primary">
            {t('gallery.introTitle')}
          </Text>
          <Text className="font-sans text-body-md text-secondary">{t('gallery.intro')}</Text>
          <Text className="font-sans text-body-sm text-tertiary">{t('gallery.introHint')}</Text>
        </View>

        <Section label={t('gallery.buttons')}>
          <Button loading={loadingDemo} onPress={() => setLoadingDemo((v) => !v)}>
            {t('gallery.primary')}
          </Button>
          <Button variant="secondary">{t('gallery.secondary')}</Button>
          <Button disabled>{t('gallery.disabled')}</Button>
          <Button variant="link" underline className="self-center">
            {t('gallery.link')}
          </Button>
        </Section>

        <Section label={t('gallery.iconButtons')}>
          <View className="flex-row gap-5">
            <IconButton accessibilityLabel={t('gallery.ariaBack')} />
            <IconButton icon={Bell} accessibilityLabel={t('gallery.ariaNotifications')} />
            <IconButton icon={Phone} accessibilityLabel={t('gallery.ariaCall')} />
            <IconButton icon={MessageCircle} accessibilityLabel={t('gallery.ariaChat')} />
          </View>
        </Section>

        <Section label={t('gallery.inputs')}>
          <Input label={t('gallery.nameLabel')} value={name} onChangeText={setName} icon={User} />
          <Input
            label={t('gallery.noteLabel')}
            placeholder={t('gallery.notePlaceholder')}
            helper={t('gallery.noteHelper')}
          />
          <Input
            label={t('gallery.phoneLabel')}
            value="+234 802 123"
            error={t('gallery.phoneError')}
            editable={false}
          />
          <PhoneInput
            label={t('gallery.phoneLabel')}
            value={phone}
            onChangeText={setPhone}
            placeholder={t('gallery.phonePlaceholder')}
            countryLabel={t('gallery.phoneCountry')}
          />
          <OtpInput
            label={t('gallery.otpLabel')}
            value={otp}
            onChange={setOtp}
            error={otp.length === 6 ? t('gallery.otpError') : undefined}
          />
        </Section>

        <Section label={t('gallery.selection')}>
          <View className="flex-row gap-4">
            <SelectCard
              className="flex-1"
              icon={Bike}
              title={t('gallery.bikeTitle')}
              subtitle={t('gallery.bikeSubtitle')}
              selected={vehicle === 'bike'}
              onPress={() => setVehicle('bike')}
            />
            <SelectCard
              className="flex-1"
              icon={Truck}
              title={t('gallery.vanTitle')}
              subtitle={t('gallery.vanSubtitle')}
              selected={vehicle === 'van'}
              onPress={() => setVehicle('van')}
            />
          </View>
          <Segmented
            label={t('screens.orders')}
            options={[
              { value: 'all', label: t('gallery.segmentAll') },
              { value: 'active', label: t('gallery.segmentActive') },
              { value: 'past', label: t('gallery.segmentPast') },
            ]}
            value={filter}
            onChange={setFilter}
          />
        </Section>

        <Section label={t('gallery.chips')}>
          <View className="flex-row flex-wrap gap-3">
            <Chip icon={MapPin}>{t('gallery.chipDistance')}</Chip>
            <Chip icon={GlassWater} tone="amber">
              {t('gallery.chipFragile')}
            </Chip>
            <Chip icon={Package} tone="neutral">
              {t('gallery.chipSize')}
            </Chip>
            <Chip icon={Clock}>{t('gallery.chipTime')}</Chip>
          </View>
        </Section>

        <Section label={t('gallery.stepper')}>
          <StepperHeader
            progressLabel={t('gallery.stepperProgress')}
            title={t('gallery.stepperTitle')}
            step={2}
            total={6}
          />
        </Section>

        <Section label={t('gallery.cards')}>
          <OrderCard
            title={t('gallery.orderTitle')}
            trackingId={t('gallery.orderTrackingValue')}
            trackingLabel={t('gallery.orderTrackingLabel')}
            etaLabel={t('gallery.orderEtaLabel')}
            etaValue={t('gallery.orderEtaValue')}
            overflowLabel={t('gallery.orderOverflow')}
            onOverflowPress={() => setSheetOpen(true)}
          />
          <BalanceCard
            label={t('gallery.balanceLabel')}
            amount={balance}
            actionLabel={t('gallery.balanceAction')}
            onActionPress={() => setSheetOpen(true)}
          />
        </Section>

        <Section label={t('gallery.sheet')}>
          <Button onPress={() => setSheetOpen(true)}>{t('gallery.sheetTrigger')}</Button>
        </Section>
      </ScrollView>

      <View className="absolute inset-x-0 bottom-0">
        <TabBar
          items={[
            { key: 'index', label: t('gallery.tabHome'), icon: House },
            { key: 'orders', label: t('gallery.tabOrders'), icon: ClipboardList },
            { key: 'wallet', label: t('gallery.tabWallet'), icon: Wallet },
            { key: 'profile', label: t('gallery.tabProfile'), icon: User },
          ]}
          activeKey={activeTab}
          onSelect={setActiveTab}
          fab={{ label: t('gallery.tabFab'), onPress: () => setSheetOpen(true) }}
        />
      </View>

      <Sheet
        open={sheetOpen}
        onDismiss={() => setSheetOpen(false)}
        title={t('gallery.sheetTitle')}
        dismissLabel={t('gallery.sheetDismiss')}
        icon={Send}
      >
        <View className="gap-4">
          <Button onPress={() => setSheetOpen(false)}>{t('gallery.sheetSend')}</Button>
          <Button variant="secondary" onPress={() => setSheetOpen(false)}>
            {t('gallery.sheetTrack')}
          </Button>
          <View className="flex-row justify-center pt-2">
            <IconButton
              icon={X}
              accessibilityLabel={t('gallery.sheetDismiss')}
              onPress={() => setSheetOpen(false)}
            />
          </View>
        </View>
      </Sheet>
    </SafeAreaView>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="gap-4">
      <Text accessibilityRole="header" className="font-sans text-h5 text-tertiary">
        {label}
      </Text>
      <View className="gap-4">{children}</View>
    </View>
  );
}
