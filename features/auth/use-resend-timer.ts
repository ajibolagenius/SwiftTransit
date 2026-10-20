import { useEffect, useRef, useState } from 'react';

import { RESEND_SECONDS } from './constants';

// Spec 0003 resend rule: store the send timestamp, derive remaining time per tick
// and on foreground; a send that already aged out unlocks immediately.
export function useResendTimer(sentAt: number | null): { remaining: number; canResend: boolean } {
  const [now, setNow] = useState(() => Date.now());
  const lastTick = useRef(now);

  useEffect(() => {
    if (sentAt === null) return;
    const tick = () => {
      const at = Date.now();
      if (at - lastTick.current >= 900) {
        lastTick.current = at;
        setNow(at);
      }
    };
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [sentAt]);

  if (sentAt === null) return { remaining: 0, canResend: false };
  const elapsed = Math.floor((now - sentAt) / 1000);
  const remaining = Math.max(0, RESEND_SECONDS - elapsed);
  return { remaining, canResend: remaining === 0 };
}
