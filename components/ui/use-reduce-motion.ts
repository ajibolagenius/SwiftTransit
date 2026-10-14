import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// Reduce Motion, from the platform, kept in sync with changes (DESIGN.md: gate all motion on this).
export function useReduceMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let active = true;
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
      if (active) setReduced(value);
    });
    try {
      void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
        if (active) setReduced(value);
      });
    } catch {
      // No platform bridge (tests): keep the non-reduced default.
    }
    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  return reduced;
}
