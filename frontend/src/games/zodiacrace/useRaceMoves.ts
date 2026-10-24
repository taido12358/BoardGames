import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotionPreference } from "../../hooks/useReducedMotionPreference";

export interface RaceMove {
  from: number;
  to: number;
  revealDelayMs?: number;
  cratesFrom: number;
  cratesTo: number;
  crateSequence: number;
}

export const MAX_RACE_DURATION_MS = 1250;
export const RACE_MOVE_GRACE_MS = 60;
export const RACE_ROLL_REVEAL_MS = 520;
export const RACER_ARRIVAL_ANIMATION_MS = 480;
export const RACE_CRATE_PICKUP_DELAY_RATIO = 0.76;
export const RACE_CRATE_PICKUP_DURATION_MS = 580;
export const RACE_CRATE_DELIVERY_DURATION_MS = 240;
export const RACE_CRATE_COUNT_FLASH_DURATION_MS = 500;
export const RACE_LANDING_RING_DELAY_RATIO = 0.84;
export const RACE_LANDING_RING_DURATION_MS = 340;

export function raceDurationMs(from: number, to: number): number {
  return Math.min(MAX_RACE_DURATION_MS, Math.max(430, Math.abs(to - from) * 150));
}

function moveLifetime(move: RaceMove, reducedMotion: boolean): number {
  if (reducedMotion) return 160;
  const revealDelay = move.revealDelayMs ?? RACE_ROLL_REVEAL_MS;
  const movementDuration = raceDurationMs(move.from, move.to);
  const landingRingEnd = revealDelay
    + Math.round(movementDuration * RACE_LANDING_RING_DELAY_RATIO)
    + RACE_LANDING_RING_DURATION_MS;
  const cratePickupEnd = move.cratesTo > move.cratesFrom
    ? revealDelay + Math.round(movementDuration * RACE_CRATE_PICKUP_DELAY_RATIO)
      + Math.max(RACE_CRATE_PICKUP_DURATION_MS, RACE_CRATE_DELIVERY_DURATION_MS + RACE_CRATE_COUNT_FLASH_DURATION_MS)
    : 0;
  return Math.max(revealDelay + movementDuration, landingRingEnd, cratePickupEnd) + RACE_MOVE_GRACE_MS;
}

/** Keep each confirmed move briefly so the racer can travel between track tiles. */
export function useRaceMoves(positions: number[], roomId: string, cratesCollected: number[]): ReadonlyMap<number, RaceMove> {
  const reducedMotion = useReducedMotionPreference();
  const previous = useRef(positions);
  const previousCrates = useRef(cratesCollected);
  const previousRoomId = useRef(roomId);
  const crateSequences = useRef(new Map<number, number>());
  const timer = useRef<number | undefined>(undefined);
  const cleanupRevision = useRef(0);
  const expiresAt = useRef(new Map<number, number>());
  const queuedMoves = useRef(new Map<number, RaceMove[]>());
  const [moves, setMoves] = useState<ReadonlyMap<number, RaceMove>>(new Map());

  const scheduleCleanup = useCallback(() => {
    function armNextExpiry() {
      window.clearTimeout(timer.current);
      const nextExpiry = Math.min(...expiresAt.current.values());
      if (!Number.isFinite(nextExpiry)) return;
      const revision = ++cleanupRevision.current;
      timer.current = window.setTimeout(() => {
        if (cleanupRevision.current !== revision) return;
        const now = performance.now();
        const nextMoves = new Map<number, RaceMove>();
        for (const [seat, expiry] of expiresAt.current) {
          if (expiry > now) continue;
          expiresAt.current.delete(seat);
          const queue = queuedMoves.current.get(seat);
          const nextMove = queue?.shift();
          if (nextMove) {
            nextMoves.set(seat, nextMove);
            expiresAt.current.set(seat, now + moveLifetime(nextMove, reducedMotion));
          }
          if (!queue?.length) queuedMoves.current.delete(seat);
        }
        setMoves((current) => new Map([
          ...[...current].filter(([seat]) => expiresAt.current.has(seat)),
          ...nextMoves,
        ]));
        armNextExpiry();
      }, Math.max(0, nextExpiry - performance.now()));
    }
    armNextExpiry();
  }, [reducedMotion]);

  useLayoutEffect(() => {
    if (roomId !== previousRoomId.current) {
      previousRoomId.current = roomId;
      previous.current = positions;
      previousCrates.current = cratesCollected;
      crateSequences.current.clear();
      setMoves(new Map());
      expiresAt.current.clear();
      queuedMoves.current.clear();
      window.clearTimeout(timer.current);
      cleanupRevision.current += 1;
      return;
    }

    const nextMoves = new Map<number, RaceMove>();
    positions.forEach((position, seat) => {
      const from = previous.current[seat];
      if (from !== undefined && from !== position) {
        const cratesFrom = previousCrates.current[seat] ?? 0;
        const cratesTo = cratesCollected[seat] ?? cratesFrom;
        const crateSequence = cratesTo > cratesFrom
          ? (crateSequences.current.get(seat) ?? 0) + 1
          : crateSequences.current.get(seat) ?? 0;
        if (cratesTo > cratesFrom) crateSequences.current.set(seat, crateSequence);
        nextMoves.set(seat, {
          from,
          to: position,
          cratesFrom,
          cratesTo,
          crateSequence,
        });
      }
    });
    previous.current = positions;
    previousCrates.current = cratesCollected;
    if (!nextMoves.size) return;

    const now = performance.now();
    const activeMoves = new Map<number, RaceMove>();
    for (const [seat, move] of nextMoves) {
      const expiry = expiresAt.current.get(seat);
      if (expiry !== undefined && expiry > now) {
        const queue = queuedMoves.current.get(seat) ?? [];
        queue.push({ ...move, revealDelayMs: 0 });
        queuedMoves.current.set(seat, queue);
        continue;
      }
      const queue = queuedMoves.current.get(seat);
      const nextMove = queue?.length
        ? queue.shift()!
        : { ...move, revealDelayMs: reducedMotion ? 0 : RACE_ROLL_REVEAL_MS };
      if (queue?.length) queue.push({ ...move, revealDelayMs: 0 });
      if (!queue?.length) queuedMoves.current.delete(seat);
      expiresAt.current.set(seat, now + moveLifetime(nextMove, reducedMotion));
      activeMoves.set(seat, nextMove);
    }
    if (activeMoves.size) setMoves((current) => new Map([...current, ...activeMoves]));
    scheduleCleanup();
  }, [positions, cratesCollected, roomId, reducedMotion, scheduleCleanup]);

  useEffect(() => {
    if (!reducedMotion || !expiresAt.current.size) return;
    const reducedExpiry = performance.now() + 180;
    for (const [seat, expiry] of expiresAt.current) {
      expiresAt.current.set(seat, Math.min(expiry, reducedExpiry));
    }
    setMoves((current) => new Map([...current].map(([seat, move]) => [seat, { ...move, revealDelayMs: 0 }])));
    scheduleCleanup();
  }, [reducedMotion, scheduleCleanup]);

  useEffect(() => () => {
    cleanupRevision.current += 1;
    window.clearTimeout(timer.current);
  }, []);
  return moves;
}
