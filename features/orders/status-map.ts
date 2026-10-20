import type { TFunction } from 'i18next';
import type { LucideIcon } from 'lucide-react-native';
import { FileText, Package, ShoppingBasket, UtensilsCrossed } from 'lucide-react-native';

import type { Database } from '@/lib/supabase/types';

// Spec 0006 AC-5, AC-8, AC-9, AC-10 and the Value sourcing table. Every label
// the list and the detail show is derived here, from a named source, never in
// the route.

export type OrderStatus = Database['public']['Enums']['order_status'];
export type OrderType = Database['public']['Enums']['order_type'];
export type OrderRow = Database['public']['Tables']['orders']['Row'];
export type OrderEventRow = Database['public']['Tables']['order_events']['Row'];

export const ACTIVE_STATUSES: readonly OrderStatus[] = [
  'pending_payment',
  'searching',
  'assigned',
  'at_pickup',
  'picked_up',
  'at_dropoff',
];

export const PAST_STATUSES: readonly OrderStatus[] = ['delivered', 'cancelled', 'failed'];

/** AC-9: the server's legal cancel sources, mirrored so the button only shows where it can win. */
export const CANCEL_STATUSES: readonly OrderStatus[] = ['pending_payment', 'searching', 'assigned'];

export function isCancelAllowed(status: OrderStatus): boolean {
  return CANCEL_STATUSES.includes(status);
}

type FilterName = 'all' | 'active' | 'past';

export function statusesForFilter(filter: FilterName): readonly OrderStatus[] | null {
  if (filter === 'active') return ACTIVE_STATUSES;
  if (filter === 'past') return PAST_STATUSES;
  return null;
}

/** `tracking_code` is char(8) and can come back space padded; TN- is a display prefix only. */
export function displayTrackingCode(code: string): string {
  return `TN-${stripPrefix(code)}`;
}

/** AC-3: the query matches with or without the TN- prefix, case-insensitively. */
export function matchesTrackingQuery(query: string, code: string): boolean {
  const needle = query.trim().toLowerCase().replace(/^tn-/, '');
  if (!needle) return true;
  return stripPrefix(code).toLowerCase().includes(needle);
}

// The wizard writes `TN-` and the display layer adds it too, so fold any stored
// prefix away before showing the code.
function stripPrefix(code: string): string {
  return code.trim().replace(/^TN-/, '');
}

export function cardTitleKey(type: OrderType) {
  return `orders.type.${type}` as const;
}

const TYPE_ICONS: Record<OrderType, LucideIcon> = {
  document: FileText,
  parcel: Package,
  food: UtensilsCrossed,
  groceries: ShoppingBasket,
};

export function iconForType(type: OrderType): LucideIcon {
  return TYPE_ICONS[type] ?? Package;
}

export function statusLabelKey(status: OrderStatus) {
  return `orders.status.${status}` as const;
}

export function statusTone(status: OrderStatus): 'brand' | 'amber' | 'neutral' {
  if (status === 'delivered') return 'brand';
  if (status === 'cancelled' || status === 'failed') return 'neutral';
  if (status === 'pending_payment') return 'amber';
  return 'brand';
}

const timeFormat = new Intl.DateTimeFormat('en-NG', { hour: 'numeric', minute: '2-digit' });
const dayFormat = new Intl.DateTimeFormat('en-NG', { weekday: 'short' });

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** The Today/Tomorrow words every date formatter in this feature is handed. */
export function dayLabels(t: TFunction) {
  return { today: t('orders.dayToday'), tomorrow: t('orders.dayTomorrow') };
}

/** Value sourcing: scheduled orders render `Today, 15:30`; null renders the status label instead. */
export function etaValueFor(order: OrderRow, labels: { today: string; tomorrow: string }): string {
  if (!order.scheduled_at) return '';
  return formatMoment(order.scheduled_at, labels);
}

/** `2026-10-20T14:30:00Z` -> `Today, 15:30`, on the device's local day. */
export function formatMoment(iso: string, labels: { today: string; tomorrow: string }): string {
  const date = new Date(iso);
  const today = startOfDay(new Date());
  const diffDays = Math.round((startOfDay(date).getTime() - today.getTime()) / 86_400_000);
  const day = diffDays === 0 ? labels.today : diffDays === 1 ? labels.tomorrow : dayFormat.format(date);
  return `${day}, ${timeFormat.format(date)}`;
}

export type TimelineStep = {
  key: 'booked' | 'courier_found' | 'on_the_way' | 'delivered';
  reached: boolean;
  timestamp: string | null;
};

export type Timeline = {
  steps: TimelineStep[];
  terminal: 'cancelled' | 'failed' | null;
  expired: boolean;
};

const STEP_ORDER: TimelineStep['key'][] = ['booked', 'courier_found', 'on_the_way', 'delivered'];

const STATUS_STEP: Record<OrderStatus, TimelineStep['key'] | 'cancelled' | 'failed'> = {
  pending_payment: 'booked',
  searching: 'booked',
  assigned: 'courier_found',
  at_pickup: 'courier_found',
  picked_up: 'on_the_way',
  at_dropoff: 'on_the_way',
  delivered: 'delivered',
  cancelled: 'cancelled',
  failed: 'failed',
};

/**
 * AC-5: the nine database statuses collapse into five customer steps by this
 * fixed map. A step is reached when any event (or the row's own status) sits at
 * or past it; its timestamp is the earliest event that reached it. A cancelled
 * event with a null actor is the payment expiry job, not a user cancel.
 */
export function buildTimeline(order: OrderRow, events: readonly OrderEventRow[]): Timeline {
  // A terminal status is not a step on the ladder; it is its own marker. The
  // furthest step reached is the highest step any non-terminal event (or the
  // row's own status) names, and "Booked" is always reached because the order
  // exists.
  const stepPoint = (s: OrderStatus): number => {
    const target = STATUS_STEP[s];
    return target === 'cancelled' || target === 'failed' ? -1 : STEP_ORDER.indexOf(target);
  };

  const points = [stepPoint(order.status), ...events.map((e) => stepPoint(e.status))];
  const reached = Math.min(Math.max(0, ...points), STEP_ORDER.length - 1);

  const steps: TimelineStep[] = STEP_ORDER.map((key, index) => {
    if (index > reached) return { key, reached: false, timestamp: null };
    const firstEvent = events.find((e) => STATUS_STEP[e.status] === key);
    // The row itself proves the step its status sits on, so a live order whose
    // events have not loaded yet still shows one reached step.
    const timestamp = firstEvent?.created_at ?? (index === reached ? order.created_at : null);
    return { key, reached: true, timestamp };
  });

  const terminal =
    STATUS_STEP[order.status] === 'cancelled' || STATUS_STEP[order.status] === 'failed'
      ? (STATUS_STEP[order.status] as 'cancelled' | 'failed')
      : null;

  // AC-5: a cancelled event with no actor is the 15 minute payment expiry job.
  // It takes a real null-actor event to say so, so a failed or empty events
  // read never rewrites a user cancel as an expiry.
  const expired =
    order.status === 'cancelled' && events.some((e) => e.status === 'cancelled' && e.actor_id === null);

  return { steps, terminal, expired };
}
