import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Card } from "./types";
import { useReducedMotionPreference } from "../../hooks/useReducedMotionPreference";

/** Track only newly received card ids so existing cards do not replay their entrance. */
export function useNewHandCards(hand: Card[], roomId?: string, animationLifetimeMs = 700): ReadonlySet<string> {
  const reducedMotion = useReducedMotionPreference();
  const previousIds = useRef(new Set(hand.map((card) => card.id)));
  const previousRoomId = useRef(roomId);
  const [newIds, setNewIds] = useState<ReadonlySet<string>>(new Set());
  const timer = useRef<number | undefined>(undefined);
  const expirations = useRef(new Map<string, number>());

  const scheduleExpiry = useCallback(() => {
    window.clearTimeout(timer.current);
    const nextExpiry = Math.min(...expirations.current.values());
    if (!Number.isFinite(nextExpiry)) return;
    timer.current = window.setTimeout(() => {
      const now = performance.now();
      for (const [id, expiry] of expirations.current) {
        if (expiry <= now) expirations.current.delete(id);
      }
      setNewIds(new Set(expirations.current.keys()));
      scheduleExpiry();
    }, Math.max(0, nextExpiry - performance.now()));
  }, []);

  useLayoutEffect(() => {
    const currentIds = new Set(hand.map((card) => card.id));
    if (roomId !== previousRoomId.current) {
      previousRoomId.current = roomId;
      previousIds.current = currentIds;
      expirations.current.clear();
      setNewIds(new Set());
      window.clearTimeout(timer.current);
      return;
    }
    const added = new Set([...currentIds].filter((id) => !previousIds.current.has(id)));
    previousIds.current = currentIds;
    let removed = false;
    for (const id of expirations.current.keys()) {
      if (!currentIds.has(id)) {
        expirations.current.delete(id);
        removed = true;
      }
    }

    if (!added.size) {
      if (removed) {
        setNewIds(new Set(expirations.current.keys()));
        scheduleExpiry();
      }
      return;
    }
    const expiry = performance.now() + (reducedMotion ? 180 : animationLifetimeMs);
    for (const id of added) expirations.current.set(id, expiry);
    setNewIds(new Set(expirations.current.keys()));
    scheduleExpiry();
  }, [hand, roomId, reducedMotion, animationLifetimeMs, scheduleExpiry]);

  useEffect(() => {
    if (!reducedMotion || !expirations.current.size) return;
    const reducedExpiry = performance.now() + 180;
    for (const [id, expiry] of expirations.current) {
      expirations.current.set(id, Math.min(expiry, reducedExpiry));
    }
    scheduleExpiry();
  }, [reducedMotion, scheduleExpiry]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return newIds;
}
