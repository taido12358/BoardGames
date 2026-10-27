import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotionPreference } from "../../hooks/useReducedMotionPreference";
import type { BangPublicPlayer } from "./types";
import { resolveLogPlayerByCardChange } from "./resolveLogPlayer";

export interface DefenseFlash {
  playerId: string;
  playerName: string;
  key: number;
}

const DEFENSE_DURATION_MS = 620;
const DEFENSE_PATTERNS = [
  /^(.+?) sử dụng Trượt!\.$/,
  /^(.+?) bỏ Bang! để né Người da đỏ!\.$/,
  /^(.+?) đỡ được nhờ Thùng rượu!$/,
];

/** Keep every newly confirmed defense visible until its own shield beat ends. */
export function useDefenseFlash(gameLog: string[], players: readonly BangPublicPlayer[], roomId?: string): readonly DefenseFlash[] {
  const reducedMotion = useReducedMotionPreference();
  const previousLength = useRef(gameLog.length);
  const previousRoomId = useRef(roomId);
  const previousCardCounts = useRef(new Map(players.map((player) => [player.id, player.cardCount])));
  const sequence = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const expiries = useRef(new Map<number, number>());
  const [flashes, setFlashes] = useState<DefenseFlash[]>([]);

  const scheduleCleanup = useCallback(function armNextExpiry() {
    window.clearTimeout(timer.current);
    const nextExpiry = Math.min(...expiries.current.values());
    if (!Number.isFinite(nextExpiry)) return;
    timer.current = window.setTimeout(() => {
      const now = performance.now();
      for (const [key, expiry] of expiries.current) {
        if (expiry <= now) expiries.current.delete(key);
      }
      setFlashes((current) => current.filter(({ key }) => expiries.current.has(key)));
      armNextExpiry();
    }, Math.max(0, nextExpiry - performance.now()));
  }, []);

  useLayoutEffect(() => {
    if (roomId !== previousRoomId.current) {
      previousRoomId.current = roomId;
      previousLength.current = gameLog.length;
      previousCardCounts.current = new Map(players.map((player) => [player.id, player.cardCount]));
      expiries.current.clear();
      setFlashes([]);
      window.clearTimeout(timer.current);
      return;
    }

    const newEntries = gameLog.slice(previousLength.current);
    previousLength.current = gameLog.length;
    if (!newEntries.length) return;

    const now = performance.now();
    const flashDuration = reducedMotion ? 180 : DEFENSE_DURATION_MS;
    const incoming: DefenseFlash[] = [];
    for (const entry of newEntries) {
      const patternIndex = DEFENSE_PATTERNS.findIndex((pattern) => pattern.test(entry));
      if (patternIndex < 0) continue;
      const defender = entry.match(DEFENSE_PATTERNS[patternIndex])?.[1];
      if (!defender) continue;
      const direction = patternIndex === 2 ? "increase" : "decrease";
      const player = resolveLogPlayerByCardChange(defender, players, previousCardCounts.current, direction);
      if (!player) continue;
      const key = ++sequence.current;
      incoming.push({ playerId: player.id, playerName: player.name, key });
      expiries.current.set(key, now + flashDuration);
    }
    previousCardCounts.current = new Map(players.map((player) => [player.id, player.cardCount]));
    if (!incoming.length) return;

    setFlashes((current) => [
      ...current.filter(({ key }) => expiries.current.has(key)),
      ...incoming,
    ]);
    scheduleCleanup();
  }, [gameLog, players, roomId, scheduleCleanup, reducedMotion]);

  useEffect(() => {
    if (!reducedMotion || !expiries.current.size) return;
    const expiresAt = performance.now() + 180;
    for (const key of expiries.current.keys()) expiries.current.set(key, expiresAt);
    scheduleCleanup();
  }, [reducedMotion, scheduleCleanup]);

  useEffect(() => () => window.clearTimeout(timer.current), []);
  return flashes;
}
