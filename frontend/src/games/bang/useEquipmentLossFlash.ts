import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotionPreference } from "../../hooks/useReducedMotionPreference";

const EQUIPMENT_EXIT_MS = 520;

/** Keep each removed public equipment chip only through its own exit animation. */
export function useEquipmentLossFlash(items: string[], roomId?: string): ReadonlyMap<string, number> {
  const reducedMotion = useReducedMotionPreference();
  const previousItems = useRef(new Set(items));
  const previousRoomId = useRef(roomId);
  const timers = useRef(new Map<string, number>());
  const active = useRef(new Map<string, number>());
  const sequences = useRef(new Map<string, number>());
  const [removedItems, setRemovedItems] = useState<ReadonlyMap<string, number>>(new Map());

  useLayoutEffect(() => {
    const currentItems = new Set(items);
    if (roomId !== previousRoomId.current) {
      previousRoomId.current = roomId;
      previousItems.current = currentItems;
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current.clear();
      active.current = new Map();
      sequences.current.clear();
      setRemovedItems(new Map());
      return;
    }

    const removed = [...previousItems.current].filter((item) => !currentItems.has(item));
    previousItems.current = currentItems;
    let changed = false;

    for (const item of active.current.keys()) {
      if (!currentItems.has(item)) continue;
      const timer = timers.current.get(item);
      if (timer !== undefined) window.clearTimeout(timer);
      timers.current.delete(item);
      active.current.delete(item);
      changed = true;
    }

    for (const item of removed) {
      const oldTimer = timers.current.get(item);
      if (oldTimer !== undefined) window.clearTimeout(oldTimer);
      const sequence = (sequences.current.get(item) ?? 0) + 1;
      sequences.current.set(item, sequence);
      active.current.set(item, sequence);
      const duration = reducedMotion ? 180 : EQUIPMENT_EXIT_MS;
      timers.current.set(item, window.setTimeout(() => {
        if (active.current.get(item) !== sequence) return;
        timers.current.delete(item);
        active.current.delete(item);
        setRemovedItems(new Map(active.current));
      }, duration));
      changed = true;
    }

    if (changed) setRemovedItems(new Map(active.current));
  }, [items, roomId, reducedMotion]);

  useEffect(() => {
    if (!reducedMotion || !active.current.size) return;
    for (const [item, sequence] of active.current) {
      const timer = timers.current.get(item);
      if (timer !== undefined) window.clearTimeout(timer);
      timers.current.set(item, window.setTimeout(() => {
        if (active.current.get(item) !== sequence) return;
        timers.current.delete(item);
        active.current.delete(item);
        setRemovedItems(new Map(active.current));
      }, 180));
    }
  }, [reducedMotion]);

  useEffect(() => () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current.clear();
    active.current.clear();
  }, []);

  return removedItems;
}
