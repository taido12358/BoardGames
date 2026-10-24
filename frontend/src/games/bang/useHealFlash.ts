import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ChangeFlashState } from "../useChangeFlash";
import { useReducedMotionPreference } from "../../hooks/useReducedMotionPreference";

/** Briefly highlight HP recovery; initial room state never counts as a heal. */
export function useHealFlash(hp: number, roomId?: string): ChangeFlashState {
  const reducedMotion = useReducedMotionPreference();
  const previousHp = useRef(hp);
  const previousRoomId = useRef(roomId);
  const sequence = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const [healing, setHealing] = useState<ChangeFlashState>({ active: false, sequence: 0 });

  useLayoutEffect(() => {
    if (roomId !== previousRoomId.current) {
      previousRoomId.current = roomId;
      previousHp.current = hp;
      setHealing({ active: false, sequence: sequence.current });
      window.clearTimeout(timer.current);
      return;
    }
    if (hp > previousHp.current) {
      sequence.current += 1;
      const activeSequence = sequence.current;
      setHealing({ active: true, sequence: activeSequence });
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        if (sequence.current !== activeSequence) return;
        setHealing((current) => current.sequence === activeSequence ? { ...current, active: false } : current);
      }, reducedMotion ? 180 : 650);
      previousHp.current = hp;
      return;
    }
    previousHp.current = hp;
  }, [hp, roomId, reducedMotion]);

  useEffect(() => {
    if (!reducedMotion || !healing.active) return;
    const activeSequence = healing.sequence;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (sequence.current !== activeSequence) return;
      setHealing((current) => current.sequence === activeSequence ? { ...current, active: false } : current);
    }, 180);
  }, [reducedMotion, healing.active, healing.sequence]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return healing;
}
