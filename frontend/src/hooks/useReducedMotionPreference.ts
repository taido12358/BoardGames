import { useSyncExternalStore } from "react";

const subscribers = new Set<() => void>();
let motionQuery: MediaQueryList | null = null;

function query(): MediaQueryList | null {
  if (motionQuery) return motionQuery;
  if (typeof window === "undefined" || !window.matchMedia) return null;
  motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  return motionQuery;
}

function snapshot(): boolean {
  return query()?.matches ?? false;
}

function notifySubscribers() {
  subscribers.forEach((subscriber) => subscriber());
}

function subscribe(subscriber: () => void): () => void {
  const media = query();
  if (!media) return () => undefined;
  subscribers.add(subscriber);
  if (subscribers.size === 1) {
    media.addEventListener?.("change", notifySubscribers);
    if (!media.addEventListener) media.addListener?.(notifySubscribers);
  }
  return () => {
    subscribers.delete(subscriber);
    if (subscribers.size === 0) {
      media.removeEventListener?.("change", notifySubscribers);
      if (!media.removeEventListener) media.removeListener?.(notifySubscribers);
    }
  };
}

/** Share one system preference listener across active game and room cues. */
export function useReducedMotionPreference(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
