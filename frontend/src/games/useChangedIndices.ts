import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotionPreference } from "../hooks/useReducedMotionPreference";

/** Select alternating animation classes for each index that changed. */
export function changedIndexClass(changed: ReadonlyMap<number, number>, index: number, baseClass: string): string {
  const sequence = changed.get(index);
  return sequence === undefined ? "" : `${baseClass}-${sequence % 2 === 0 ? "a" : "b"}`;
}

/** Return each changed index and its animation sequence for its own full animation window. */
export function useChangedIndices(values: number[], durationMs = 650, resetKey?: string): ReadonlyMap<number, number> {
  const reducedMotion = useReducedMotionPreference();
  const activeDurationMs = reducedMotion ? 180 : durationMs;
  const previous = useRef(values);
  const previousResetKey = useRef(resetKey);
  const previousDuration = useRef(activeDurationMs);
  const timer = useRef<number | undefined>(undefined);
  const expirations = useRef(new Map<number, number>());
  const sequences = useRef(new Map<number, number>());
  const [changed, setChanged] = useState<ReadonlyMap<number, number>>(new Map());

  const snapshot = useCallback(() => new Map(
    [...expirations.current.keys()].map((index) => [index, sequences.current.get(index) ?? 0] as const),
  ), []);

  const scheduleExpiry = useCallback(() => {
    function armNextExpiry() {
      window.clearTimeout(timer.current);
      const nextExpiry = Math.min(...expirations.current.values());
      if (!Number.isFinite(nextExpiry)) return;
      timer.current = window.setTimeout(() => {
        const now = performance.now();
        for (const [index, expiresAt] of expirations.current) {
          if (expiresAt <= now) expirations.current.delete(index);
        }
        setChanged(snapshot());
        armNextExpiry();
      }, Math.max(0, nextExpiry - performance.now()));
    }
    armNextExpiry();
  }, [snapshot]);

  useLayoutEffect(() => {
    const durationChanged = previousDuration.current !== activeDurationMs;
    previousDuration.current = activeDurationMs;
    if (resetKey !== previousResetKey.current) {
      previous.current = values;
      previousResetKey.current = resetKey;
      expirations.current.clear();
      sequences.current.clear();
      setChanged(new Map());
      window.clearTimeout(timer.current);
      return;
    }
    if (previous.current.length === 0 && values.length > 0) {
      previous.current = values;
      return;
    }

    const indexes = new Set<number>();
    const maxLength = Math.max(previous.current.length, values.length);
    for (let index = 0; index < maxLength; index += 1) {
      if (values[index] !== previous.current[index]) indexes.add(index);
    }
    previous.current = values;

    const now = performance.now();
    for (const [index, expiresAt] of expirations.current) {
      if (expiresAt <= now) expirations.current.delete(index);
    }
    if (durationChanged) {
      for (const index of expirations.current.keys()) expirations.current.set(index, now + activeDurationMs);
    }
    for (const index of indexes) {
      expirations.current.set(index, now + activeDurationMs);
      sequences.current.set(index, (sequences.current.get(index) ?? 0) + 1);
    }

    if (!indexes.size && !durationChanged) return;
    setChanged(snapshot());
    scheduleExpiry();
  }, [values, activeDurationMs, resetKey, snapshot, scheduleExpiry]);

  useEffect(() => () => window.clearTimeout(timer.current), []);
  return changed;
}
