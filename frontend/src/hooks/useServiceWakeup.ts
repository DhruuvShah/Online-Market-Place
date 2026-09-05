import { useEffect, useState, useSyncExternalStore } from "react";
import {
  getWarmupSnapshot,
  subscribeToWarmup,
  warmServices,
} from "@/lib/warmup";

/** Past this the wait stops being ordinary and the copy should say so. */
export const SLOW_AFTER_SECONDS = 45;

export function useServiceWakeup() {
  const snapshot = useSyncExternalStore(
    subscribeToWarmup,
    getWarmupSnapshot,
    getWarmupSnapshot,
  );

  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    warmServices();

    const started = Date.now();
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - started) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return {
    ...snapshot,
    elapsed,
    slow: elapsed >= SLOW_AFTER_SECONDS,
  };
}
