import { act, renderHook } from '@testing-library/react-native';

import { usePressScale } from '@/components/ui/use-press-scale';

jest.mock('@/components/ui/use-reduce-motion');

import { useReduceMotion } from '@/components/ui/use-reduce-motion';

// The jest reanimated mock is a plain CJS module object, so withTiming is spied on there.
const reanimated = require('react-native-reanimated') as {
  withTiming: (value: number, config?: unknown) => unknown;
};

const mockReduced = useReduceMotion as jest.MockedFunction<typeof useReduceMotion>;

afterEach(() => {
  jest.restoreAllMocks();
  mockReduced.mockReset();
});

describe('usePressScale', () => {
  // covers: AC-9
  it('scales down to the press target while pressed', async () => {
    mockReduced.mockReturnValue(false);
    const spy = jest.spyOn(reanimated, 'withTiming');
    const { result } = await renderHook(() => usePressScale());

    await act(async () => {
      result.current.onPressIn();
    });
    expect(spy).toHaveBeenLastCalledWith(0.97, { duration: 100 });
  });

  // covers: AC-9
  it('returns to full size on release', async () => {
    mockReduced.mockReturnValue(false);
    const spy = jest.spyOn(reanimated, 'withTiming');
    const { result } = await renderHook(() => usePressScale());

    await act(async () => {
      result.current.onPressIn();
    });
    await act(async () => {
      result.current.onPressOut();
    });
    expect(spy).toHaveBeenLastCalledWith(1, { duration: 100 });
  });

  // covers: AC-9
  it('holds full size while pressed when Reduce Motion is on', async () => {
    mockReduced.mockReturnValue(true);
    const spy = jest.spyOn(reanimated, 'withTiming');
    const { result } = await renderHook(() => usePressScale());

    await act(async () => {
      result.current.onPressIn();
    });
    expect(spy).toHaveBeenLastCalledWith(1, { duration: 100 });
  });

  it('exposes an animated style carrying a scale transform', async () => {
    mockReduced.mockReturnValue(false);
    const { result } = await renderHook(() => usePressScale());
    // The jest reanimated mock returns a plain style object, not an AnimatedStyleHandle.
    const style = result.current.animatedStyle as unknown as { transform: { scale: number }[] };
    expect(style.transform[0]).toHaveProperty('scale', 1);
  });
});
