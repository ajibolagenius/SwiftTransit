import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import type { ReactNode } from 'react';

import { PAGE_SIZE } from '@/features/orders/queries';
import type { AuthState } from '@/features/auth/guards';
import { queryClient } from '@/lib/query';

// Spec 0006 AC-1, AC-2, AC-3, AC-9, AC-10, AC-12, AC-14 through the real route
// tree. The Supabase read is a scripted chainable: it answers every select with
// the rows below and records what the query builder asked for, so the filter and
// paging clauses are observable.

let mockAuth: AuthState = { status: 'signed-in', session: null, role: 'customer' };

const ORDER_ID = '3f2a6d3e-9a1b-4c0d-8e5f-6a7b8c9d0e1f';
const USER_ID = '00000000-0000-4000-8000-0000000000c1';

function todayAt(hour: number, minute = 0): string {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function row(id: string, over: Record<string, unknown> = {}) {
  return {
    id,
    tracking_code: id.slice(-8).toUpperCase(),
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
    handling_kobo: 0,
    total_kobo: 214900,
    payment_method: 'wallet',
    courier_id: null,
    created_at: todayAt(9),
    ...over,
  };
}

// The rows the list answers with, newest first, exactly as the query orders them.
const mockRows: Record<string, unknown>[] = [
  row(ORDER_ID, { tracking_code: '7KQ2M4XJ', status: 'searching' }),
  row('00000000-0000-4000-8000-0000000000b2', {
    tracking_code: '3M9PQ1ZR',
    type: 'food',
    status: 'delivered',
    scheduled_at: todayAt(15, 30),
  }),
];

// The whole table the paging mock answers from. The window test replaces this
// with a full history; the default two row set keeps the other tests untouched.
let mockTable = mockRows;
// Every page window the list asked for, in order, so AC-1 can name page two.
const mockWindows: { from: number; to: number }[] = [];
// When true, the second page comes back empty, which ends the pagination.
let mockNoNextPage = false;

/** The whole table the paging mock answers from, newest first. */
function tableRows(): Record<string, unknown>[] {
  return mockTable;
}

let mockFailList = false;
const mockListCalls: { statuses: string[] | null; from: number; to: number }[] = [];
const mockRpc = jest.fn(
  (
    name: string,
    args: Record<string, unknown>,
  ): Promise<{ data: unknown; error: { message: string } | null }> =>
    Promise.resolve({
      data: name === 'change_order_status' ? { ...args, status: 'cancelled' } : null,
      error: null,
    }),
);

// Supabase's builder is a thenable: `await` can come after any clause, in any
// order, so the chain answers when it is awaited, not when `range` is called.
type Chain = {
  select: () => Chain;
  eq: (column: string, value: string) => Chain;
  in: (column: string, values: readonly string[]) => Chain;
  order: () => Chain;
  range: (from: number, to: number) => Chain;
  limit: (count: number) => Chain;
  maybeSingle: () => Chain;
  then: Promise<unknown>['then'];
};

function mockSucceed(data: unknown) {
  return Promise.resolve({ data, error: null });
}

function mockChain(table: string): Chain {
  let statuses: string[] | null = null;
  let pageWindow = { from: 0, to: 0 };
  let mode: 'range' | 'limit' | 'single' = 'range';

  const chain: Chain = {
    select: () => chain,
    eq: () => chain,
    in: (_column, values) => {
      statuses = [...values];
      return chain;
    },
    order: () => chain,
    range: (from, to) => {
      pageWindow = { from, to };
      mode = 'range';
      return chain;
    },
    limit: () => {
      mode = 'limit';
      return chain;
    },
    maybeSingle: () => {
      mode = 'single';
      return chain;
    },
    then(onFulfilled, onRejected) {
      if (table === 'orders' && mode === 'range') {
        mockListCalls.push({ statuses, ...pageWindow });
        mockWindows.push(pageWindow);
      }
      // Answer like PostgREST would: apply the status clause, then the window.
      const wanted = statuses;
      const filtered = wanted ? tableRows().filter((r) => wanted.includes(String(r.status))) : tableRows();
      const outcome =
        mode === 'single'
          ? mockSucceed(null)
          : mockFailList
            ? Promise.resolve({ data: null, error: { message: 'FATAL: connection timeout' } })
            : mode === 'limit'
              ? mockSucceed(filtered.slice(0, 3))
              : mode === 'range' && table === 'orders'
                ? mockSucceed(
                    (mockNoNextPage && pageWindow.from > 0 ? [] : filtered).slice(
                      pageWindow.from,
                      pageWindow.to + 1,
                    ),
                  )
                : mockSucceed(filtered);
      return outcome.then(onFulfilled, onRejected);
    },
  };
  return chain;
}

jest.mock('@/lib/supabase', () => ({
  get supabase() {
    return {
      auth: {
        updateUser: jest.fn(),
        getSession: jest.fn(() =>
          Promise.resolve({ data: { session: { user: { id: '00000000-0000-4000-8000-0000000000c1' } } } }),
        ),
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
jest.mock('@maplibre/maplibre-react-native', () => ({
  Map: (props: { children?: ReactNode }) => props.children ?? null,
  Camera: () => null,
  GeoJSONSource: (props: { children?: ReactNode }) => props.children ?? null,
  Layer: () => null,
}));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(() => Promise.resolve()) }));

// Every promise in this file resolves on microtasks, so a plain async act is
// enough to land the update. Data is awaited with `findBy*`, the same way the
// wizard suite does it.
async function open(initialUrl: string) {
  const router = renderRouter('./app', { initialUrl });
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
  mockFailList = false;
  mockNoNextPage = false;
  mockListCalls.length = 0;
  mockWindows.length = 0;
  mockRpc.mockClear();
  mockTable = [
    row(ORDER_ID, { tracking_code: '7KQ2M4XJ', status: 'searching' }),
    row('00000000-0000-4000-8000-0000000000b2', {
      tracking_code: '3M9PQ1ZR',
      type: 'food',
      status: 'delivered',
      scheduled_at: todayAt(15, 30),
    }),
  ];
});

describe('the orders tab', () => {
  // covers: AC-1
  it('lists the customer own orders, newest first, with a status chip each', async () => {
    await open('/orders');
    await screen.findByText('TN-7KQ2M4XJ');

    const codes = screen.getAllByText(/^TN-/).map((element) => String(element.props.children));
    expect(codes).toEqual(['TN-7KQ2M4XJ', 'TN-3M9PQ1ZR']);
    expect(screen.getAllByText('Searching for a courier').length).toBe(2);
    expect(screen.getAllByText('Delivered').length).toBeGreaterThan(0);
    // An unscheduled order shows its status word in the second slot instead.
    expect(screen.getByText('Status')).toBeTruthy();
    // The scheduled order shows its time instead of a status word in the ETA slot.
    expect(screen.getAllByText(/Estimated Delivery/).length).toBeGreaterThan(0);
    // AC-1 paging: the first read is a 20 row window, newest first.
    expect(mockListCalls[0]).toEqual({ statuses: null, from: 0, to: PAGE_SIZE - 1 });
  });

  // covers: AC-1
  it('appends page two with no duplicate and ends the list only when there is no next page', async () => {
    // 25 orders, newest first. Page one is a full 20, so the pagination continues.
    mockTable = Array.from({ length: 25 }, (_, i) =>
      row(`00000000-0000-4000-8000-${String(i).padStart(12, '0')}`, {
        tracking_code: `TEST${String(i).padStart(4, '0')}`,
        status: i === 0 ? 'searching' : 'delivered',
      }),
    );
    await open('/orders');
    await screen.findByText('TN-TEST0000');

    // Page one asked for rows 0 to 19 and the end of list line is not up yet,
    // because there is a next page.
    expect(mockWindows).toEqual([{ from: 0, to: PAGE_SIZE - 1 }]);
    expect(screen.queryByText('That’s every order')).toBeNull();

    // The FlatList carries no role and does not surface scroll as an event on
    // its children, so reach the list host and invoke its end reached handler
    // the way the scroll would.
    const list = screen.getByText('TN-TEST0000').parent;
    if (!list) throw new Error('the rendered card has no list host above it');
    await act(async () => {
      fireEvent(list, 'onEndReached', {
        contentOffset: { x: 0, y: 10000 },
        contentSize: { width: 400, height: 100000 },
        layout: { width: 400, height: 800 },
      });
    });

    // The next window asked for rows 20 to 39, not a repeat of the first.
    await waitFor(() =>
      expect(mockWindows).toEqual([
        { from: 0, to: PAGE_SIZE - 1 },
        { from: PAGE_SIZE, to: 2 * PAGE_SIZE - 1 },
      ]),
    );
    // The five leftovers landed under the twenty, with no order twice. The list
    // virtualizes what it renders, so the appended data is read from the query
    // cache it renders from.
    await waitFor(() => {
      const cached = queryClient.getQueryCache().find({ queryKey: ['orders', 'all', USER_ID], exact: true })!
        .state.data as { pages: { rows: { tracking_code: string }[] }[] };
      const codes = cached.pages.flatMap((page) => page.rows.map((r) => r.tracking_code));
      expect(codes).toHaveLength(25);
      expect(new Set(codes).size).toBe(25);
      expect(codes[20]).toBe('TEST0020');
    });

    // A short page means no next page: that is what turns the footer on.
    expect(await screen.findByText('That’s every order')).toBeTruthy();
  });

  // covers: AC-3, AC-15
  it('shows the scan control as present, disabled, and honest about arriving later', async () => {
    await open('/orders');
    await screen.findByText('TN-7KQ2M4XJ');

    const scan = screen.getByLabelText('Scan a QR code');
    expect(scan.props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
    expect(screen.getByLabelText('Scan a QR code. QR scan arrives later')).toBeTruthy();
  });

  // covers: AC-2
  it('drives the query from the filter, not from the rows already loaded', async () => {
    await open('/orders');
    await screen.findByText('TN-7KQ2M4XJ');
    expect(mockListCalls[0].statuses).toBeNull();

    await press(screen.getByText('Active Orders'));
    expect(await screen.findByText('TN-7KQ2M4XJ')).toBeTruthy();
    expect(mockListCalls[mockListCalls.length - 1].statuses).toEqual([
      'pending_payment',
      'searching',
      'assigned',
      'at_pickup',
      'picked_up',
      'at_dropoff',
    ]);

    await press(screen.getByText('Past Orders'));
    expect(await screen.findByText('Delivered')).toBeTruthy();
    expect(mockListCalls[mockListCalls.length - 1].statuses).toEqual(['delivered', 'cancelled', 'failed']);
  });

  // covers: AC-3
  it('matches the tracking code with or without the prefix', async () => {
    await open('/orders');
    const field = await screen.findByLabelText('Search by tracking code');

    await act(async () => {
      fireEvent.changeText(field, 'tn-3m9p');
    });

    expect(screen.getAllByText(/^TN-/).map((element) => String(element.props.children))).toEqual([
      'TN-3M9PQ1ZR',
    ]);

    await act(async () => {
      fireEvent.changeText(field, 'ZZZZ');
    });
    expect(await screen.findByText('No order matches that')).toBeTruthy();

    await press(screen.getByText('Clear search and filter'));
    expect(await screen.findByText('TN-7KQ2M4XJ')).toBeTruthy();
  });

  // covers: AC-14
  it('shows the book a delivery state when the customer has never ordered', async () => {
    mockTable = [];
    await open('/orders');

    expect(await screen.findByText('No deliveries yet')).toBeTruthy();
    expect(screen.getByText('Book your first one and it shows up here.')).toBeTruthy();
  });

  // covers: AC-2, AC-14
  it('shows the no match state, not the book a delivery state, when a filter empties the list', async () => {
    // The history holds one searching order: Active can show it, Past cannot.
    mockTable = [row(ORDER_ID, { tracking_code: '7KQ2M4XJ', status: 'searching' })];
    await open('/orders');
    await screen.findByText('TN-7KQ2M4XJ');

    await press(screen.getByText('Past Orders'));

    expect(await screen.findByText('No order matches that')).toBeTruthy();
    expect(screen.queryByText('No deliveries yet')).toBeNull();
    expect(screen.getByText('Clear search and filter')).toBeTruthy();

    await press(screen.getByText('Clear search and filter'));
    expect(await screen.findByText('TN-7KQ2M4XJ')).toBeTruthy();
  });

  // covers: AC-14
  it('shows a failed load with a retry that works once the network answers', async () => {
    mockFailList = true;
    await open('/orders');

    expect(await screen.findByText(/load your orders/, {}, { timeout: 6000 })).toBeTruthy();

    mockFailList = false;
    await press(screen.getByText('Try again'));
    expect(await screen.findByText('TN-7KQ2M4XJ')).toBeTruthy();
  });

  // covers: AC-10, AC-9
  it('offers cancel from the card menu and states the refund rule before it asks the server', async () => {
    await open('/orders');

    const [firstMenu] = await screen.findAllByLabelText('Order actions');
    await press(firstMenu);
    expect(await screen.findByText('Copy tracking code')).toBeTruthy();

    await press(screen.getByRole('button', { name: 'Cancel delivery' }));
    expect(await screen.findByText('Cancel this delivery?')).toBeTruthy();
    // A searching order returns nothing, whatever it was paid with.
    expect(screen.getByText('No money comes back with this cancel.')).toBeTruthy();

    await press(screen.getByRole('button', { name: 'Cancel delivery' }));
    expect(mockRpc).toHaveBeenCalledWith('change_order_status', {
      order_id: ORDER_ID,
      new_status: 'cancelled',
    });
  });

  // covers: AC-9, AC-14
  it('returns the card sheet to the clean menu after a refused cancel', async () => {
    mockRpc.mockImplementation(
      (
        name: string,
        _args: Record<string, unknown>,
      ): Promise<{ data: unknown; error: { message: string } | null }> =>
        name === 'change_order_status'
          ? Promise.resolve({ data: null, error: { message: 'policy refused' } })
          : Promise.resolve({ data: null, error: null }),
    );
    await open('/orders');

    const [firstMenu] = await screen.findAllByLabelText('Order actions');
    await press(firstMenu);
    await press(screen.getByRole('button', { name: 'Cancel delivery' }));
    await press(screen.getAllByRole('button', { name: 'Cancel delivery' }).pop());

    // A refusal with no server code reads as the offline line inside the sheet.
    expect(
      await screen.findByText('You appear to be offline. Check your connection and try again.'),
    ).toBeTruthy();

    // Leaving the sheet clears the refusal, so the next open is a clean menu,
    // not the stale error waiting on the customer.
    await press(screen.getByRole('link', { name: 'Keep the delivery' }));
    await press(firstMenu);
    expect(await screen.findByText('Copy tracking code')).toBeTruthy();
    expect(screen.queryByText('You appear to be offline. Check your connection and try again.')).toBeNull();
  });

  // covers: AC-10
  it('copies the tracking code from the card menu', async () => {
    const clipboard = require('expo-clipboard') as { setStringAsync: jest.Mock };
    await open('/orders');

    const [firstMenu] = await screen.findAllByLabelText('Order actions');
    await press(firstMenu);
    await press(await screen.findByText('Copy tracking code'));

    expect(clipboard.setStringAsync).toHaveBeenCalledWith('TN-7KQ2M4XJ');
    expect(await screen.findByText('Copied')).toBeTruthy();
  });
});

describe('home active deliveries', () => {
  // covers: AC-12
  it('shows the active orders with a way to the full list', async () => {
    await open('/');

    expect(await screen.findByText('Active deliveries')).toBeTruthy();
    expect(screen.getByText('View all')).toBeTruthy();
    expect(screen.getByText('TN-7KQ2M4XJ')).toBeTruthy();
  });

  // covers: AC-12
  it('hides the section when there is nothing active', async () => {
    mockTable = [];
    await open('/');

    await screen.findByText('Send anything, anywhere, anytime');
    expect(screen.queryByText('Active deliveries')).toBeNull();
  });
});
