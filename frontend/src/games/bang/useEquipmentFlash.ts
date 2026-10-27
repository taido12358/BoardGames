import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotionPreference } from "../../hooks/useReducedMotionPreference";
import type { ChangeFlashState } from "../useChangeFlash";

const EQUIPMENT_ENTER_MS = 650;

/** Keep each newly equipped chip alive through its own animation window. */
export function useEquipmentFlashState(items: string[], roomId?: string): ReadonlyMap<string, ChangeFlashState> {
  const reducedMotion = useReducedMotionPreference();
  const previousItems = useRef(new Set(items));
  const previousRoomId = useRef(roomId);
  const sequence = useRef(0);
  const timers = useRef(new Map<string, number>());
  const activeItems = useRef<ReadonlyMap<string, ChangeFlashState>>(new Map());
  const [addedItems, setAddedItems] = useState<ReadonlyMap<string, ChangeFlashState>>(new Map());

  useLayoutEffect(() => {
    const currentItems = new Set(items);
    if (roomId !== previousRoomId.current) {
      previousRoomId.current = roomId;
      previousItems.current = currentItems;
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current.clear();
      activeItems.current = new Map();
      setAddedItems(new Map());
      return;
    }

    const added = [...currentItems].filter((item) => !previousItems.current.has(item));
    previousItems.current = currentItems;
    if (!added.length) return;

    const next = new Map(activeItems.current);
    for (const item of added) {
      const oldTimer = timers.current.get(item);
      if (oldTimer !== undefined) window.clearTimeout(oldTimer);
      const itemSequence = ++sequence.current;
      next.set(item, { active: true, sequence: itemSequence });
      timers.current.set(item, window.setTimeout(() => {
        if (activeItems.current.get(item)?.sequence !== itemSequence) return;
        timers.current.delete(item);
        const remaining = new Map(activeItems.current);
        remaining.delete(item);
        activeItems.current = remaining;
        setAddedItems(remaining);
      }, reducedMotion ? 180 : EQUIPMENT_ENTER_MS));
    }
    activeItems.current = next;
    setAddedItems(next);
  }, [items, roomId, reducedMotion]);

  useEffect(() => {
    if (!reducedMotion || !activeItems.current.size) return;
    for (const [item, itemState] of activeItems.current) {
      const timer = timers.current.get(item);
      if (timer !== undefined) window.clearTimeout(timer);
      timers.current.set(item, window.setTimeout(() => {
        if (activeItems.current.get(item)?.sequence !== itemState.sequence) return;
        timers.current.delete(item);
        const remaining = new Map(activeItems.current);
        remaining.delete(item);
        activeItems.current = remaining;
        setAddedItems(remaining);
      }, 180));
    }
  }, [reducedMotion]);

  useEffect(() => () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current.clear();
    activeItems.current = new Map();
  }, []);

  return addedItems;
}

/** Boolean-set compatibility API for places that only need to know which chips entered. */
export function useEquipmentFlash(items: string[], roomId?: string): ReadonlySet<string> {
  return new Set(useEquipmentFlashState(items, roomId).keys());
}
