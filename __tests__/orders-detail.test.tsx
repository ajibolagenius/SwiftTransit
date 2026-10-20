import { act, fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import type { ReactNode } from 'react';

import type { AuthState } from '@/features/auth/guards';
import { queryClient } from '@/lib/query';

// Spec 0006 AC-4 to AC-9 and AC-14 through the real route. The order is fetched
// by id, the events by order, the courier through `profiles` plus the
// `courier_vehicle` function, so the mocks answer each of those reads separately
// and record what was asked for.

let mockAuth: AuthState = { status: 'signed-in', session: null, role: 'customer' };

const ORDER_ID = '3f2a6d3e-9a1b-4c0d-8e5f-6a7b8c9d0e1f';
const USER_ID = '00000000-0000-4000-8000-0000000000c1';
const COURIER_ID = '00000000-0000-4000-8000-0000000000f1';

function todayAt(hour: number, minute = 0): string {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function mockOrder(over: Record<string, unknown> = {}) {
  return {
    id: ORDER_ID,
    tracking_code: '7KQ2M4XJ',
    type: 'parcel',
    status: 'assigned',
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
    handling_flags: ['fragile'],
    base_kobo: 150000,
    distance_kobo: 64900,
    handling_kobo: 0,
    total_kobo: 214900,
    payment_method: 'wallet',
    courier_id: COURIER_ID,
    created_at: todayAt(9, 5),
    ...over,
  };
}

function mockEventRow(status: string, actor: string | null, at: string) {
  return { id: `${status}-1`, order_id: ORDER_ID, status, actor_id: actor, created_at: at };
}

let mockOrderRow: Record<string, unknown> = mockOrder();
let mockEventRows: Record<string, unknown>[] = [
  mockEventRow('pending_payment', USER_ID, todayAt(9, 5)),
  mockEventRow('searching', USER_ID, todayAt(9, 6)),
  mockEventRow('assigned', COURIER_ID, todayAt(10, 20)),
];
let mockProfile: Record<string, unknown> | null = {
  first_name: 'Tunde',
  last_name: 'Bakare',
  phone: '+2348031112222',
};
let mockVehicle: Record<string, unknown> | null = { vehicle_type: 'bike', vehicle_number: 'KST-482-XJ' };
let mockFailDetail = false;
// The id the last `orders` read asked for. The mock answers like RLS would:
// a row only exists for the id that was seeded, every other id reads empty.
let mockAskedId: string | null = null;

/** Every `eq(column, value)` the reads asked for, so AC-4 can name the id read. */
const mockEqCalls: { table: string; column: string; value: unknown }[] = [];
const mockRpc = jest.fn(
  (
    name: string,
    args: Record<string, unknown>,
  ): Promise<{ data: unknown; error: { message: string } | null }> => {
    mockRpcCalls.push({ name, args });
    if (name === 'courier_vehicle') {
      // The function returns a table, so a real RPC answer is an array of rows.
      return Promise.resolve({ data: mockVehicle ? [mockVehicle] : [], error: null });
    }
    return Promise.resolve({ data: { status: 'cancelled' }, error: null });
  },
);
const mockRpcCalls: { name: string; args: Record<string, unknown> }[] = [];

type Mode = 'range' | 'limit' | 'single';

type Chain = {
  select: () => Chain;
  eq: (column: string, value: unknown) => Chain;
  in: () => Chain;
  order: () => Chain;
  range: () => Chain;
  limit: () => Chain;
  maybeSingle: () => Chain;
  then: Promise<unknown>['then'];
};

function resolveRead(table: string, mode: Mode) {
  if (table === 'orders') {
    if (mockFailDetail)
      return Promise.resolve({ data: null, error: { message: 'FATAL: connection timeout' } });
    const row = mockAskedId === null || mockAskedId === ORDER_ID ? mockOrderRow : null;
    return Promise.resolve({
      data: mode === 'single' ? row : row ? [row] : [],
      error: null,
    });
  }
  if (table === 'order_events') return Promise.resolve({ data: mockEventRows, error: null });
  if (table === 'profiles') return Promise.resolve({ data: mockProfile, error: null });
  return Promise.resolve({ data: [], error: null });
}

function mockChain(table: string): Chain {
  let mode: Mode = 'range';
  const chain: Chain = {
    select: () => chain,
    eq: (column, value) => {
      mockEqCalls.push({ table, column, value });
      if (table === 'orders' && column === 'id') mockAskedId = String(value);
      return chain;
    },
    in: () => chain,
    order: () => chain,
    range: () => chain,
    limit: () => {
      mode = 'limit';
      return chain;
    },
    maybeSingle: () => {
      mode = 'single';
      return chain;
    },
    then(onFulfilled, onRejected) {
      return resolveRead(table, mode).then(onFulfilled, onRejected);
    },
  };
  return chain;
}

jest.mock('@/lib/supabase', () => ({
  get supabase() {
    return {
      auth: {
        updateUser: jest.fn(),
        getSession: jest.fn(() => Promise.resolve({ data: { session: { user: { id: USER_ID } } } })),
      },
      rpc: (name: string, args: Record<string, unknown>) => mockRpc(name, args),
      from: (table: string) => mockChain(table),
      storage: { from: jest.fn(() => ({ upload: jest.fn(), remove: jest.fn() })) },
    };
  },
}));

jest.mock('@/features/auth/auth-provider', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => mockAuth,
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/lib/env', () => ({
  env: {
    EXPO_PUBLIC_MAP_STYLE_LIGHT: 'https://tiles.openfreemap.org/styles/positron',
    EXPO_PUBLIC_MAP_STYLE_DARK: 'https://tiles.openfreemap.org/styles/dark',
  },
}));
jest.mock('../global.css', () => ({}));

const mockMapProps = jest.fn();
jest.mock('@maplibre/maplibre-react-native', () => ({
  Map: (props: Record<string, unknown>) => {
    mockMapProps(props);
    return (props.children as ReactNode) ?? null;
  },
  Camera: (props: Record<string, unknown>) => {
    mockMapProps(props);
    return null;
  },
  GeoJSONSource: (props: { children?: ReactNode }) => props.children ?? null,
  Layer: () => null,
}));

async function open(id: string) {
  const router = renderRouter('./app', { initialUrl: `/orders/${id}` });
  await router;
  return router;
}

async function press(target: Parameters<typeof fireEvent.press>[0] | undefined) {
  if (!target) throw new Error('the control this test reached for is not on screen');
  await act(async () => {
    fireEvent.press(target);
  });
}

beforeEach(() => {
  queryClient.clear();
  mockAuth = { status: 'signed-in', session: null, role: 'customer' };
  mockFailDetail = false;
  mockOrderRow = mockOrder();
  mockEventRows = [
    mockEventRow('pending_payment', USER_ID, todayAt(9, 5)),
    mockEventRow('searching', USER_ID, todayAt(9, 6)),
    mockEventRow('assigned', COURIER_ID, todayAt(10, 20)),
  ];
  mockProfile = { first_name: 'Tunde', last_name: 'Bakare', phone: '+2348031112222' };
  mockVehicle = { vehicle_type: 'bike', vehicle_number: 'KST-482-XJ' };
  mockEqCalls.length = 0;
  mockRpcCalls.length = 0;
  mockAskedId = null;
  mockRpc.mockClear();
  mockMapProps.mockClear();
});

describe('the order detail', () => {
  // covers: AC-4
  it('fetches the order by id and puts the tracking code on screen', async () => {
    await open(ORDER_ID);

    expect(await screen.findByText('TN-7KQ2M4XJ')).toBeTruthy();
    expect(mockEqCalls).toContainEqual({ table: 'orders', column: 'id', value: ORDER_ID });
    // The heading and the receipt row name the same type.
    expect(screen.getAllByText('Parcel delivery').length).toBe(2);
    expect(screen.getByText('Order detail')).toBeTruthy();
    // The row's own status is the chip next to the code.
    expect(screen.getAllByText('Courier found').length).toBe(2);
  });

  // covers: AC-5
  it('collapses the statuses into the ladder, with a time only on the steps reached', async () => {
    await open(ORDER_ID);
    await screen.findByText('TN-7KQ2M4XJ');

    for (const step of ['Booked', 'Courier found', 'On the way', 'Delivered']) {
      expect(screen.getAllByText(step).length).toBeGreaterThan(0);
    }
    // Two reached steps carry a timestamp, the two ahead of them carry none.
    expect(screen.getAllByText(/^Today, /).length).toBe(2);
    expect(screen.queryByText('Payment window expired')).toBeNull();
  });

  // covers: AC-5
  it('names a payment expiry as the reason a cancelled order ended', async () => {
    mockOrderRow = mockOrder({ status: 'cancelled', courier_id: null });
    mockEventRows = [
      mockEventRow('pending_payment', USER_ID, todayAt(9, 5)),
      mockEventRow('cancelled', null, todayAt(9, 20)),
    ];
    await open(ORDER_ID);

    expect(await screen.findByText('Payment window expired')).toBeTruthy();
    expect(screen.getByText('Cancelled')).toBeTruthy();
    // The ladder stops where it was: nothing past Booked was reached.
    expect(screen.getAllByText(/^Today, /).length).toBe(2);
  });

  // covers: AC-6
  it('draws the route as it was booked, between the two stored points', async () => {
    await open(ORDER_ID);
    await screen.findByText('TN-7KQ2M4XJ');

    expect(screen.getByLabelText('Route from pickup to drop-off')).toBeTruthy();
    expect(screen.getByText('Route')).toBeTruthy();
    // Once under the map, once again on the receipt.
    expect(screen.getAllByText('1 Herbert Macaulay Way, Yaba, Lagos').length).toBe(2);
    expect(screen.getAllByText('Allen Avenue, Ikeja, Lagos').length).toBe(2);

    const camera = mockMapProps.mock.calls.find(([props]) => props.initialViewState)?.[0] as {
      initialViewState: { bounds: number[] };
    };
    expect(camera.initialViewState.bounds).toEqual([3.3515, 6.5092, 3.3777, 6.6018]);
  });

  // covers: AC-7
  it('shows the courier the order is assigned to, with the vehicle from the server', async () => {
    await open(ORDER_ID);
    await screen.findByText('TN-7KQ2M4XJ');

    expect(await screen.findByText('Tunde Bakare')).toBeTruthy();
    expect(screen.getByText('Your courier')).toBeTruthy();
    expect(screen.getByText('Bike, KST-482-XJ')).toBeTruthy();
    expect(mockRpcCalls).toContainEqual({ name: 'courier_vehicle', args: { order_id: ORDER_ID } });
    expect(screen.getByLabelText('Call the courier')).toBeTruthy();
    expect(screen.getByLabelText('Chat with the courier')).toBeTruthy();
  });

  // covers: AC-7
  it('still shows the courier when there is no vehicle row', async () => {
    mockVehicle = null;
    await open(ORDER_ID);

    expect(await screen.findByText('Tunde Bakare')).toBeTruthy();
    expect(screen.queryByText(/KST-482-XJ/)).toBeNull();
  });

  // covers: AC-7
  it('leaves the courier section out until a courier is assigned', async () => {
    mockOrderRow = mockOrder({ status: 'searching', courier_id: null });
    mockEventRows = [mockEventRow('pending_payment', USER_ID, todayAt(9, 5))];
    await open(ORDER_ID);

    expect(await screen.findByText('TN-7KQ2M4XJ')).toBeTruthy();
    expect(screen.queryByText('Your courier')).toBeNull();
    expect(mockRpcCalls.map((call) => call.name)).not.toContain('courier_vehicle');
  });

  // covers: AC-8
  it('renders the receipt from the row, in naira at display time only', async () => {
    await open(ORDER_ID);
    await screen.findByText('TN-7KQ2M4XJ');

    expect(screen.getByText('₦1,500.00')).toBeTruthy();
    expect(screen.getByText('₦649.00')).toBeTruthy();
    expect(screen.getByText('₦2,149.00')).toBeTruthy();
    expect(screen.getByText('Medium')).toBeTruthy();
    expect(screen.getByText('2.5 kg')).toBeTruthy();
    expect(screen.getByText('Fragile')).toBeTruthy();
    // An ASAP order says so instead of showing a time.
    expect(screen.getByText('ASAP')).toBeTruthy();
    expect(screen.getByText('Adaeze Okafor')).toBeTruthy();
  });

  // covers: AC-9
  it('offers cancel while it is still legal and states the wallet refund before asking', async () => {
    await open(ORDER_ID);
    await press(await screen.findByRole('button', { name: 'Cancel delivery' }));

    expect(await screen.findByText('Cancel this delivery?')).toBeTruthy();
    // Assigned on wallet is the one case that comes back in this build.
    expect(screen.getByText('Your wallet is refunded the full amount.')).toBeTruthy();

    // The last match is the confirm button inside the sheet, not the screen's own.
    const confirm = screen.getAllByRole('button', { name: 'Cancel delivery' }).pop();
    await press(confirm);

    expect(mockRpc).toHaveBeenCalledWith('change_order_status', {
      order_id: ORDER_ID,
      new_status: 'cancelled',
    });
  });

  // covers: AC-9
  it('says nothing comes back for a card order that is only searching', async () => {
    mockOrderRow = mockOrder({ status: 'searching', courier_id: null, payment_method: 'card' });
    await open(ORDER_ID);
    await press(await screen.findByRole('button', { name: 'Cancel delivery' }));

    expect(await screen.findByText('No money comes back with this cancel.')).toBeTruthy();
  });

  // covers: AC-9
  it('takes the cancel control away once the package is on the way', async () => {
    mockOrderRow = mockOrder({ status: 'picked_up' });
    mockEventRows = [...mockEventRows, mockEventRow('picked_up', COURIER_ID, todayAt(11, 0))];
    await open(ORDER_ID);

    expect(await screen.findByText('TN-7KQ2M4XJ')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Cancel delivery' })).toBeNull();
  });

  // covers: AC-15
  it('gives every icon-only control a label a reader can hear', async () => {
    await open(ORDER_ID);
    await screen.findByText('Tunde Bakare');

    expect(screen.getByLabelText('Go back')).toBeTruthy();
    expect(screen.getByLabelText('Call the courier')).toBeTruthy();
    expect(screen.getByLabelText('Chat with the courier')).toBeTruthy();
    expect(screen.getByLabelText('Route from pickup to drop-off')).toBeTruthy();
    // The screen and its sections announce themselves as headers.
    expect(screen.getAllByRole('header').length).toBeGreaterThan(2);
  });

  // covers: AC-14
  it('says it cannot find the order when the read returns nothing', async () => {
    // RLS answers with no row for someone else's order, so the read is a null row.
    mockOrderRow = null as unknown as Record<string, unknown>;
    await open('00000000-0000-4000-8000-0000000000zz');

    expect(await screen.findByText('We can’t find that order')).toBeTruthy();
    expect(screen.getByText('It may belong to another account, or it no longer exists.')).toBeTruthy();
    expect(screen.queryByText('TN-7KQ2M4XJ')).toBeNull();
  });

  // covers: AC-14
  it('shows a failed load with a retry on the detail too', async () => {
    mockFailDetail = true;
    await open(ORDER_ID);

    expect(await screen.findByText(/load your orders/, {}, { timeout: 6000 })).toBeTruthy();

    mockFailDetail = false;
    await press(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('TN-7KQ2M4XJ')).toBeTruthy();
  });

  // covers: AC-14
  it('keeps the loaded order on screen when a background refetch fails', async () => {
    await open(ORDER_ID);
    await screen.findByText('TN-7KQ2M4XJ');

    // A realtime style invalidation refetches the row, and this time the read
    // fails. The retry timer is fake timed, so it is advanced inside the same
    // awaited act: the refetch settles to error without its scope leaking past
    // the test. The cached order stays on screen; the full screen error state
    // is only for a read that never produced data.
    mockFailDetail = true;
    await act(async () => {
      const refetch = queryClient.refetchQueries({ queryKey: ['order', ORDER_ID] });
      await jest.advanceTimersByTimeAsync(5_000);
      await refetch;
    });

    expect(
      queryClient.getQueryCache().find({ queryKey: ['order', ORDER_ID], exact: true })?.state.status,
    ).toBe('error');

    expect(screen.queryByText(/load your orders/)).toBeNull();
    expect(screen.getByText('TN-7KQ2M4XJ')).toBeTruthy();
  });

  // covers: AC-9
  it('clears a refused cancel once the dialog is dismissed', async () => {
    mockRpc.mockImplementation(
      (name: string): Promise<{ data: unknown; error: { message: string } | null }> =>
        name === 'change_order_status'
          ? Promise.resolve({ data: null, error: { message: 'policy refused' } })
          : Promise.resolve({ data: null, error: null }),
    );
    await open(ORDER_ID);
    await press(await screen.findByRole('button', { name: 'Cancel delivery' }));
    await press(screen.getAllByRole('button', { name: 'Cancel delivery' }).pop());

    // The refusal shows inside the open dialog.
    expect(
      await screen.findByText('You appear to be offline. Check your connection and try again.'),
    ).toBeTruthy();

    // Dismissing resets the mutation state, so reopening shows the plain
    // confirm again, not the stale refusal.
    await press(screen.getByRole('link', { name: 'Keep the delivery' }));
    await press(await screen.findByRole('button', { name: 'Cancel delivery' }));
    expect(await screen.findByText('Cancel this delivery?')).toBeTruthy();
    expect(screen.queryByText('You appear to be offline. Check your connection and try again.')).toBeNull();
  });

  // covers: AC-14, AC-4
  it('shows the same not found state for a blank id, without ever revealing a row', async () => {
    // A blank id is not a route match for an order. Use a whitespace id: the
    // read goes out, matches nothing, and the screen must land on the very
    // same not found copy someone else's order gets.
    await open('%20');

    expect(await screen.findByText('We can’t find that order')).toBeTruthy();
    expect(screen.getByText('It may belong to another account, or it no longer exists.')).toBeTruthy();
    expect(screen.queryByText(/load your orders/)).toBeNull();
    expect(mockEqCalls).toContainEqual({ table: 'orders', column: 'id', value: ' ' });
  });
});
