import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotionPreference } from "../../hooks/useReducedMotionPreference";

const HP_DELTA_DURATION_MS = 760;
interface HpDeltaState { value: number; sequence: number; }

/** Show the confirmed HP delta, without treating room changes as damage or healing. */
export function useHpDelta(hp: number, roomId?: string): HpDeltaState | null {
  const reducedMotion = useReducedMotionPreference();
  const previousHp = useRef(hp);
  const previousRoomId = useRef(roomId);
  const sequence = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const [delta, setDelta] = useState<HpDeltaState | null>(null);

  useLayoutEffect(() => {
    if (roomId !== previousRoomId.current) {
      previousRoomId.current = roomId;
      previousHp.current = hp;
      setDelta(null);
      window.clearTimeout(timer.current);
      return;
    }

    const nextDelta = hp - previousHp.current;
    previousHp.current = hp;
    if (nextDelta === 0) return;
    sequence.current += 1;
    const nextSequence = sequence.current;

    setDelta((current) => {
      const totalDelta = (current?.value ?? 0) + nextDelta;
      return totalDelta === 0 ? null : { value: totalDelta, sequence: nextSequence };
    });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (sequence.current === nextSequence) setDelta(null);
    }, reducedMotion ? 180 : HP_DELTA_DURATION_MS);
  }, [hp, roomId, reducedMotion]);

  useEffect(() => {
    if (!reducedMotion || delta === null) return;
    const activeSequence = delta.sequence;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (sequence.current === activeSequence) setDelta(null);
    }, 180);
  }, [reducedMotion, delta]);

  useEffect(() => () => window.clearTimeout(timer.current), []);
  return delta;
}
