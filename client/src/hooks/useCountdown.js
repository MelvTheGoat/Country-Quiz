import { useEffect, useRef, useState } from 'react';

/**
 * Counts down `durationMs` from the moment `resetKey` changes.
 *
 * The server owns the real deadline; this is only the visual clock, which is
 * why it works off a duration handed to us rather than an absolute timestamp
 * (no clock-skew maths, and a paused match can hand us the remainder).
 */
export function useCountdown({ durationMs, resetKey, running = true, onExpire }) {
  const [msLeft, setMsLeft] = useState(durationMs || 0);
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (!durationMs) {
      setMsLeft(0);
      return undefined;
    }
    expiredRef.current = false;
    const endsAt = Date.now() + durationMs;
    setMsLeft(durationMs);
    if (!running) return undefined;

    const id = setInterval(() => {
      const left = Math.max(0, endsAt - Date.now());
      setMsLeft(left);
      if (left === 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpireRef.current?.();
      }
    }, 100);
    return () => clearInterval(id);
  }, [durationMs, resetKey, running]);

  return {
    msLeft,
    secondsLeft: Math.ceil(msLeft / 1000),
    fraction: durationMs ? msLeft / durationMs : 0,
  };
}
