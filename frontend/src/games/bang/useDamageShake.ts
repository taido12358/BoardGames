import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ChangeFlashState } from "../useChangeFlash";
import { useReducedMotionPreference } from "../../hooks/useReducedMotionPreference";

const SHAKE_DURATION_MS = 400;

/** Shake only after a confirmed HP drop; room snapshots do not count as damage. */
export function useDamageShake(hp: number, roomId?: string): ChangeFlashState {
  const reducedMotion = useReducedMotionPreference();
  const prevHp = useRef(hp);
  const previousRoomId = useRef(roomId);
  const sequence = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const [shaking, setShaking] = useState<ChangeFlashState>({ active: false, sequence: 0 });

  useLayoutEffect(() => {
    if (roomId !== previousRoomId.current) {
      previousRoomId.current = roomId;
      prevHp.current = hp;
      setShaking({ active: false, sequence: sequence.current });
      window.clearTimeout(timer.current);
      return;
    }
    if (hp < prevHp.current) {
      sequence.current += 1;
      const activeSequence = sequence.current;
      setShaking({ active: true, sequence: activeSequence });
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        if (sequence.current !== activeSequence) return;
        setShaking((current) => current.sequence === activeSequence ? { ...current, active: false } : current);
      }, reducedMotion ? 180 : SHAKE_DURATION_MS);
      prevHp.current = hp;
      return;
    }
    prevHp.current = hp;
  }, [hp, roomId, reducedMotion]);

  useEffect(() => {
    if (!reducedMotion || !shaking.active) return;
    const activeSequence = shaking.sequence;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (sequence.current !== activeSequence) return;
      setShaking((current) => current.sequence === activeSequence ? { ...current, active: false } : current);
    }, 180);
  }, [reducedMotion, shaking.active, shaking.sequence]);

  useEffect(() => () => window.clearTimeout(timer.current), []);
  return shaking;
}
