import { useEffect, useLayoutEffect, useMemo, useState, type MouseEvent } from "react";
import { useGameStore } from "../../platform/gameStore";
import { useCallback, useRef } from "react";
import {
  ConnectionBanner, DisconnectBadge, LeaveRoomButton, RematchButton, RoomErrorBanner, RoomStatusBanner,
} from "../../platform/RoomShell";
import { DAN_INDICES, QUAN_INDEX, isQuanPit, type Direction, type GameState, type Side } from "./types";
import { useChangedIndices } from "../useChangedIndices";
import { changeFlashClass, useChangeFlash } from "../useChangeFlash";
import { useValueDeltas } from "../useValueDeltas";
import { useReducedMotionPreference } from "../../hooks/useReducedMotionPreference";
import { useResizeRevision } from "../../hooks/useResizeRevision";
import {
  CAPTURE_AFTER_SOW_MS, CAPTURE_FLIGHT_DURATION_MS, CAPTURE_FLIGHT_GAP_MS,
  SETTLEMENT_AFTER_CAPTURE_MS, previewSowingPath, sowingPitRevealDuration, sowingScoreRevealDuration, sowingTiming, useSowingAnimation,
} from "./useSowingAnimation";
import AnimatedNumber from "../../components/AnimatedNumber";
import WaitingDots from "../../components/WaitingDots";

interface Props {
  makeMove: (roomId: string, move: unknown) => void;
  onLeave: () => void;
  onRematch: () => void;
  rematching: boolean;
}

interface SeedFlight {
  id: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  midX: number;
  midY: number;
  lateX: number;
  lateY: number;
  delayMs: number;
  durationMs: number;
}
interface CaptureFlight {
  id: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  midX: number;
  midY: number;
  count: number;
  delayMs: number;
}

/** "→"/"←" hiển thị trực quan theo hàng — hàng P1 xếp ngược (đi vòng quanh bàn) nên chiều "cw" logic đảo lại so với P0. */
function directionFor(side: Side, arrow: "left" | "right"): Direction {
  if (side === "P0") return arrow === "right" ? "cw" : "ccw";
  return arrow === "right" ? "ccw" : "cw";
}

function PitCell({
  index, count, selectable, selected, changed, changeSequence, rejectedSequence, animationDelayMs, previewStep, previewKey, previewLeaving = false, quanCaptured = false, captureSequence, onClick,
}: { index: number; count: number; selectable: boolean; selected: boolean; changed: boolean; changeSequence?: number; rejectedSequence?: number; animationDelayMs: number; previewStep?: number; previewKey?: string; previewLeaving?: boolean; quanCaptured?: boolean; captureSequence?: number; onClick: (event: MouseEvent<HTMLButtonElement>) => void }) {
  const quan = isQuanPit(index);
  const changeSuffix = changeSequence !== undefined && changeSequence % 2 === 0 ? "a" : "b";
  return (
    <button
      type="button"
      data-pit-index={index}
      disabled={!selectable}
      onClick={onClick}
      aria-pressed={selectable ? selected : undefined}
      aria-controls={selectable && selected ? "oanquan-direction-choice" : undefined}
      aria-expanded={selectable ? selected : undefined}
      aria-label={quan ? `Ô Quan, ${count} quân` : `Ô dân số ${index}, ${count} quân`}
      style={{ animationDelay: `${animationDelayMs}ms`, "--quan-capture-delay": `${animationDelayMs}ms` } as import("react").CSSProperties}
      className={`oanquan-pit relative flex flex-col items-center justify-center rounded-sm border-2 transition-all
        ${quan ? "w-16 h-full min-h-[5.5rem]" : "w-14 h-16 sm:w-16 sm:h-20"}
        ${selected ? "oanquan-pit-selected border-amber-400 bg-amber-900/40 -translate-y-1 shadow-[0_0_12px_rgba(251,191,36,0.5)]" : "border-lime-800/60 bg-[#1c2413] shadow-inner"}
        ${previewStep !== undefined ? "oanquan-preview-pit" : ""}
        ${selectable ? "oanquan-selectable cursor-pointer hover:border-lime-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300 active:scale-[0.97]" : "cursor-default opacity-90"}
        ${changed ? `animate-pit-update-${changeSuffix}` : ""}
        ${rejectedSequence !== undefined ? `animate-pit-rejected-${rejectedSequence % 2 === 0 ? "a" : "b"}` : ""}
        ${quanCaptured ? "oanquan-quan-captured" : ""}
        ${captureSequence !== undefined ? `oanquan-quan-capture-${captureSequence % 2 === 0 ? "a" : "b"}` : ""}
      `}
    >
      {previewStep !== undefined && <span key={`${previewKey}-${previewStep}`} aria-hidden="true" className={`oanquan-preview-step ${previewLeaving ? "is-leaving" : ""}`} style={{ "--preview-delay": `${Math.min(previewStep - 1, 9) * 34}ms` } as import("react").CSSProperties}>{previewStep}</span>}
      <span className={selected ? "oanquan-selected-count" : ""}>
        <AnimatedNumber value={count} durationMs={420} delayMs={animationDelayMs} style={{ animationDelay: `${animationDelayMs}ms` }} className={`font-bold ${changed ? `animate-pit-count-${changeSuffix}` : ""} ${quan ? "text-xl text-amber-200" : "text-base text-lime-100"}`} />
      </span>
      {quan && <span className={`oanquan-quan-status text-[10px] mt-0.5 ${quanCaptured ? "text-red-300/80" : "text-amber-400/70"}`}>{quanCaptured ? "ĐÃ BẮT" : "QUAN"}</span>}
    </button>
  );
}

export default function OAnQuanBoard({ makeMove, onLeave, onRematch, rematching }: Props) {
  const { room, mySide, error, connectionState } = useGameStore();
  const prefersReducedMotion = useReducedMotionPreference();
  const [selectedPit, setSelectedPit] = useState<number | null>(null);
  const [closingDirectionPit, setClosingDirectionPit] = useState<number | null>(null);
  const keyboardSelectedPit = useRef(false);
  const firstDirectionButton = useRef<HTMLButtonElement>(null);
  const [previewDirection, setPreviewDirection] = useState<Direction | null>(null);
  const pointerPreviewDirection = useRef<Direction | null>(null);
  const focusPreviewDirection = useRef<Direction | null>(null);
  const [previewLeaving, setPreviewLeaving] = useState(false);
  const previewExitTimer = useRef<number | undefined>(undefined);
  const previewExitRevision = useRef(0);
  const directionExitTimer = useRef<number | undefined>(undefined);
  const [pendingMove, setPendingMove] = useState(false);
  const [rejectedMove, setRejectedMove] = useState<{ pitIndex: number; direction: Direction; sequence: number } | null>(null);
  const currentState = room?.state as GameState | undefined;
  const ownsCurrentTurn = !!room && room.status === "Playing" && !!currentState && !currentState.winner && currentState.turn === mySide;
  const currentStateKey = currentState
    ? `${currentState.turn}|${currentState.pits.join(",")}|${currentState.scores.join(",")}|${currentState.quanCaptured.join(",")}|${currentState.winner ?? ""}`
    : "";
  const sowingAnimations = useSowingAnimation(currentState, room?.id, room?.status === "Playing");
  const [sowingClock, setSowingClock] = useState(0);
  useEffect(() => {
    if (!sowingAnimations.length || prefersReducedMotion) {
      setSowingClock(0);
      return;
    }
    const update = () => setSowingClock(performance.now());
    update();
    const timer = window.setInterval(update, 80);
    return () => window.clearInterval(timer);
  }, [sowingAnimations, prefersReducedMotion]);
  const activeSowing = useMemo(() => {
    if (!sowingClock || prefersReducedMotion) return null;
    const latest = [...sowingAnimations].sort((left, right) => right.startedAt - left.startedAt)[0];
    if (!latest) return null;
    const elapsed = sowingClock - latest.startedAt;
    const timing = sowingTiming(latest.steps.length);
    const sowEnd = Math.max(0, latest.steps.length - 1) * timing.gapMs + timing.durationMs;
    const revealDuration = sowingScoreRevealDuration(latest);
    if (elapsed < 0 || elapsed >= revealDuration) return null;
    const step = Math.min(latest.steps.length, Math.max(1, Math.floor(elapsed / timing.gapMs) + 1));
    let label = "Đang rải quân";
    if (elapsed >= sowEnd) {
      if (latest.capture && elapsed < sowEnd + CAPTURE_AFTER_SOW_MS + CAPTURE_FLIGHT_DURATION_MS) {
        label = "Đang ăn quân";
      } else if (latest.settlements.length) {
        label = "Đang thu quân cuối ván";
      } else if (latest.refills.length) {
        label = "Đang tiếp quân vào ô trống";
      }
    }
    return { label, step: `${step}/${latest.steps.length}`, progress: Math.min(100, Math.max(4, elapsed / Math.max(1, revealDuration) * 100)) };
  }, [sowingAnimations, sowingClock, prefersReducedMotion]);
  const quanCaptureSequences = useMemo(() => {
    const sequences = new Map<number, number>();
    for (const animation of sowingAnimations) {
      if (animation.capture) sequences.set(animation.capture.pit, animation.captureSequence ?? animation.id);
    }
    return sequences;
  }, [sowingAnimations]);
  const scoreRevealAt = useMemo(() => {
    if (prefersReducedMotion || !sowingAnimations.length) return 0;
    return Math.max(...sowingAnimations.map(
      (animation) => animation.startedAt + sowingScoreRevealDuration(animation),
    ));
  }, [prefersReducedMotion, sowingAnimations]);
  const scoreRevealDelay = useMemo(
    () => scoreRevealAt ? Math.max(0, scoreRevealAt - performance.now()) : 0,
    [scoreRevealAt],
  );
  const winnerRevealAt = !prefersReducedMotion && currentState?.winner && scoreRevealAt
    ? scoreRevealAt + 360
    : 0;
  const [resultReady, setResultReady] = useState(false);
  const winnerRevealTimer = useRef<number | undefined>(undefined);
  const winnerRevealRevision = useRef(0);
  useLayoutEffect(() => {
    const revision = ++winnerRevealRevision.current;
    window.clearTimeout(winnerRevealTimer.current);
    if (!currentState?.winner || winnerRevealAt === 0) {
      setResultReady(!!currentState?.winner);
      return;
    }
    setResultReady(false);
    winnerRevealTimer.current = window.setTimeout(
      () => {
        if (winnerRevealRevision.current === revision) setResultReady(true);
      },
      Math.max(0, winnerRevealAt - performance.now()),
    );
    return () => {
      if (winnerRevealRevision.current === revision) winnerRevealRevision.current += 1;
      window.clearTimeout(winnerRevealTimer.current);
    };
  }, [room?.id, currentState?.winner, winnerRevealAt]);
  const changedPits = useChangedIndices(currentState?.pits ?? [], Math.max(1400, scoreRevealDelay + 600), room?.id);
  const pitRevealDelays = useMemo(() => {
    const delays = new Map<number, number>();
    if (prefersReducedMotion || !changedPits.size) return delays;
    const now = performance.now();
    for (const index of changedPits.keys()) {
      const revealAt = Math.max(0, ...sowingAnimations.map((animation) => {
        const offset = sowingPitRevealDuration(animation, index);
        return offset === null ? 0 : animation.startedAt + offset;
      }));
      delays.set(index, Math.max(0, revealAt - now));
    }
    return delays;
  }, [changedPits, sowingAnimations, prefersReducedMotion]);
  const score0Changed = useChangeFlash(currentState?.scores[0], Math.max(550, scoreRevealDelay + 600), room?.id);
  const score1Changed = useChangeFlash(currentState?.scores[1], Math.max(550, scoreRevealDelay + 600), room?.id);
  const scoreDeltas = useValueDeltas(currentState?.scores ? [...currentState.scores] : [], room?.id, Math.max(900, scoreRevealDelay + 900));
  const turnChanged = useChangeFlash(currentState?.turn, 650, room?.id);
  const roomStatusChanged = useChangeFlash(room?.status, 500, room?.id);
  const previewSteps = selectedPit !== null && previewDirection && currentState
    ? previewSowingPath(currentState, selectedPit, previewDirection)
    : [];
  const previewOrder = new Map<number, number>();
  previewSteps.forEach(({ to }, index) => {
    if (!previewOrder.has(to)) previewOrder.set(to, index + 1);
  });
  const [seedFlights, setSeedFlights] = useState<SeedFlight[]>([]);
  const [captureFlights, setCaptureFlights] = useState<CaptureFlight[]>([]);
  const boardRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const layoutRevision = useResizeRevision(rootRef, !!room);
  const pendingMoveTimer = useRef<number | undefined>(undefined);
  const pendingMoveRevision = useRef(0);
  const rejectedMoveTimer = useRef<number | undefined>(undefined);
  const rejectedMoveRevision = useRef(0);
  const pendingStateKey = useRef("");
  const pendingError = useRef<string | null>(null);
  const pendingMoveAttempt = useRef<{ pitIndex: number; direction: Direction } | null>(null);
  const showPreview = (direction: Direction) => {
    window.clearTimeout(previewExitTimer.current);
    previewExitRevision.current += 1;
    previewExitTimer.current = undefined;
    setPreviewLeaving(false);
    setPreviewDirection(direction);
  };
  const fadePreview = () => {
    if (!previewDirection) return;
    window.clearTimeout(previewExitTimer.current);
    const revision = ++previewExitRevision.current;
    setPreviewLeaving(true);
    previewExitTimer.current = window.setTimeout(() => {
      if (previewExitRevision.current !== revision) return;
      setPreviewDirection(null);
      setPreviewLeaving(false);
      previewExitTimer.current = undefined;
    }, prefersReducedMotion ? 0 : 130);
  };
  const syncPreviewSources = () => {
    const direction = pointerPreviewDirection.current ?? focusPreviewDirection.current;
    if (direction) showPreview(direction);
    else fadePreview();
  };
  const clearPreview = () => {
    pointerPreviewDirection.current = null;
    focusPreviewDirection.current = null;
    window.clearTimeout(previewExitTimer.current);
    previewExitRevision.current += 1;
    previewExitTimer.current = undefined;
    setPreviewDirection(null);
    setPreviewLeaving(false);
  };
  const markMoveRejected = useCallback((pitIndex: number, direction: Direction) => {
    const revision = ++rejectedMoveRevision.current;
    setRejectedMove((current) => ({ pitIndex, direction, sequence: (current?.sequence ?? 0) + 1 }));
    setSelectedPit(pitIndex);
    showPreview(direction);
    window.clearTimeout(rejectedMoveTimer.current);
    rejectedMoveTimer.current = window.setTimeout(() => {
      if (rejectedMoveRevision.current === revision) setRejectedMove(null);
    }, prefersReducedMotion ? 180 : 600);
  }, [prefersReducedMotion]);
  useEffect(() => {
    if (!prefersReducedMotion || !rejectedMove) return;
    const revision = ++rejectedMoveRevision.current;
    window.clearTimeout(rejectedMoveTimer.current);
    rejectedMoveTimer.current = window.setTimeout(() => {
      if (rejectedMoveRevision.current === revision) setRejectedMove(null);
    }, 180);
  }, [prefersReducedMotion, rejectedMove]);
  useLayoutEffect(() => {
    setSelectedPit(null);
    setClosingDirectionPit(null);
    clearPreview();
    setPendingMove(false);
    setRejectedMove(null);
    pendingMoveAttempt.current = null;
    window.clearTimeout(pendingMoveTimer.current);
    pendingMoveRevision.current += 1;
    window.clearTimeout(rejectedMoveTimer.current);
    rejectedMoveRevision.current += 1;
    window.clearTimeout(previewExitTimer.current);
    previewExitRevision.current += 1;
    window.clearTimeout(directionExitTimer.current);
  }, [room?.id, currentState?.turn, room?.status, connectionState]);
  useEffect(() => {
    if (selectedPit === null || !keyboardSelectedPit.current) return;
    keyboardSelectedPit.current = false;
    firstDirectionButton.current?.focus();
  }, [selectedPit]);
  useEffect(() => () => {
    pendingMoveRevision.current += 1;
    rejectedMoveRevision.current += 1;
    previewExitRevision.current += 1;
    window.clearTimeout(pendingMoveTimer.current);
    window.clearTimeout(rejectedMoveTimer.current);
    window.clearTimeout(previewExitTimer.current);
    window.clearTimeout(directionExitTimer.current);
  }, []);
  useLayoutEffect(() => {
    if (!pendingMove) return;
    if (currentStateKey !== pendingStateKey.current || error !== pendingError.current || !room) {
      setPendingMove(false);
      window.clearTimeout(pendingMoveTimer.current);
      pendingMoveRevision.current += 1;
      if (error !== pendingError.current && currentStateKey === pendingStateKey.current && room && ownsCurrentTurn && connectionState === "connected") {
        const attempt = pendingMoveAttempt.current;
        if (attempt) markMoveRejected(attempt.pitIndex, attempt.direction);
      }
      pendingMoveAttempt.current = null;
    }
  }, [pendingMove, currentStateKey, error, room, ownsCurrentTurn, connectionState, markMoveRejected]);
  useLayoutEffect(() => {
    if (!sowingAnimations.length) {
      setSeedFlights([]);
      return;
    }
    const board = boardRef.current;
    if (!board) return;

    const boardRect = board.getBoundingClientRect();
    const pitCenters = new Map<number, { x: number; y: number }>();
    for (const node of board.querySelectorAll<HTMLElement>("[data-pit-index]")) {
      const index = Number(node.dataset.pitIndex);
      const rect = node.getBoundingClientRect();
      pitCenters.set(index, {
        x: rect.left + rect.width / 2 - boardRect.left,
        y: rect.top + rect.height / 2 - boardRect.top,
      });
    }
    const flights: SeedFlight[] = [];
    const refillGapMs = 64;
    const refillDurationMs = 180;
    const scoreCenters = new Map<number, { x: number; y: number }>();
    for (const node of rootRef.current?.querySelectorAll<HTMLElement>("[data-score-index]") ?? []) {
      const index = Number(node.dataset.scoreIndex);
      const rect = node.getBoundingClientRect();
      scoreCenters.set(index, {
        x: rect.left + rect.width / 2 - boardRect.left,
        y: rect.top + rect.height / 2 - boardRect.top,
      });
    }
    sowingAnimations.forEach((sowingAnimation) => {
      const { gapMs, durationMs } = sowingTiming(sowingAnimation.steps.length);
      sowingAnimation.steps.forEach((step, index) => {
        const from = pitCenters.get(step.from);
        const to = pitCenters.get(step.to);
        if (!from || !to) return;
        flights.push({
          id: `${sowingAnimation.id}-${index}`,
          x: from.x,
          y: from.y,
          dx: to.x - from.x,
          dy: to.y - from.y,
          midX: (to.x - from.x) * 0.18,
          midY: (to.y - from.y) * 0.18 - 5,
          lateX: (to.x - from.x) * 0.82,
          lateY: (to.y - from.y) * 0.82 - 2,
          delayMs: index * gapMs,
          durationMs,
        });
      });
      const lastSowEnd = sowingAnimation.steps.length
        ? (sowingAnimation.steps.length - 1) * gapMs + durationMs
        : 0;
      const refillStartMs = lastSowEnd + 80;
      sowingAnimation.refills.forEach((refill, index) => {
        const from = scoreCenters.get(refill.scoreIndex);
        const to = pitCenters.get(refill.pit);
        if (!from || !to) return;
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        flights.push({
          id: `${sowingAnimation.id}-refill-${index}`,
          x: from.x,
          y: from.y,
          dx,
          dy,
          midX: dx * 0.48,
          midY: dy * 0.48 - 12,
          lateX: dx * 0.82,
          lateY: dy * 0.82 - 3,
          delayMs: refillStartMs + index * refillGapMs,
          durationMs: refillDurationMs,
        });
      });
    });
    setSeedFlights(flights);
  }, [sowingAnimations, prefersReducedMotion, layoutRevision]);
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!sowingAnimations.length || !root) {
      setCaptureFlights([]);
      return;
    }
    const rootRect = root.getBoundingClientRect();
    const flights = sowingAnimations.flatMap((sowingAnimation) => {
      const timing = sowingTiming(sowingAnimation.steps.length);
      const sowEndMs = Math.max(0, sowingAnimation.steps.length - 1) * timing.gapMs + timing.durationMs;
      const captureStartMs = sowEndMs + CAPTURE_AFTER_SOW_MS;
      const settlementStartMs = captureStartMs
        + (sowingAnimation.capture ? CAPTURE_FLIGHT_DURATION_MS + SETTLEMENT_AFTER_CAPTURE_MS : 0);
      const transfers = [
        ...(sowingAnimation.capture ? [{ transfer: sowingAnimation.capture, delayMs: captureStartMs }] : []),
        ...sowingAnimation.settlements.map((transfer, index) => ({
          transfer,
          delayMs: settlementStartMs + index * CAPTURE_FLIGHT_GAP_MS,
        })),
      ];
      return transfers.flatMap(({ transfer, delayMs }, index) => {
        const source = boardRef.current?.querySelector<HTMLElement>(`[data-pit-index="${transfer.pit}"]`);
        const target = root.querySelector<HTMLElement>(`[data-score-index="${transfer.scoreIndex}"]`);
        if (!source || !target) return [];
        const sourceRect = source.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const x = sourceRect.left + sourceRect.width / 2 - rootRect.left;
        const y = sourceRect.top + sourceRect.height / 2 - rootRect.top;
        const dx = targetRect.left + targetRect.width / 2 - rootRect.left - x;
        const dy = targetRect.top + targetRect.height / 2 - rootRect.top - y;
        return [{
          id: `${sowingAnimation.id}-${index}`,
          x, y, dx, dy,
          midX: dx * 0.58,
          midY: dy * 0.58 - 28 + index * 5,
          count: transfer.count,
          delayMs: prefersReducedMotion ? 0 : delayMs,
        }];
      });
    });
    setCaptureFlights(flights);
  }, [sowingAnimations, prefersReducedMotion, layoutRevision]);

  if (!room) return null;
  const state = room.state as GameState;
  const side = mySide as Side | null;
  const myTurn = room.status === "Playing" && !state.winner && state.turn === side;
  const pendingAttempt = pendingMove ? pendingMoveAttempt.current : null;
  const pendingPath = pendingAttempt
    ? previewSowingPath(state, pendingAttempt.pitIndex, pendingAttempt.direction)
    : [];
  const canMove = myTurn && connectionState === "connected" && !pendingMove;
  const send = (pitIndex: number, direction: Direction) => {
    if (!canMove || state.pits[pitIndex] <= 0) return;
    pendingStateKey.current = currentStateKey;
    pendingError.current = error;
    pendingMoveAttempt.current = { pitIndex, direction };
    setPendingMove(true);
    window.clearTimeout(pendingMoveTimer.current);
    const revision = ++pendingMoveRevision.current;
    pendingMoveTimer.current = window.setTimeout(() => {
      if (pendingMoveRevision.current !== revision) return;
      setPendingMove(false);
      const attempt = pendingMoveAttempt.current;
      pendingMoveAttempt.current = null;
      if (attempt && myTurn && connectionState === "connected") markMoveRejected(attempt.pitIndex, attempt.direction);
    }, 5000);
    makeMove(room.id, { pitIndex, direction });
    setSelectedPit(null);
    clearPreview();
  };

  const pitDelay = (index: number) => pitRevealDelays.get(index) ?? 0;

  function handlePitClick(index: number, owner: Side, keyboard = false) {
    if (!canMove || owner !== side || isQuanPit(index) || state.pits[index] === 0) return;
    if (selectedPit === index) {
      cancelDirectionChoice();
      return;
    }
    window.clearTimeout(directionExitTimer.current);
    setClosingDirectionPit(null);
    const nextPit = index;
    keyboardSelectedPit.current = keyboard && nextPit !== null;
    setSelectedPit(nextPit);
    clearPreview();
  }

  function closeDirectionChoice(pitIndex: number, restoreFocus: boolean) {
    setClosingDirectionPit(pitIndex);
    setSelectedPit(null);
    clearPreview();
    window.clearTimeout(directionExitTimer.current);
    directionExitTimer.current = window.setTimeout(() => setClosingDirectionPit(null), prefersReducedMotion ? 0 : 140);
    if (restoreFocus) {
      window.requestAnimationFrame(() => {
        boardRef.current?.querySelector<HTMLButtonElement>(`[data-pit-index="${pitIndex}"]`)?.focus();
      });
    }
  }

  function cancelDirectionChoice() {
    if (selectedPit !== null) closeDirectionChoice(selectedPit, true);
  }

  const row1 = DAN_INDICES.P0; // [1,2,3,4,5] — trái sang phải
  const row2 = [...DAN_INDICES.P1].reverse(); // [11,10,9,8,7] — đúng thứ tự vòng quanh bàn
  const directionChoicePit = selectedPit ?? closingDirectionPit;
  const directionChoiceClosing = selectedPit === null && closingDirectionPit !== null;

  return (
    <div ref={rootRef} className={`animate-board-enter relative flex flex-col gap-3 w-full max-w-2xl mx-auto ${changeFlashClass(roomStatusChanged, "animate-board-enter")}`}>
      {captureFlights.length > 0 && (
        <div className="oanquan-capture-layer" aria-hidden="true">
          {captureFlights.map((flight) => (
            <span
              key={flight.id}
              className="oanquan-capture-flight"
              style={{
                left: `${flight.x}px`,
                top: `${flight.y}px`,
                "--capture-dx": `${flight.dx}px`,
                "--capture-dy": `${flight.dy}px`,
                "--capture-mid-x": `${flight.midX}px`,
                "--capture-mid-y": `${flight.midY}px`,
                "--capture-delay": `${flight.delayMs}ms`,
              } as import("react").CSSProperties}
            >+{flight.count}</span>
          ))}
        </div>
      )}
      {/* Status bar */}
      <div className="bg-gradient-to-r from-[#151b0d] to-[#111508] rounded-sm px-4 py-3 shadow-lg border border-lime-900/40">
        <div className="grid grid-cols-3 gap-1 text-center">
          <div>
            <div className="text-lime-400/70 text-xs mb-0.5">Bạn</div>
            <div className="font-bold text-sm text-lime-100">
              {side === "P0" ? "Phía trên" : side === "P1" ? "Phía dưới" : "👁 Xem"}
            </div>
          </div>
          <div>
            <div className="text-lime-400/70 text-xs mb-0.5">Đến lượt</div>
            <div className={`font-bold text-sm text-amber-300 ${changeFlashClass(turnChanged, "animate-turn-start")}`}>{state.turn === "P0" ? "Phía trên" : "Phía dưới"}</div>
          </div>
          <div>
            <div className="text-lime-400/70 text-xs mb-0.5">Điểm</div>
            <div className="font-bold text-sm text-lime-100">
              {[0, 1].map((index) => {
                const delta = scoreDeltas.get(index) ?? 0;
                return (
                  <span key={index} data-score-index={index} className="relative inline-flex">
                    {index === 1 && <span className="mx-1.5">–</span>}
                    <AnimatedNumber
                      value={state.scores[index]}
                      delayMs={scoreRevealDelay}
                      style={{ animationDelay: `${scoreRevealDelay}ms` }}
                      className={changeFlashClass(index === 0 ? score0Changed : score1Changed, "animate-score-change")}
                    />
                    {delta !== 0 && <span key={`score-delta-${index}-${delta}`} aria-hidden="true" style={{ animationDelay: `${scoreRevealDelay}ms` }} className={`game-value-delta ${delta > 0 ? "is-gain" : "is-loss"}`}>{delta > 0 ? "+" : "−"}{Math.abs(delta)}</span>}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
        {pendingMove && myTurn && (
          <div role="status" aria-live="polite" className="animate-game-action-enter oanquan-move-pending mt-2 text-center text-amber-300 font-medium text-sm flex flex-col items-center justify-center gap-1">
            <span aria-hidden="true" className="rematch-spinner inline-block">↻</span>
            Đang gửi nước rải…
            {pendingAttempt && pendingPath.length > 0 && (
              <span aria-hidden="true" className="flex flex-wrap items-center justify-center gap-1 text-[10px] font-normal text-lime-200/75">
                <span>O {pendingAttempt.pitIndex}</span>
                {pendingPath.map((step, index) => (
                  <span key={`${step.to}-${index}`} className="inline-flex items-center gap-1">
                    <span className="text-amber-400/70">&#8594;</span>
                    <span className="rounded-full border border-lime-700/50 bg-lime-950/50 px-1.5 py-0.5">{step.to}</span>
                  </span>
                ))}
              </span>
            )}\r
          </div>
        )}
        {myTurn && !selectedPit && !pendingMove && (
          <div className="animate-game-action-enter mt-2 text-center text-amber-300 font-medium text-sm flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 game-turn-beacon shrink-0" />
            Tới lượt bạn! Chạm 1 ô dân của bạn
          </div>
        )}
        {activeSowing && (
          <div className="animate-game-action-enter mt-2 mx-auto w-full max-w-sm" role="status" aria-live="polite" aria-atomic="true">
            <div className="flex items-center justify-center gap-2 text-xs font-medium text-lime-200">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-lime-300 animate-pulse" />
              {activeSowing.label}
              {activeSowing.label === "Đang rải quân" && <span aria-hidden="true" className="text-lime-100/65">· {activeSowing.step}</span>}
            </div>
            <div aria-hidden="true" className="mt-1 h-1 overflow-hidden rounded-full bg-lime-950/80">
              <div className="h-full rounded-full bg-gradient-to-r from-lime-600 to-amber-300 shadow-[0_0_8px_rgba(190,242,100,0.5)]" style={{ width: `${activeSowing.progress}%`, transition: "width 90ms linear" }} />
            </div>
          </div>
        )}
        {!myTurn && room.status === "Playing" && !state.winner && side && (
          <div className={`animate-game-action-enter mt-2 text-center font-medium text-sm flex items-center justify-center gap-1.5 ${activeSowing ? "text-amber-400/35" : "text-amber-400/50"}`}>
            <WaitingDots />
            {activeSowing ? "Đang cập nhật bàn cờ…" : "Chờ đối thủ đi…"}
          </div>
        )}
      </div>

      {turnChanged.active && !state.winner && (
        <div key={`turn-${turnChanged.sequence}`} className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {state.turn === "P0" ? "Đến lượt phía trên." : "Đến lượt phía dưới."}
        </div>
      )}

      <ConnectionBanner connectionState={connectionState} />
      <DisconnectBadge seats={room.seats} />

      {/* Bàn cờ 12 ô: cột 1 = Quan P0, cột 2-6 = dân, cột 7 = Quan P1 */}
      <div className="bg-[#0f1409] rounded-sm p-3 border border-lime-900/40 overflow-x-auto">
        <div ref={boardRef} className="relative grid gap-1.5 min-w-[420px]" style={{ gridTemplateColumns: "auto repeat(5, 1fr) auto", gridTemplateRows: "auto auto" }}>
          <div style={{ gridRow: "1 / span 2" }}>
            <PitCell index={QUAN_INDEX.P0} count={state.pits[0]} selectable={false} selected={false} changed={changedPits.has(0)} changeSequence={changedPits.get(0)} animationDelayMs={pitDelay(0)} previewStep={previewOrder.get(QUAN_INDEX.P0)} previewKey={previewDirection ?? undefined} previewLeaving={previewLeaving} quanCaptured={state.quanCaptured[0]} captureSequence={quanCaptureSequences.get(QUAN_INDEX.P0)} onClick={() => {}} />
          </div>
          {row1.map((i) => (
            <div key={i} style={{ gridRow: 1 }}>
              <PitCell
                index={i} count={state.pits[i]} selected={selectedPit === i} changed={changedPits.has(i)} changeSequence={changedPits.get(i)} rejectedSequence={rejectedMove?.pitIndex === i ? rejectedMove.sequence : undefined} animationDelayMs={pitDelay(i)}
                previewStep={previewOrder.get(i)} previewKey={previewDirection ?? undefined} previewLeaving={previewLeaving}
                selectable={canMove && side === "P0" && state.pits[i] > 0}
                onClick={(event) => handlePitClick(i, "P0", event.detail === 0)}
              />
            </div>
          ))}
          <div style={{ gridRow: "1 / span 2" }}>
            <PitCell index={QUAN_INDEX.P1} count={state.pits[6]} selectable={false} selected={false} changed={changedPits.has(6)} changeSequence={changedPits.get(6)} animationDelayMs={pitDelay(6)} previewStep={previewOrder.get(QUAN_INDEX.P1)} previewKey={previewDirection ?? undefined} previewLeaving={previewLeaving} quanCaptured={state.quanCaptured[1]} captureSequence={quanCaptureSequences.get(QUAN_INDEX.P1)} onClick={() => {}} />
          </div>
          {row2.map((i) => (
            <div key={i} style={{ gridRow: 2 }}>
              <PitCell
                index={i} count={state.pits[i]} selected={selectedPit === i} changed={changedPits.has(i)} changeSequence={changedPits.get(i)} rejectedSequence={rejectedMove?.pitIndex === i ? rejectedMove.sequence : undefined} animationDelayMs={pitDelay(i)}
                previewStep={previewOrder.get(i)} previewKey={previewDirection ?? undefined} previewLeaving={previewLeaving}
                selectable={canMove && side === "P1" && state.pits[i] > 0}
                onClick={(event) => handlePitClick(i, "P1", event.detail === 0)}
              />
            </div>
          ))}
          <div className="oanquan-seed-layer" aria-hidden="true">
            {seedFlights.map((flight) => (
              <span
                key={flight.id}
                className="oanquan-seed-flight"
                style={{
                  left: `${flight.x}px`,
                  top: `${flight.y}px`,
                  "--seed-dx": `${flight.dx}px`,
                  "--seed-dy": `${flight.dy}px`,
                  "--seed-mid-x": `${flight.midX}px`,
                  "--seed-mid-y": `${flight.midY}px`,
                  "--seed-late-x": `${flight.lateX}px`,
                  "--seed-late-y": `${flight.lateY}px`,
                  "--seed-delay": `${flight.delayMs}ms`,
                  "--seed-duration": `${flight.durationMs}ms`,
                } as import("react").CSSProperties}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Chọn chiều rải */}
      {directionChoicePit !== null && side && canMove && !pendingMove && (
        <div id="oanquan-direction-choice" key={directionChoicePit} role="group" aria-label="Chọn hướng rải quân" aria-hidden={directionChoiceClosing} onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          event.preventDefault();
          cancelDirectionChoice();
        }} className={`animate-game-action-enter flex flex-wrap items-center justify-center gap-3 bg-amber-900/20 border border-amber-700/40 rounded-sm p-3 ${directionChoiceClosing ? "oanquan-direction-choice-exit pointer-events-none" : ""}`}>
          <span className="text-amber-300 text-sm font-medium">🎯 Ô {directionChoicePit} · {state.pits[directionChoicePit]} quân — rải sang:</span>
          <button
            disabled={directionChoiceClosing}
            ref={firstDirectionButton}
            onPointerEnter={() => { pointerPreviewDirection.current = directionFor(side, "left"); syncPreviewSources(); }}
            onPointerLeave={() => { pointerPreviewDirection.current = null; syncPreviewSources(); }}
            onFocus={() => { focusPreviewDirection.current = directionFor(side, "left"); syncPreviewSources(); }}
            onBlur={() => { focusPreviewDirection.current = null; syncPreviewSources(); }}
            onClick={() => send(directionChoicePit, directionFor(side, "left"))}
            className="oanquan-direction-option relative rounded-sm bg-gradient-to-b from-amber-600 via-amber-700 to-amber-800 px-4 py-2 text-sm font-semibold text-amber-50 border-t border-amber-400/50 shadow-[0_3px_0_0_#451a03] transition-all hover:scale-[1.03] hover:brightness-110 focus-visible:scale-[1.03] focus-visible:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 active:translate-y-px active:scale-[0.98] active:shadow-[0_1px_0_0_#451a03]"
          >
            <span aria-hidden="true" className="oanquan-direction-arrow is-left">←</span> Trái
          </button>
          <button
            disabled={directionChoiceClosing}
            onPointerEnter={() => { pointerPreviewDirection.current = directionFor(side, "right"); syncPreviewSources(); }}
            onPointerLeave={() => { pointerPreviewDirection.current = null; syncPreviewSources(); }}
            onFocus={() => { focusPreviewDirection.current = directionFor(side, "right"); syncPreviewSources(); }}
            onBlur={() => { focusPreviewDirection.current = null; syncPreviewSources(); }}
            onClick={() => send(directionChoicePit, directionFor(side, "right"))}
            className="oanquan-direction-option relative rounded-sm bg-gradient-to-b from-amber-600 via-amber-700 to-amber-800 px-4 py-2 text-sm font-semibold text-amber-50 border-t border-amber-400/50 shadow-[0_3px_0_0_#451a03] transition-all hover:scale-[1.03] hover:brightness-110 focus-visible:scale-[1.03] focus-visible:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 active:translate-y-px active:scale-[0.98] active:shadow-[0_1px_0_0_#451a03]"
          >
            Phải <span aria-hidden="true" className="oanquan-direction-arrow is-right">→</span>
          </button>
          <button
            disabled={directionChoiceClosing}
            onClick={cancelDirectionChoice}
            className="oanquan-direction-cancel rounded-sm border border-amber-950/80 bg-[#140e0b]/90 hover:border-amber-700/60 hover:bg-[#1a120d] hover:text-amber-400 focus-visible:border-amber-700/60 focus-visible:bg-[#1a120d] focus-visible:text-amber-400 px-3 py-2 text-sm text-amber-700/70 transition-all duration-150 active:scale-[0.97] focus-visible:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
          >
            Huỷ
          </button>
        </div>
      )}

      {/* Thông báo kết quả */}
      {state.winner && resultReady && (
        <div className={`${!side || state.winner === "DRAW" ? "animate-victory-neutral" : state.winner === side ? "animate-victory-win" : "animate-victory-lose"} rounded-sm p-1 ${state.winner === "DRAW" ? "border border-amber-900/30 bg-amber-950/20" : "border border-amber-600/30 bg-amber-950/20 shadow-[0_0_30px_rgba(251,191,36,0.15)]"}`}>
          <div className={`rounded-sm p-4 text-center ${state.winner === "DRAW" ? "bg-[#1a1208]/60 border border-amber-900/30" : "bg-gradient-to-b from-[#2b2013] to-[#1c150c] border border-amber-700/30"}`}>
            <div className="game-result-emblem text-3xl mb-1">{state.winner === "DRAW" ? "🤝" : "🏆"}</div>
            <div className={`game-result-title font-bold text-base [text-shadow:0_1px_0_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.8)] ${state.winner === "DRAW" ? "text-amber-200/70" : "text-amber-200"}`}>
              {state.winner === "DRAW"
                ? `HOÀ — ${state.scores[0]} – ${state.scores[1]}`
                : `${state.winner === "P0" ? "PHÍA TRÊN" : "PHÍA DƯỚI"} THẮNG`}
            </div>
            {state.winner !== "DRAW" && <div className="text-amber-400/60 text-sm mt-0.5">{state.scores[0]} – {state.scores[1]}</div>}
          </div>
        </div>
      )}

      <RoomStatusBanner room={room} mySide={mySide} />
      <RoomErrorBanner error={error} />

      {state.winner && resultReady && side && <RematchButton onRematch={onRematch} loading={rematching} />}
      <LeaveRoomButton onLeave={onLeave} />
    </div>
  );
}
