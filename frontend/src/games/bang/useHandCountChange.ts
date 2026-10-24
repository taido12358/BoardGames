import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotionPreference } from "../../hooks/useReducedMotionPreference";

export interface HandCountChange { kind: "draw" | "loss"; amount: number; sequence: number; }
const HAND_COUNT_FLASH_MS = 820;

/** Pulse public hand counts when a card is drawn, stolen, played, or discarded. */
export function useHandCountChange(count: number, roomId?: string): HandCountChange | null {
  const reducedMotion = useReducedMotionPreference();
  const previousCount = useRef(count);
  const previousRoomId = useRef(roomId);
  const sequence = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const [change, setChange] = useState<HandCountChange | null>(null);

  useLayoutEffect(() => {
    if (roomId !== previousRoomId.current) {
      previousRoomId.current = roomId;
      previousCount.current = count;
      setChange(null);
      window.clearTimeout(timer.current);
      return;
    }
    if (count === previousCount.current) return;
    const nextDelta = count - previousCount.current;
    previousCount.current = count;
    sequence.current += 1;
    const nextSequence = sequence.current;
    setChange((current) => {
      const totalDelta = (current?.kind === "draw" ? current.amount : -(current?.amount ?? 0)) + nextDelta;
      if (totalDelta === 0) return null;
      return { kind: totalDelta > 0 ? "draw" : "loss", amount: Math.abs(totalDelta), sequence: nextSequence };
    });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (sequence.current === nextSequence) setChange(null);
    }, reducedMotion ? 180 : HAND_COUNT_FLASH_MS);
  }, [count, roomId, reducedMotion]);

  useEffect(() => {
    if (!reducedMotion || change === null) return;
    const activeSequence = change.sequence;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (sequence.current === activeSequence) setChange(null);
    }, 180);
  }, [reducedMotion, change]);

  useEffect(() => () => window.clearTimeout(timer.current), []);
  return change;
}
