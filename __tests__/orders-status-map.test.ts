import {
  ACTIVE_STATUSES,
  CANCEL_STATUSES,
  PAST_STATUSES,
  buildTimeline,
  cardTitleKey,
  displayTrackingCode,
  etaValueFor,
  isCancelAllowed,
  matchesTrackingQuery,
  statusesForFilter,
  statusLabelKey,
  statusTone,
  type OrderEventRow,
  type OrderRow,
  type OrderStatus,
} from '@/features/orders/status-map';
import en from '@/locales/en.json';

// Spec 0006. These are the pure derivations behind the two screens: the AC-5
// collapse map, the AC-2 filters, the AC-3 search, the AC-9 cancel mirror and
// the value sourcing rules. Nothing here needs a render or a network.

const ALL_STATUSES = [
  'pending_payment',
  'searching',
  'assigned',
  'at_pickup',
  'picked_up',
  'at_dropoff',
  'delivered',
  'cancelled',
  'failed',
] as const satisfies readonly OrderStatus[];

function at(dayOffset: number, hour = 9, minute = 5): string {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function orderRow(over: Partial<OrderRow> = {}): OrderRow {
  return {
    id: '3f2a6d3e-9a1b-4c0d-8e5f-6a7b8c9d0e1f',
    customer_id: '00000000-0000-4000-8000-0000000000c1',
    tracking_code: '7KQ2M4XJ',
    type: 'parcel',
    status: 'searching',
    scheduled_at: null,
    pickup_line: '1 Herbert Macaulay Way, Yaba, Lagos',
    pickup_lat: 6.5092,
    pickup_lng: 3.3777,
    dropoff_line: 'Allen Avenue, Ikeja, Lagos',
    dropoff_lat: 6.6018,
    dropoff_lng: 3.3515,
    receiver_name: 'Adaeze Okafor',
    receiver_phone: '+2348031234567',
    instructions: '',
    package_size: 'medium',
    weight_kg: 2.5,
    handling_flags: [],
    base_kobo: 150000,
    distance_kobo: 64900,
    handling_kobo: 10000,
    total_kobo: 224900,
    payment_method: 'card',
    payment_reference: null,
    courier_id: null,
    idempotency_key: null,
    package_photo_path: null,
    created_at: at(0),
    ...over,
  };
}

function eventRow(
  status: OrderStatus,
  created_at: string,
  actor_id: string | null = 'courier-1',
): OrderEventRow {
  return {
    id: `event-${status}`,
    order_id: '3f2a6d3e-9a1b-4c0d-8e5f-6a7b8c9d0e1f',
    status,
    actor_id,
    created_at,
  };
}

const labels = { today: 'Today', tomorrow: 'Tomorrow' };

describe('the AC-5 collapse map', () => {
  // covers: AC-5
  it('maps each of the nine statuses to the step AC-5 names', () => {
    const stepOf = (status: OrderStatus) => {
      const timeline = buildTimeline(orderRow({ status }), []);
      return timeline.steps.filter((step) => step.reached).map((step) => step.key);
    };

    expect(stepOf('pending_payment')).toEqual(['booked']);
    expect(stepOf('searching')).toEqual(['booked']);
    expect(stepOf('assigned')).toEqual(['booked', 'courier_found']);
    expect(stepOf('at_pickup')).toEqual(['booked', 'courier_found']);
    expect(stepOf('picked_up')).toEqual(['booked', 'courier_found', 'on_the_way']);
    expect(stepOf('at_dropoff')).toEqual(['booked', 'courier_found', 'on_the_way']);
    expect(stepOf('delivered')).toEqual(['booked', 'courier_found', 'on_the_way', 'delivered']);
  });

  // covers: AC-5
  it('keeps a terminal status off the ladder and reports it as its own marker', () => {
    const cancelled = buildTimeline(orderRow({ status: 'cancelled' }), [
      eventRow('searching', at(0, 9)),
      eventRow('cancelled', at(0, 10), 'customer-1'),
    ]);

    expect(cancelled.terminal).toBe('cancelled');
    expect(cancelled.steps.filter((s) => s.reached)).toHaveLength(1);
    expect(cancelled.steps.map((s) => s.key)).toEqual(['booked', 'courier_found', 'on_the_way', 'delivered']);

    const failed = buildTimeline(orderRow({ status: 'failed' }), []);
    expect(failed.terminal).toBe('failed');
  });

  // covers: AC-5
  it('takes each step timestamp from the earliest event that reached it', () => {
    const timeline = buildTimeline(orderRow({ status: 'picked_up' }), [
      eventRow('pending_payment', at(0, 8, 0)),
      eventRow('searching', at(0, 8, 1)),
      eventRow('assigned', at(0, 9, 30)),
      eventRow('at_pickup', at(0, 10)),
      eventRow('picked_up', at(0, 11)),
      eventRow('at_dropoff', at(0, 12)),
    ]);

    expect(timeline.steps[0].timestamp).toBe(at(0, 8, 0));
    expect(timeline.steps[1].timestamp).toBe(at(0, 9, 30));
    expect(timeline.steps[2].timestamp).toBe(at(0, 11));
    expect(timeline.steps[3].timestamp).toBeNull();
  });

  // covers: AC-5, AC-14
  it('reads a cancel with no actor as the payment expiry, not a user cancel', () => {
    const expired = buildTimeline(orderRow({ status: 'cancelled', payment_method: null }), [
      eventRow('pending_payment', at(0, 9), null),
      eventRow('cancelled', at(0, 9, 15), null),
    ]);
    expect(expired.expired).toBe(true);

    const userCancelled = buildTimeline(orderRow({ status: 'cancelled' }), [
      eventRow('cancelled', at(0, 10), 'customer-1'),
    ]);
    expect(userCancelled.expired).toBe(false);
  });

  // covers: AC-5
  it('proves the current step from the row when the events have not loaded', () => {
    const timeline = buildTimeline(orderRow({ status: 'assigned', created_at: at(0, 7) }), []);
    expect(timeline.steps[1]).toMatchObject({ reached: true, timestamp: at(0, 7) });
  });
});

describe('filters, cancel eligibility and labels', () => {
  // covers: AC-2
  it('splits the statuses into active and past exactly as the filter promises', () => {
    expect(statusesForFilter('all')).toBeNull();
    expect(ACTIVE_STATUSES).toEqual([
      'pending_payment',
      'searching',
      'assigned',
      'at_pickup',
      'picked_up',
      'at_dropoff',
    ]);
    expect(PAST_STATUSES).toEqual(['delivered', 'cancelled', 'failed']);
    expect(statusesForFilter('active')).toEqual(ACTIVE_STATUSES);
    expect(statusesForFilter('past')).toEqual(PAST_STATUSES);
    for (const status of ALL_STATUSES) {
      const inEither = ACTIVE_STATUSES.includes(status) || PAST_STATUSES.includes(status);
      expect(inEither).toBe(true);
    }
  });

  // covers: AC-9
  it('shows cancel only where the server accepts it', () => {
    expect(CANCEL_STATUSES).toEqual(['pending_payment', 'searching', 'assigned']);
    for (const status of ALL_STATUSES) {
      expect(isCancelAllowed(status)).toBe(CANCEL_STATUSES.includes(status));
    }
  });

  // covers: AC-15
  it('has an english label and a tone for every status and every order type', () => {
    const statuses = en.orders.status as unknown as Record<string, string>;
    const timeline = en.orders.timeline as unknown as Record<string, string>;
    for (const status of ALL_STATUSES) {
      expect(statuses[statusLabelKey(status).split('.')[2]]).toBeTruthy();
      expect(['brand', 'amber', 'neutral']).toContain(statusTone(status));
    }
    expect(timeline.booked).toBeTruthy();
    expect(timeline.expired).toBeTruthy();
    for (const type of ['document', 'parcel', 'food', 'groceries'] as const) {
      expect((en.orders.type as unknown as Record<string, string>)[type]).toBeTruthy();
      expect(cardTitleKey(type)).toBe(`orders.type.${type}`);
    }
  });
});

describe('tracking code display and search', () => {
  // covers: AC-3
  it('adds the display prefix and folds away a stored one', () => {
    expect(displayTrackingCode('7KQ2M4XJ')).toBe('TN-7KQ2M4XJ');
    expect(displayTrackingCode('TN-7KQ2M4XJ')).toBe('TN-7KQ2M4XJ');
    expect(displayTrackingCode('7KQ2M4XJ        ')).toBe('TN-7KQ2M4XJ');
  });

  // covers: AC-3
  it('matches with or without the prefix, in any case, and never on blanks', () => {
    for (const query of ['7kq2', '7KQ2', 'TN-7KQ2', 'tn-7KQ2M4XJ', '  7KQ2M4XJ  ']) {
      expect(matchesTrackingQuery(query, '7KQ2M4XJ')).toBe(true);
    }
    expect(matchesTrackingQuery('9ZZZ', '7KQ2M4XJ')).toBe(false);
    expect(matchesTrackingQuery('', '7KQ2M4XJ')).toBe(true);
    expect(matchesTrackingQuery('   ', '7KQ2M4XJ')).toBe(true);
  });
});

describe('estimated delivery and schedule text', () => {
  // covers: AC-1, value sourcing
  it('renders the scheduled time for the device day, and nothing when there is no schedule', () => {
    expect(etaValueFor(orderRow({ scheduled_at: null }), labels)).toBe('');
    expect(etaValueFor(orderRow({ scheduled_at: at(0) }), labels)).toMatch(/^Today, /);
    expect(etaValueFor(orderRow({ scheduled_at: at(1) }), labels)).toMatch(/^Tomorrow, /);
  });
});
