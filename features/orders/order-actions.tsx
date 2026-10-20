import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { XCircle } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { errorLabel } from '@/lib/error-label';
import { displayTrackingCode, isCancelAllowed, type OrderRow } from './status-map';
import { useCancelOrder } from './cancel';

// AC-9, AC-10: the card overflow menu and the confirmation it opens. The money
// sentence is the server's rule stated plainly: a wallet order cancelled from
// `assigned` comes back, anything else does not in this build.

export function useCancelConfirm(orderId: string | undefined) {
  const { t } = useTranslation();
  const cancel = useCancelOrder(orderId);
  const [failed, setFailed] = useState<string | null>(null);

  const run = (onSuccess: () => void) => {
    setFailed(null);
    cancel.mutate(undefined, {
      onError: (e) => setFailed(errorLabel(t, e instanceof Error ? e.message : null)),
      onSuccess,
    });
  };

  const reset = () => setFailed(null);

  return { pending: cancel.isPending, failed, run, reset };
}

/** AC-9 confirmation copy, shared by the list menu and the detail screen. */
export function CancelConfirm({
  order,
  pending,
  error,
  onCancel,
  onDismiss,
}: {
  order: OrderRow;
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const refunds = order.payment_method === 'wallet' && order.status === 'assigned';
  return (
    <View className="gap-4">
      <Text className="text-center font-sans text-body-md text-secondary">{t('orders.cancelBody')}</Text>
      <Text className="text-center font-sans text-body-md text-primary">
        {refunds ? t('orders.refundWallet') : t('orders.refundNone')}
      </Text>
      {error ? (
        <Text accessibilityLiveRegion="polite" className="text-center font-sans text-body-sm text-danger">
          {error}
        </Text>
      ) : null}
      <Button variant="primary" loading={pending} onPress={onCancel}>
        {t('orders.cancel')}
      </Button>
      <Button variant="link" disabled={pending} onPress={onDismiss}>
        {t('orders.keepOrder')}
      </Button>
    </View>
  );
}

export function OrderActionsSheet({
  order,
  onClose,
  onChanged,
}: {
  order: OrderRow | null;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const { pending, failed, run, reset } = useCancelConfirm(order?.id);

  const close = () => {
    setConfirming(false);
    setCopied(false);
    reset();
    onClose();
  };

  return (
    <Sheet
      open={Boolean(order)}
      onDismiss={close}
      title={confirming ? t('orders.cancelTitle') : t('orders.overflowTitle')}
      dismissLabel={t('orders.sheetDismiss')}
      icon={confirming ? XCircle : undefined}
    >
      {order ? (
        confirming ? (
          <CancelConfirm
            order={order}
            pending={pending}
            error={failed}
            onCancel={() =>
              run(() => {
                onChanged?.();
                close();
              })
            }
            onDismiss={close}
          />
        ) : (
          <View className="gap-2">
            <Button
              variant="secondary"
              onPress={() => {
                const id = order.id;
                close();
                router.push(`/orders/${id}`);
              }}
            >
              {t('orders.viewOrder')}
            </Button>
            <Button
              variant="secondary"
              onPress={async () => {
                await Clipboard.setStringAsync(displayTrackingCode(order.tracking_code));
                setCopied(true);
              }}
            >
              {copied ? t('orders.copied') : t('orders.copyCode')}
            </Button>
            {isCancelAllowed(order.status) ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setConfirming(true)}
                className="py-4 active:opacity-70"
              >
                <Text className="text-center font-sans text-label-md text-danger">{t('orders.cancel')}</Text>
              </Pressable>
            ) : null}
          </View>
        )
      ) : null}
    </Sheet>
  );
}
