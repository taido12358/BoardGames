import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotionPreference } from "../../hooks/useReducedMotionPreference";

const ELIMINATION_FLASH_MS = 820;

/** Flash once when a live player is eliminated; initial dead snapshots stay quiet. */
export function useEliminationFlash(alive: boolean, roomId?: string): boolean {
  const reducedMotion = useReducedMotionPreference();
  const previousAlive = useRef(alive);
  const previousRoomId = useRef(roomId);
  const sequence = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const [eliminated, setEliminated] = useState(false);

  useLayoutEffect(() => {
    if (roomId !== previousRoomId.current) {
      previousRoomId.current = roomId;
      previousAlive.current = alive;
      sequence.current += 1;
      setEliminated(false);
      window.clearTimeout(timer.current);
      return;
    }

    if (previousAlive.current && !alive) {
      sequence.current += 1;
      const activeSequence = sequence.current;
      setEliminated(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        if (sequence.current === activeSequence) setEliminated(false);
      }, reducedMotion ? 180 : ELIMINATION_FLASH_MS);
    }
    previousAlive.current = alive;
  }, [alive, roomId, reducedMotion]);

  useEffect(() => {
    if (!reducedMotion || !eliminated) return;
    const activeSequence = sequence.current;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (sequence.current === activeSequence) setEliminated(false);
    }, 180);
  }, [reducedMotion, eliminated]);

  useEffect(() => () => window.clearTimeout(timer.current), []);
  return eliminated;
}
