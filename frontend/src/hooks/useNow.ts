import { useEffect, useState } from "react";

/**
 * A clock that ticks only while something on screen depends on it.
 *
 * Countdowns need to re-render every second; everything else on an order page
 * changes when the server says so. Gating on `active` keeps a delivered order
 * from re-rendering once a second for as long as the tab is open.
 */
export function useNow(active: boolean, intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;

    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [active, intervalMs]);

  return now;
}
