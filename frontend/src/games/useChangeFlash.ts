import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotionPreference } from "../hooks/useReducedMotionPreference";

export interface ChangeFlashState {
  active: boolean;
  sequence: number;
}

/** Select alternating animation classes so a repeated change restarts its visual feedback. */
export function changeFlashClass(flash: ChangeFlashState, baseClass: string): string {
  return flash.active ? `${baseClass}-${flash.sequence % 2 === 0 ? "a" : "b"}` : "";
}

/** Briefly highlight a value only after it changes, never on initial mount. */
export function useChangeFlash<T>(value: T, durationMs = 550, resetKey?: string): ChangeFlashState {
  const reducedMotion = useReducedMotionPreference();
  const activeDurationMs = reducedMotion ? 180 : durationMs;
  const previous = useRef(value);
  const previousResetKey = useRef(resetKey);
  const previousDuration = useRef(activeDurationMs);
  const sequence = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const [flash, setFlash] = useState<ChangeFlashState>({ active: false, sequence: 0 });

  useLayoutEffect(() => {
    const durationChanged = previousDuration.current !== activeDurationMs;
    previousDuration.current = activeDurationMs;
    if (resetKey !== previousResetKey.current) {
      previous.current = value;
      previousResetKey.current = resetKey;
      setFlash({ active: false, sequence: sequence.current });
      window.clearTimeout(timer.current);
      return;
    }
    if (value === undefined) {
      previous.current = value;
      return;
    }
    if (previous.current === undefined) {
      previous.current = value;
      return;
    }
    if (!Object.is(value, previous.current)) {
      previous.current = value;
      sequence.current += 1;
      const activeSequence = sequence.current;
      setFlash({ active: true, sequence: activeSequence });
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        if (sequence.current !== activeSequence) return;
        setFlash((current) => current.sequence === activeSequence ? { ...current, active: false } : current);
      }, activeDurationMs);
      return;
    }
    if (durationChanged && flash.active) {
      const activeSequence = sequence.current;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        if (sequence.current !== activeSequence) return;
        setFlash((current) => current.sequence === activeSequence ? { ...current, active: false } : current);
      }, activeDurationMs);
    }
  }, [value, activeDurationMs, resetKey, flash.active]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return flash;
}
