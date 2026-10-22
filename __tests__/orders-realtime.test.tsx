import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { renderHook } from '@testing-library/react-native';

import { ordersKeys } from '@/features/orders/queries';
import { useOrderFreshness } from '@/features/orders/freshness';
import { subscribeToOrderRows } from '@/lib/supabase/realtime';

// Spec 0006 AC-11: the subscribe-and-invalidate helper. The Supabase client here
// is a hand built channel that records what was asked for and hands back the
// handler, so a test can deliver a postgres change payload on purpose.

type Payload = { new?: { id?: string }; old?: { id?: string } };

const mockConfigs: Record<string, unknown>[] = [];
const mockHandlers: ((payload: Payload) => void)[] = [];
const mockRemoveChannel = jest.fn();
const mockChannel = jest.fn(() => ({
  on: (_type: string, config: Record<string, unknown>, handler: (payload: Payload) => void) => {
    mockConfigs.push(config);
    mockHandlers.push(handler);
  },
  subscribe: jest.fn(),
}));
let mockClient: Record<string, unknown> = { channel: mockChannel, removeChannel: mockRemoveChannel };

jest.mock('@/lib/supabase', () => ({
  get supabase() {
    return mockClient;
  },
}));

function lastHandler(): (payload: Payload) => void {
  return mockHandlers[mockHandlers.length - 1];
}

beforeEach(() => {
  mockConfigs.length = 0;
  mockHandlers.length = 0;
  mockChannel.mockClear();
  mockRemoveChannel.mockClear();
  mockClient = { channel: mockChannel, removeChannel: mockRemoveChannel };
});

describe('subscribeToOrderRows', () => {
  // covers: AC-11
  it('subscribes to this customer orders rows only', () => {
    subscribeToOrderRows('user-1', () => {});

    expect(mockChannel).toHaveBeenCalledWith(expect.stringMatching(/^swifttransit-orders:user-1:\d+$/));
    expect(mockConfigs[0]).toEqual({
      event: '*',
      schema: 'public',
      table: 'orders',
      filter: 'customer_id=eq.user-1',
    });
  });

  // covers: AC-11
  it('names the order that changed, whether the payload carries a new or an old row', () => {
    const seen: string[] = [];
    subscribeToOrderRows('user-1', (orderId) => seen.push(orderId));

    lastHandler()({ new: { id: 'order-1' } });
    lastHandler()({ old: { id: 'order-2' } });
    lastHandler()({});

    expect(seen).toEqual(['order-1', 'order-2']);
  });

  // covers: AC-11
  it('never opens a channel without a signed in customer, and removes it on cancel', () => {
    subscribeToOrderRows(undefined, () => {});
    expect(mockChannel).not.toHaveBeenCalled();

    const subscription = subscribeToOrderRows('user-1', () => {});
    subscription.cancel();
    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
  });

  // covers: AC-11
  it('degrades to no subscription when the client has no realtime channel', () => {
    mockClient = {};

    expect(() => subscribeToOrderRows('user-1', () => {}).cancel()).not.toThrow();
    expect(mockChannel).not.toHaveBeenCalled();
  });
});

// covers: AC-11, and the channel name collision bug
it('gives two mounted surfaces of the same customer independent subscriptions', () => {
  // This client behaves like the real one: channel(name) returns the existing
  // channel when the name is taken, and removeChannel kills it for everyone
  // sharing it. A fixed-name helper collides here.
  type Ch = {
    bindings: ((payload: Payload) => void)[];
    on: (type: string, config: unknown, handler: (payload: Payload) => void) => void;
    subscribe: jest.Mock;
  };
  const channels = new Map<string, Ch>();
  const fake = {
    channel(name: string): Ch {
      let ch = channels.get(name);
      if (!ch) {
        ch = {
          bindings: [],
          on: (_type, _config, handler) => {
            ch!.bindings.push(handler);
          },
          subscribe: jest.fn(),
        };
        channels.set(name, ch);
      }
      return ch;
    },
    removeChannel(ch: Ch) {
      for (const [name, registered] of channels) {
        if (registered === ch) channels.delete(name);
      }
    },
  };
  mockClient = fake;

  const listSeen: string[] = [];
  const detailSeen: string[] = [];
  const listSub = subscribeToOrderRows('user-1', (id) => listSeen.push(id));
  subscribeToOrderRows('user-1', (id) => detailSeen.push(id));

  // Two live channels, one per surface, never a shared name.
  expect(channels.size).toBe(2);

  // The list screen goes away while the detail screen stays mounted.
  listSub.cancel();

  // The server pushes a change; the detail surface must still hear it.
  for (const ch of channels.values()) {
    for (const bind of ch.bindings) bind({ new: { id: 'order-1' } });
  }
  expect(detailSeen).toEqual(['order-1']);
  expect(listSeen).toEqual([]);
});

describe('useOrderFreshness', () => {
  function setup(openOrderId?: string) {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidated: unknown[] = [];
    const record = jest.fn(async (options: { queryKey?: readonly unknown[] }) => {
      invalidated.push(options.queryKey);
    });
    Object.assign(queryClient, { invalidateQueries: record });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return {
      invalidated,
      render: () => renderHook(() => useOrderFreshness('user-1', openOrderId), { wrapper }),
    };
  }

  // covers: AC-11
  it('invalidates the list plus the changed order on a screen that shows one order', async () => {
    const { invalidated, render } = setup('order-1');
    await render();

    lastHandler()({ new: { id: 'order-1' } });

    expect(invalidated).toEqual([
      ['orders'],
      ordersKeys.detail('order-1'),
      ordersKeys.events('order-1'),
      ordersKeys.courier('order-1'),
    ]);
  });

  // covers: AC-11
  it('leaves another order detail alone while the list refreshes', async () => {
    const { invalidated, render } = setup('order-1');
    await render();

    lastHandler()({ new: { id: 'order-2' } });

    expect(invalidated).toEqual([['orders']]);
  });

  // covers: AC-11
  it('refreshes every order read on a list screen that names no single order', async () => {
    const { invalidated, render } = setup();
    await render();

    lastHandler()({ new: { id: 'order-9' } });

    expect(invalidated).toEqual([
      ['orders'],
      ordersKeys.detail('order-9'),
      ordersKeys.events('order-9'),
      ordersKeys.courier('order-9'),
    ]);
  });
});
