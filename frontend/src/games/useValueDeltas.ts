import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotionPreference } from "../hooks/useReducedMotionPreference";

/** Keep numeric changes visible independently when several values update in quick succession. */
export function useValueDeltas(values: number[], resetKey?: string, durationMs = 720): ReadonlyMap<number, number> {
  const reducedMotion = useReducedMotionPreference();
  const activeDurationMs = reducedMotion ? 180 : durationMs;
  const previous = useRef(values);
  const previousKey = useRef(resetKey);
  const previousDuration = useRef(activeDurationMs);
  const timer = useRef<number | undefined>(undefined);
  const expirations = useRef(new Map<number, number>());
  const [deltas, setDeltas] = useState<ReadonlyMap<number, number>>(new Map());

  const scheduleExpiry = useCallback(() => {
    window.clearTimeout(timer.current);
    const nextExpiry = Math.min(...expirations.current.values());
    if (!Number.isFinite(nextExpiry)) return;
    timer.current = window.setTimeout(() => {
      const now = performance.now();
      const expired = new Set<number>();
      for (const [index, expiresAt] of expirations.current) {
        if (expiresAt <= now) {
          expirations.current.delete(index);
          expired.add(index);
        }
      }
      if (expired.size) {
        setDeltas((current) => new Map([...current].filter(([index]) => !expired.has(index))));
      }
      scheduleExpiry();
    }, Math.max(0, nextExpiry - performance.now()));
  }, []);

  useLayoutEffect(() => {
    const durationChanged = previousDuration.current !== activeDurationMs;
    previousDuration.current = activeDurationMs;
    if (resetKey !== previousKey.current) {
      previousKey.current = resetKey;
      previous.current = values;
      expirations.current.clear();
      setDeltas(new Map());
      window.clearTimeout(timer.current);
      return;
    }

    const changes = new Map<number, number>();
    const length = Math.max(previous.current.length, values.length);
    for (let index = 0; index < length; index += 1) {
      const delta = (values[index] ?? 0) - (previous.current[index] ?? 0);
      if (delta !== 0) changes.set(index, delta);
    }
    previous.current = values;

    const now = performance.now();
    const expired = new Set<number>();
    for (const [index, expiresAt] of expirations.current) {
      if (expiresAt <= now) {
        expirations.current.delete(index);
        expired.add(index);
      }
    }
    if (durationChanged) {
      for (const index of expirations.current.keys()) expirations.current.set(index, now + activeDurationMs);
    }
    for (const index of changes.keys()) expirations.current.set(index, now + activeDurationMs);

    if (!changes.size && !durationChanged) return;
    if (!changes.size && expired.size) {
      setDeltas((current) => new Map([...current].filter(([index]) => !expired.has(index))));
    }
    if (changes.size) {
      setDeltas((current) => {
        const next = new Map([...current].filter(([index]) => expirations.current.has(index)));
        for (const [index, delta] of changes) {
          const netDelta = (next.get(index) ?? 0) + delta;
          if (netDelta === 0) next.delete(index);
          else next.set(index, netDelta);
        }
        return next;
      });
    }
    scheduleExpiry();
  }, [values, resetKey, activeDurationMs, scheduleExpiry]);

  useEffect(() => () => window.clearTimeout(timer.current), []);
  return deltas;
}
