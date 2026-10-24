import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotionPreference } from "../../hooks/useReducedMotionPreference";
import type { BangPublicPlayer } from "./types";
import { resolveLogPlayer } from "./resolveLogPlayer";

export interface DuelLossFlash {
  playerId: string;
  playerName: string;
  key: number;
}

const DUEL_FLASH_MS = 720;

/** Animate every confirmed duel loss observed between snapshots, by player ID. */
export function useDuelLossFlash(gameLog: string[], players: readonly BangPublicPlayer[], roomId?: string): readonly DuelLossFlash[] {
  const reducedMotion = useReducedMotionPreference();
  const previousLength = useRef(gameLog.length);
  const previousRoomId = useRef(roomId);
  const previousCardCounts = useRef(new Map(players.map((player) => [player.id, player.cardCount])));
  const sequence = useRef(0);
  const timers = useRef(new Map<string, number>());
  const active = useRef(new Map<string, DuelLossFlash>());
  const [flashes, setFlashes] = useState<readonly DuelLossFlash[]>([]);

  useLayoutEffect(() => {
    if (roomId !== previousRoomId.current) {
      previousRoomId.current = roomId;
      previousLength.current = gameLog.length;
      previousCardCounts.current = new Map(players.map((player) => [player.id, player.cardCount]));
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current.clear();
      active.current.clear();
      setFlashes([]);
      return;
    }

    const newEntries = gameLog.slice(previousLength.current);
    previousLength.current = gameLog.length;
    const losses = newEntries.flatMap((entry) => {
      const playerName = entry.match(/^(.+?) thua .+\.$/)?.[1];
      if (!playerName) return [];
      const player = resolveLogPlayer(playerName, players, previousCardCounts.current);
      return player ? [player] : [];
    });
    previousCardCounts.current = new Map(players.map((player) => [player.id, player.cardCount]));
    if (!losses.length) return;

    const next = new Map(active.current);
    const flashDuration = reducedMotion ? 180 : DUEL_FLASH_MS;
    for (const player of losses) {
      const { id: playerId, name: playerName } = player;
      const previousTimer = timers.current.get(playerId);
      if (previousTimer !== undefined) window.clearTimeout(previousTimer);
      const flash = { playerId, playerName, key: ++sequence.current };
      next.set(playerId, flash);
      timers.current.set(playerId, window.setTimeout(() => {
        if (active.current.get(playerId)?.key !== flash.key) return;
        timers.current.delete(playerId);
        const remaining = new Map(active.current);
        remaining.delete(playerId);
        active.current = remaining;
        setFlashes([...remaining.values()]);
      }, flashDuration));
    }
    active.current = next;
    setFlashes([...next.values()]);
  }, [gameLog, players, roomId, reducedMotion]);

  useEffect(() => {
    if (!reducedMotion || !active.current.size) return;
    for (const [playerId, flash] of active.current) {
      const timer = timers.current.get(playerId);
      if (timer !== undefined) window.clearTimeout(timer);
      timers.current.set(playerId, window.setTimeout(() => {
        if (active.current.get(playerId)?.key !== flash.key) return;
        timers.current.delete(playerId);
        const remaining = new Map(active.current);
        remaining.delete(playerId);
        active.current = remaining;
        setFlashes([...remaining.values()]);
      }, 180));
    }
  }, [reducedMotion]);

  useEffect(() => () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current.clear();
    active.current.clear();
  }, []);

  return flashes;
}
