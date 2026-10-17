import type { ComponentType, ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Fixed window metrics so insets are deterministic in Jest (no native safe area bridge).
const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

export function Providers({ children }: { children: ReactNode }) {
  return <SafeAreaProvider initialMetrics={initialMetrics}>{children}</SafeAreaProvider>;
}

export const wrapper: ComponentType<{ children: ReactNode }> = Providers;
