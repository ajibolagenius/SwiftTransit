import { AccessibilityInfo } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';

import { useReduceMotion } from '@/components/ui/use-reduce-motion';

type Listener = (value: boolean) => void;
type Stub = { listeners: Listener[]; remove: jest.Mock };

// The platform boundary is stubbed inside each test. This suite discards mock implementations installed
// in beforeEach, so a spy set up there reaches the test body with its stub already stripped.
function stubPlatform(reported: boolean | 'pending'): Stub {
  const listeners: Listener[] = [];
  const remove = jest.fn();

  jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation(((event: string, cb: Listener) => {
    if (event === 'reduceMotionChanged') listeners.push(cb);
    return { remove };
  }) as never);

  jest
    .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
    .mockImplementation((() =>
      reported === 'pending' ? new Promise(() => {}) : Promise.resolve(reported)) as never);

  return { listeners, remove };
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('useReduceMotion', () => {
  // covers: AC-9
  it('reports no reduction before the platform answers', async () => {
    stubPlatform('pending');
    const { result } = await renderHook(() => useReduceMotion());
    expect(result.current).toBe(false);
  });

  // covers: AC-9
  it('adopts the platform value once it resolves', async () => {
    stubPlatform(true);
    const { result } = await renderHook(() => useReduceMotion());

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current).toBe(true);
  });

  // covers: AC-9
  it('follows the platform when the setting changes while mounted', async () => {
    const { listeners } = stubPlatform(false);
    const { result } = await renderHook(() => useReduceMotion());
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current).toBe(false);

    await act(async () => {
      for (const cb of listeners) cb(true);
    });
    expect(result.current).toBe(true);
  });

  it('subscribes to the platform and unsubscribes on unmount', async () => {
    const { listeners, remove } = stubPlatform(false);
    const { unmount } = await renderHook(() => useReduceMotion());
    expect(listeners).toHaveLength(1);

    await unmount();
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
