import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { DAN_INDICES, isQuanPit, type Direction, type GameState, type Side } from "./types";
import { useReducedMotionPreference } from "../../hooks/useReducedMotionPreference";

export interface SowingStep {
  from: number;
  to: number;
}

export interface SowingAnimation {
  id: number;
  startedAt: number;
  captureSequence?: number;
  start: number;
  direction: Direction;
  steps: SowingStep[];
  capture: { pit: number; count: number; scoreIndex: number } | null;
  settlements: { pit: number; count: number; scoreIndex: number }[];
  refills: { pit: number; scoreIndex: number }[];
}

export const CAPTURE_FLIGHT_DURATION_MS = 820;
export const CAPTURE_FLIGHT_GAP_MS = 72;
export const CAPTURE_AFTER_SOW_MS = 80;
export const SETTLEMENT_AFTER_CAPTURE_MS = 120;

/** Duration from event creation until the last capture, settlement, or refill score cue. */
export function sowingScoreRevealDuration(animation: SowingAnimation): number {
  const timing = sowingTiming(animation.steps.length);
  const sowEndMs = Math.max(0, animation.steps.length - 1) * timing.gapMs + timing.durationMs;
  const captureEndMs = animation.capture
    ? sowEndMs + CAPTURE_AFTER_SOW_MS + CAPTURE_FLIGHT_DURATION_MS
    : 0;
  const settlementStartMs = sowEndMs + CAPTURE_AFTER_SOW_MS
    + (animation.capture ? CAPTURE_FLIGHT_DURATION_MS + SETTLEMENT_AFTER_CAPTURE_MS : 0);
  const settlementEndMs = animation.settlements.length
    ? settlementStartMs + (animation.settlements.length - 1) * CAPTURE_FLIGHT_GAP_MS + CAPTURE_FLIGHT_DURATION_MS
    : 0;
  const refillEndMs = animation.refills.length
    ? sowEndMs + CAPTURE_AFTER_SOW_MS + (animation.refills.length - 1) * 64 + 180
    : 0;
  return Math.max(sowEndMs, captureEndMs, settlementEndMs, refillEndMs);
}

export function sowingTiming(stepCount: number) {
  const gapMs = Math.min(105, 3900 / Math.max(1, stepCount));
  return { gapMs, durationMs: Math.max(130, Math.min(190, gapMs * 1.45)) };
}

/** Delay from event creation until a changed pit reaches its last confirmed value. */
export function sowingPitRevealDuration(animation: SowingAnimation, pitIndex: number): number | null {
  const timing = sowingTiming(animation.steps.length);
  const sowEndMs = Math.max(0, animation.steps.length - 1) * timing.gapMs + timing.durationMs;
  const refillIndex = animation.refills.findIndex((refill) => refill.pit === pitIndex);
  if (refillIndex >= 0) return sowEndMs + CAPTURE_AFTER_SOW_MS + refillIndex * 64 + 180;
  const settlementIndex = animation.settlements.findIndex((settlement) => settlement.pit === pitIndex);
  if (settlementIndex >= 0) {
    const captureEndMs = animation.capture ? CAPTURE_FLIGHT_DURATION_MS + SETTLEMENT_AFTER_CAPTURE_MS : 0;
    return sowEndMs + CAPTURE_AFTER_SOW_MS + captureEndMs + settlementIndex * CAPTURE_FLIGHT_GAP_MS;
  }
  if (animation.capture?.pit === pitIndex) return sowEndMs + CAPTURE_AFTER_SOW_MS;
  const lastSeedIndex = animation.steps.reduce(
    (last, step, stepIndex) => step.to === pitIndex ? stepIndex : last,
    -1,
  );
  return lastSeedIndex >= 0 ? lastSeedIndex * timing.gapMs + timing.durationMs : null;
}

function nextPit(index: number, direction: Direction): number {
  return (index + (direction === "cw" ? 1 : 11)) % 12;
}

function copyState(state: GameState): GameState {
  return {
    ...state,
    pits: [...state.pits],
    scores: [state.scores[0], state.scores[1]],
    quanCaptured: [state.quanCaptured[0], state.quanCaptured[1]],
  };
}

/** Mirror the deterministic server move only to reconstruct a confirmed move's travel path. */
function simulate(state: GameState, start: number, direction: Direction): {
  state: GameState;
  steps: SowingStep[];
  capture: SowingAnimation["capture"];
  settlements: SowingAnimation["settlements"];
  refills: SowingAnimation["refills"];
} | null {
  const result = copyState(state);
  let stonesInHand = result.pits[start];
  if (stonesInHand <= 0) return null;
  result.pits[start] = 0;
  let current = start;
  const steps: SowingStep[] = [];
  let capture: SowingAnimation["capture"] = null;
  const settlements: SowingAnimation["settlements"] = [];
  const refills: SowingAnimation["refills"] = [];
  let guard = 0;

  while (stonesInHand > 0 && guard < 2000) {
    guard += 1;
    const from = current;
    current = nextPit(current, direction);
    result.pits[current] += 1;
    steps.push({ from, to: current });
    stonesInHand -= 1;
    if (stonesInHand > 0) continue;
    if (isQuanPit(current)) break;
    if (result.pits[current] >= 2) {
      stonesInHand = result.pits[current];
      result.pits[current] = 0;
      continue;
    }

    const captureTarget = nextPit(current, direction);
    if (result.pits[captureTarget] > 0) {
      const scoreIndex = state.turn === "P0" ? 0 : 1;
      capture = { pit: captureTarget, count: result.pits[captureTarget], scoreIndex };
      result.scores[scoreIndex] += result.pits[captureTarget];
      result.pits[captureTarget] = 0;
      if (isQuanPit(captureTarget)) result.quanCaptured[captureTarget === 0 ? 0 : 1] = true;
    }
  }
  if (guard >= 2000) return null;

  if (result.quanCaptured[0] && result.quanCaptured[1]) {
    finishGame(result, settlements);
  } else {
    result.turn = state.turn === "P0" ? "P1" : "P0";
    const nextSide: Side = result.turn;
    const sidePits = DAN_INDICES[nextSide];
    if (sidePits.every((index) => result.pits[index] === 0)) {
      const scoreIndex = nextSide === "P0" ? 0 : 1;
      if (result.scores[scoreIndex] >= 5) {
        result.scores[scoreIndex] -= 5;
        for (const index of sidePits) {
          result.pits[index] = 1;
          refills.push({ pit: index, scoreIndex });
        }
      } else {
        finishGame(result, settlements);
      }
    }
  }
  return { state: result, steps, capture, settlements, refills };
}

/** Preview the exact confirmed sowing path for a selected pit and direction. */
export function previewSowingPath(state: GameState, start: number, direction: Direction): SowingStep[] {
  return simulate(state, start, direction)?.steps ?? [];
}

function finishGame(state: GameState, settlements: SowingAnimation["settlements"]) {
  for (const side of ["P0", "P1"] as const) {
    const scoreIndex = side === "P0" ? 0 : 1;
    for (const index of DAN_INDICES[side]) {
      if (state.pits[index] > 0) settlements.push({ pit: index, count: state.pits[index], scoreIndex });
      state.scores[scoreIndex] += state.pits[index];
      state.pits[index] = 0;
    }
  }
  state.winner = state.scores[0] === state.scores[1]
    ? "DRAW"
    : state.scores[0] > state.scores[1] ? "P0" : "P1";
}

function sameState(left: GameState, right: GameState): boolean {
  return left.turn === right.turn
    && left.winner === right.winner
    && left.pits.every((value, index) => value === right.pits[index])
    && left.scores.every((value, index) => value === right.scores[index])
    && left.quanCaptured.every((value, index) => value === right.quanCaptured[index]);
}

function inferMove(previous: GameState, current: GameState): Omit<SowingAnimation, "id" | "startedAt"> | null {
  const confirmedMove = current.lastMove;
  if (confirmedMove && confirmedMove.sequence !== previous.lastMove?.sequence) {
    const simulation = simulate(previous, confirmedMove.pitIndex, confirmedMove.direction);
    if (!simulation || !sameState(simulation.state, current)) return null;
    return {
      start: confirmedMove.pitIndex,
      direction: confirmedMove.direction,
      steps: simulation.steps,
      capture: simulation.capture,
      settlements: simulation.settlements,
      refills: simulation.refills,
    };
  }

  const matches: Omit<SowingAnimation, "id" | "startedAt">[] = [];
  const sidePits = DAN_INDICES[previous.turn];
  for (const start of sidePits) {
    if (previous.pits[start] <= 0) continue;
    for (const direction of ["cw", "ccw"] as const) {
      const simulation = simulate(previous, start, direction);
      if (simulation && sameState(simulation.state, current)) {
        matches.push({ start, direction, steps: simulation.steps, capture: simulation.capture, settlements: simulation.settlements, refills: simulation.refills });
      }
    }
  }
  return matches.length === 1 ? matches[0] : null;
}

/** Reconstruct every confirmed sowing move, including remote players and relay sowing. */
export function useSowingAnimation(state: GameState | undefined, roomId: string | undefined, playing: boolean): readonly SowingAnimation[] {
  const reducedMotion = useReducedMotionPreference();
  const previousState = useRef<GameState | null>(state ? copyState(state) : null);
  const previousRoomId = useRef(roomId);
  const previousPlaying = useRef(playing);
  const sequence = useRef(0);
  const captureSequences = useRef(new Map<number, number>());
  const timer = useRef<number | undefined>(undefined);
  const [animations, setAnimations] = useState<SowingAnimation[]>([]);
  const expiries = useRef(new Map<number, number>());

  const scheduleCleanup = useCallback(function armNextExpiry() {
    window.clearTimeout(timer.current);
    const nextExpiry = Math.min(...expiries.current.values());
    if (!Number.isFinite(nextExpiry)) return;
    timer.current = window.setTimeout(() => {
      const now = performance.now();
      for (const [id, expiry] of expiries.current) {
        if (expiry <= now) expiries.current.delete(id);
      }
      setAnimations((current) => current.filter(({ id }) => expiries.current.has(id)));
      armNextExpiry();
    }, Math.max(0, nextExpiry - performance.now()));
  }, []);

  useLayoutEffect(() => {
    if (roomId !== previousRoomId.current) {
      previousRoomId.current = roomId;
      previousState.current = state ? copyState(state) : null;
      previousPlaying.current = playing;
      setAnimations([]);
      expiries.current.clear();
      captureSequences.current.clear();
      window.clearTimeout(timer.current);
      return;
    }

    const oldState = previousState.current;
    previousState.current = state ? copyState(state) : null;
    if (!state || !oldState || !previousPlaying.current || oldState.winner) {
      previousPlaying.current = playing;
      return;
    }
    const move = inferMove(oldState, state);
    previousPlaying.current = playing;
    if (!move) return;

    const id = ++sequence.current;
    const startedAt = performance.now();
    const captureSequence = move.capture
      ? (captureSequences.current.get(move.capture.pit) ?? 0) + 1
      : undefined;
    if (move.capture) captureSequences.current.set(move.capture.pit, captureSequence!);
    const animation = { ...move, id, startedAt, captureSequence };
    const { gapMs, durationMs: sowDurationMs } = sowingTiming(move.steps.length);
    const sowEndMs = Math.max(0, move.steps.length - 1) * gapMs + sowDurationMs;
    const captureEndMs = move.capture
      ? sowEndMs + CAPTURE_AFTER_SOW_MS + CAPTURE_FLIGHT_DURATION_MS
      : sowEndMs;
    const settlementStartMs = sowEndMs + CAPTURE_AFTER_SOW_MS
      + (move.capture ? CAPTURE_FLIGHT_DURATION_MS + SETTLEMENT_AFTER_CAPTURE_MS : 0);
    const settlementEndMs = move.settlements.length
      ? settlementStartMs + (move.settlements.length - 1) * CAPTURE_FLIGHT_GAP_MS + CAPTURE_FLIGHT_DURATION_MS
      : captureEndMs;
    const refillEndMs = move.refills.length
      ? sowEndMs + 80 + (move.refills.length - 1) * 64 + 180
      : sowEndMs;
    const animationLifetime = reducedMotion
      ? 450
      : Math.max(4400, sowEndMs + 500, refillEndMs + 150, settlementEndMs + 900);
    expiries.current.set(id, performance.now() + animationLifetime);
    setAnimations((current) => [...current.filter(({ id: activeId }) => expiries.current.has(activeId)), animation]);
    scheduleCleanup();
  }, [state, roomId, playing, reducedMotion, scheduleCleanup]);

  useEffect(() => {
    if (!reducedMotion || !expiries.current.size) return;
    const reducedExpiry = performance.now() + 450;
    for (const [id, expiry] of expiries.current) {
      expiries.current.set(id, Math.min(expiry, reducedExpiry));
    }
    scheduleCleanup();
  }, [reducedMotion, scheduleCleanup]);

  useEffect(() => () => window.clearTimeout(timer.current), []);
  return animations;
}
