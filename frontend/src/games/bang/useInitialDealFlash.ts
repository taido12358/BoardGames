import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotionPreference } from "../../hooks/useReducedMotionPreference";

const DEAL_DURATION_MS = 850;

/** Animate the opening deal only on a real waiting-to-playing transition. */
export function useInitialDealFlash(isActive: boolean, roomId?: string): boolean {
  const reducedMotion = useReducedMotionPreference();
  const previousActive = useRef(isActive);
  const previousRoomId = useRef(roomId);
  const sequence = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const [dealing, setDealing] = useState(false);

  useLayoutEffect(() => {
    if (roomId !== previousRoomId.current) {
      previousRoomId.current = roomId;
      previousActive.current = isActive;
      sequence.current += 1;
      setDealing(false);
      window.clearTimeout(timer.current);
      return;
    }

    if (isActive && !previousActive.current) {
      sequence.current += 1;
      const activeSequence = sequence.current;
      setDealing(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        if (sequence.current === activeSequence) setDealing(false);
      }, reducedMotion ? 180 : DEAL_DURATION_MS);
    }
    previousActive.current = isActive;
  }, [isActive, roomId, reducedMotion]);

  useEffect(() => {
    if (!reducedMotion || !dealing) return;
    const activeSequence = sequence.current;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (sequence.current === activeSequence) setDealing(false);
    }, 180);
  }, [reducedMotion, dealing]);

  useEffect(() => () => window.clearTimeout(timer.current), []);
  return dealing;
}
