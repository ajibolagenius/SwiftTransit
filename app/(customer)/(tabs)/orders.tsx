import { ScanLine, Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Chip } from '@/components/ui/chip';
import { IconButton } from '@/components/ui/icon-button';
import { OrderCard } from '@/components/ui/order-card';
import { Segmented } from '@/components/ui/segmented';
import { OrderActionsSheet } from '@/features/orders/order-actions';
import { useOrderFreshness } from '@/features/orders/freshness';
import { PAGE_SIZE, useOrdersQuery, useSessionUserId, type OrderFilter } from '@/features/orders/queries';
import {
  cardTitleKey,
  dayLabels,
  displayTrackingCode,
  etaValueFor,
  iconForType,
  matchesTrackingQuery,
  statusLabelKey,
  statusTone,
  type OrderRow,
} from '@/features/orders/status-map';
import { useThemeColors } from '@/theme/use-theme';

// Spec 0006 AC-1, AC-2, AC-3, AC-10, AC-14. The filter drives the query, the
// search narrows the loaded pages client side (the spec's accepted tradeoff),
// and every state the list can be in has its own screen furniture.

export default function OrdersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const userId = useSessionUserId();
  const [filter, setFilter] = useState<OrderFilter>('all');
  const [query, setQuery] = useState('');
  const [menuOrder, setMenuOrder] = useState<OrderRow | null>(null);

  const list = useOrdersQuery(filter);
  useOrderFreshness(userId);

  const rows = useMemo(() => (list.data?.pages ?? []).flatMap((p) => p.rows), [list.data]);
  const visible = useMemo(
    () => (query.trim() ? rows.filter((o) => matchesTrackingQuery(query, o.tracking_code)) : rows),
    [rows, query],
  );

  const labels = dayLabels(t);

  const renderCard = ({ item }: { item: OrderRow }) => {
    const eta = etaValueFor(item, labels);
    return (
      <View className="gap-3">
        <OrderCard
          icon={iconForType(item.type)}
          title={t(cardTitleKey(item.type))}
          trackingId={displayTrackingCode(item.tracking_code)}
          trackingLabel={t('orders.trackingLabel')}
          etaLabel={eta ? t('orders.etaLabel') : t('orders.statusLabel')}
          etaValue={eta || t(statusLabelKey(item.status))}
          overflowLabel={t('orders.overflow')}
          onPress={() => router.push(`/orders/${item.id}`)}
          onOverflowPress={() => setMenuOrder(item)}
        />
        <View className="px-1">
          <Chip tone={statusTone(item.status)}>{t(statusLabelKey(item.status))}</Chip>
        </View>
      </View>
    );
  };

  const loading = list.isPending && Boolean(userId);
  const failed = list.isError;
  const searching = query.trim().length > 0;
  const empty = !loading && !failed && visible.length === 0;
  // The "no orders at all" state belongs to a customer who has never ordered.
  // Under a filter or a search, an empty list is a no match, with its clear action.
  const neverOrdered = filter === 'all' && rows.length === 0;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-primary">
      <View className="gap-5 px-7 pb-4 pt-2">
        <Text accessibilityRole="header" className="font-sans text-h2 text-primary">
          {t('orders.title')}
        </Text>

        <View className="flex-row items-center gap-3">
          <View className="h-12 flex-1 flex-row items-center gap-3 rounded-xl border border-default bg-primary px-6 focus:border-focus">
            <Search size={20} strokeWidth={1.5} color={colors.text.tertiary} accessibilityElementsHidden />
            <TextInput
              accessibilityLabel={t('orders.searchLabel')}
              value={query}
              onChangeText={setQuery}
              placeholder={t('orders.searchPlaceholder')}
              placeholderTextColor={colors.text.tertiary}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="search"
              className="min-w-0 flex-1 font-sans text-body-md text-primary"
            />
          </View>
          {/* Deferred: QR scan for tracking numbers. Present, disabled, labeled as coming later. */}
          <View
            accessibilityRole="summary"
            accessibilityLabel={`${t('orders.scan')}. ${t('orders.scanSoon')}`}
          >
            <IconButton icon={ScanLine} accessibilityLabel={t('orders.scan')} disabled />
          </View>
        </View>

        <Segmented
          label={t('orders.filters')}
          value={filter}
          onChange={(next) => setFilter(next)}
          options={[
            { value: 'all', label: t('orders.filterAll') },
            { value: 'active', label: t('orders.filterActive') },
            { value: 'past', label: t('orders.filterPast') },
          ]}
        />
      </View>

      {failed ? (
        <View className="flex-1 items-center justify-center gap-4 px-9">
          <Text className="text-center font-sans text-body-md text-secondary">{t('orders.loadFailed')}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void list.refetch()}
            className="rounded-xl bg-interactive-primary px-9 py-4 active:opacity-90"
          >
            <Text className="font-sans text-label-md text-on-brand">{t('orders.retry')}</Text>
          </Pressable>
        </View>
      ) : loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator accessibilityRole="progressbar" color={colors.text.brand} />
        </View>
      ) : empty ? (
        <View className="flex-1 items-center justify-center gap-3 px-9">
          <Text className="text-center font-sans text-subheading-md text-primary">
            {neverOrdered ? t('orders.emptyTitle') : t('orders.noMatchTitle')}
          </Text>
          <Text className="text-center font-sans text-body-md text-secondary">
            {neverOrdered ? t('orders.emptyBody') : t('orders.noMatchBody')}
          </Text>
          {neverOrdered ? (
            <Pressable
              accessibilityRole="link"
              onPress={() => router.push('/new-delivery/1')}
              hitSlop={8}
              className="py-3"
            >
              <Text className="underline font-sans text-label-md text-link">{t('orders.emptyCta')}</Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setQuery('');
                setFilter('all');
              }}
              hitSlop={8}
              className="py-3"
            >
              <Text className="underline font-sans text-label-md text-link">{t('orders.noMatchClear')}</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          contentContainerClassName="gap-5 px-7 pb-8"
          refreshControl={
            <RefreshControl
              refreshing={list.isRefetching}
              onRefresh={() => void list.refetch()}
              tintColor={colors.text.brand}
              colors={[colors.text.brand]}
            />
          }
          onEndReached={() => {
            if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            list.isFetchingNextPage ? (
              <ActivityIndicator accessibilityRole="progressbar" color={colors.text.brand} />
            ) : rows.length >= PAGE_SIZE && !searching && !list.hasNextPage ? (
              <Text className="text-center font-sans text-body-sm text-tertiary">
                {t('orders.endOfList')}
              </Text>
            ) : null
          }
        />
      )}

      <OrderActionsSheet
        order={menuOrder}
        onClose={() => setMenuOrder(null)}
        onChanged={() => void list.refetch()}
      />
    </SafeAreaView>
  );
}
