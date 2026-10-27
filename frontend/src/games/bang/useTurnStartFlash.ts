import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ChangeFlashState } from "../useChangeFlash";
import { useReducedMotionPreference } from "../../hooks/useReducedMotionPreference";

/** Highlight a newly received turn, but not the first render of a room. */
export function useTurnStartFlash(isCurrentTurn: boolean, roomId?: string): ChangeFlashState {
  const reducedMotion = useReducedMotionPreference();
  const previousTurn = useRef(isCurrentTurn);
  const previousRoomId = useRef(roomId);
  const sequence = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const [starting, setStarting] = useState<ChangeFlashState>({ active: false, sequence: 0 });

  useLayoutEffect(() => {
    if (roomId !== previousRoomId.current) {
      previousRoomId.current = roomId;
      previousTurn.current = isCurrentTurn;
      setStarting({ active: false, sequence: sequence.current });
      window.clearTimeout(timer.current);
      return;
    }
    if (isCurrentTurn && !previousTurn.current) {
      sequence.current += 1;
      const activeSequence = sequence.current;
      setStarting({ active: true, sequence: activeSequence });
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        if (sequence.current !== activeSequence) return;
        setStarting((current) => current.sequence === activeSequence ? { ...current, active: false } : current);
      }, reducedMotion ? 180 : 700);
      previousTurn.current = isCurrentTurn;
      return;
    }
    previousTurn.current = isCurrentTurn;
  }, [isCurrentTurn, roomId, reducedMotion]);

  useEffect(() => {
    if (!reducedMotion || !starting.active) return;
    const activeSequence = starting.sequence;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (sequence.current !== activeSequence) return;
      setStarting((current) => current.sequence === activeSequence ? { ...current, active: false } : current);
    }, 180);
  }, [reducedMotion, starting.active, starting.sequence]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return starting;
}
