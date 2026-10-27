import { useGameStore } from "../../platform/gameStore";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ConnectionBanner, DisconnectBadge, LeaveRoomButton, RematchButton, RoomErrorBanner } from "../../platform/RoomShell";
import { iconForSeat, isMyTurn, seatIndexOfSide, type GameState, type MapDef } from "./types";
import { changedIndexClass, useChangedIndices } from "../useChangedIndices";
import { changeFlashClass, useChangeFlash } from "../useChangeFlash";
import { useReducedMotionPreference } from "../../hooks/useReducedMotionPreference";
import { useResizeRevision } from "../../hooks/useResizeRevision";
import { MAX_RACE_DURATION_MS, RACE_CRATE_COUNT_FLASH_DURATION_MS, RACE_CRATE_DELIVERY_DURATION_MS, RACE_CRATE_PICKUP_DELAY_RATIO, RACE_LANDING_RING_DELAY_RATIO, RACE_MOVE_GRACE_MS, RACE_ROLL_REVEAL_MS, RACER_ARRIVAL_ANIMATION_MS, raceDurationMs, useRaceMoves } from "./useRaceMoves";
import AnimatedNumber from "../../components/AnimatedNumber";
import WaitingDots from "../../components/WaitingDots";

const DIE_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

interface CrateDeliveryFlight {
  id: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  midX: number;
  midY: number;
  delayMs: number;
}

interface Props {
  makeMove: (roomId: string, move: unknown) => void;
  onLeave: () => void;
  onRematch: () => void;
  rematching: boolean;
}

export default function ZodiacRaceBoard({ makeMove, onLeave, onRematch, rematching }: Props) {
  const { room, mySide, error, connectionState } = useGameStore();
  const prefersReducedMotion = useReducedMotionPreference();
  const [rolling, setRolling] = useState(false);
  const [rollingFaceIndex, setRollingFaceIndex] = useState(0);
  const [rejectedRoll, setRejectedRoll] = useState<{ sequence: number } | null>(null);
  const requestedRollState = useRef("");
  const requestedRollError = useRef<string | null>(error);
  const rollTimer = useRef<number | undefined>(undefined);
  const rollRevision = useRef(0);
  const rejectedRollTimer = useRef<number | undefined>(undefined);
  const rejectedRollRevision = useRef(0);
  const previousRollRoom = useRef(room?.id);
  const stateForEffects = room?.state as GameState | undefined;
  const rollStateKey = stateForEffects
    ? `${stateForEffects.turn}|${stateForEffects.lastRoll}|${stateForEffects.positions.join(",")}|${stateForEffects.cratesCollected.join(",")}`
    : "";
  const movedSeats = useChangedIndices(
    stateForEffects?.positions ?? [],
    RACE_ROLL_REVEAL_MS + MAX_RACE_DURATION_MS + RACE_MOVE_GRACE_MS + RACER_ARRIVAL_ANIMATION_MS,
    room?.id,
  );
  const rollChanged = useChangeFlash(stateForEffects ? rollStateKey : undefined, 550, room?.id);
  const turnChanged = useChangeFlash(stateForEffects?.turn, 800, room?.id);
  const raceMoves = useRaceMoves(stateForEffects?.positions ?? [], room?.id ?? "", stateForEffects?.cratesCollected ?? []);
  const boardRoot = useRef<HTMLDivElement>(null);
  const boardLayoutRevision = useResizeRevision(boardRoot, !!stateForEffects?.started);
  const [crateDeliveryFlights, setCrateDeliveryFlights] = useState<CrateDeliveryFlight[]>([]);
  const crateFlightRoomId = useRef(room?.id);
  const joiningSeats = useChangedIndices(room?.seats.map((seat) => Number(seat.displayName !== null)) ?? [], 560, room?.id);
  const roomStatusChanged = useChangeFlash(room?.status, 500, room?.id);
  useLayoutEffect(() => {
    if (crateFlightRoomId.current !== room?.id) {
      crateFlightRoomId.current = room?.id;
      setCrateDeliveryFlights([]);
      return;
    }
    if (prefersReducedMotion || !stateForEffects?.started || !raceMoves.size) {
      setCrateDeliveryFlights([]);
      return;
    }
    const root = boardRoot.current;
    if (!root) return;
    const rootRect = root.getBoundingClientRect();
    const flights: CrateDeliveryFlight[] = [];
    for (const [seat, move] of raceMoves) {
      if (move.cratesTo <= move.cratesFrom) continue;
      const source = root.querySelector<HTMLElement>(`[data-zodiac-tile-index="${move.to}"]`);
      const target = root.querySelector<HTMLElement>(`[data-zodiac-crates-for-seat="${seat}"]`);
      if (!source || !target) continue;
      const sourceRect = source.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      flights.push({
        id: `${seat}-${move.crateSequence}`,
        x: sourceRect.left + sourceRect.width / 2 - rootRect.left,
        y: sourceRect.top + sourceRect.height / 2 - rootRect.top,
        dx: targetRect.left + targetRect.width / 2 - (sourceRect.left + sourceRect.width / 2),
        dy: targetRect.top + targetRect.height / 2 - (sourceRect.top + sourceRect.height / 2),
        midX: (targetRect.left + targetRect.width / 2 - (sourceRect.left + sourceRect.width / 2)) * 0.52,
        midY: (targetRect.top + targetRect.height / 2 - (sourceRect.top + sourceRect.height / 2)) * 0.52 - 18,
        delayMs: (move.revealDelayMs ?? RACE_ROLL_REVEAL_MS)
          + Math.round(raceDurationMs(move.from, move.to) * RACE_CRATE_PICKUP_DELAY_RATIO),
      });
    }
    setCrateDeliveryFlights(flights);
  }, [room?.id, stateForEffects?.started, raceMoves, prefersReducedMotion, boardLayoutRevision]);
  useEffect(() => {
    if (!rolling || prefersReducedMotion) return;
    const faceTimer = window.setInterval(() => {
      setRollingFaceIndex((current) => (current + 1) % DIE_FACES.length);
    }, 105);
    return () => window.clearInterval(faceTimer);
  }, [rolling, prefersReducedMotion]);
  const markRollRejected = useCallback(() => {
    const revision = ++rejectedRollRevision.current;
    setRejectedRoll((current) => ({ sequence: (current?.sequence ?? 0) + 1 }));
    window.clearTimeout(rejectedRollTimer.current);
    rejectedRollTimer.current = window.setTimeout(() => {
      if (rejectedRollRevision.current === revision) setRejectedRoll(null);
    }, prefersReducedMotion ? 180 : 700);
  }, [prefersReducedMotion]);

  useLayoutEffect(() => {
    if (previousRollRoom.current !== room?.id) {
      previousRollRoom.current = room?.id;
      requestedRollState.current = "";
      setRolling(false);
      setRejectedRoll(null);
      window.clearTimeout(rollTimer.current);
      rollRevision.current += 1;
      window.clearTimeout(rejectedRollTimer.current);
      rejectedRollRevision.current += 1;
    }
  }, [room?.id]);
  useLayoutEffect(() => {
    if (!rolling) return;
    if (connectionState !== "connected" || (rollStateKey && rollStateKey !== requestedRollState.current)) {
      setRolling(false);
      window.clearTimeout(rollTimer.current);
      rollRevision.current += 1;
      return;
    }
    if (error !== requestedRollError.current) {
      setRolling(false);
      window.clearTimeout(rollTimer.current);
      rollRevision.current += 1;
      markRollRejected();
    }
  }, [rolling, rollStateKey, connectionState, error, markRollRejected]);
  useLayoutEffect(() => {
    if (!rejectedRoll || !requestedRollState.current || rollStateKey === requestedRollState.current) return;
    setRejectedRoll(null);
    window.clearTimeout(rejectedRollTimer.current);
    rejectedRollRevision.current += 1;
  }, [rejectedRoll, rollStateKey]);
  useEffect(() => {
    if (!prefersReducedMotion || !rejectedRoll) return;
    const revision = ++rejectedRollRevision.current;
    window.clearTimeout(rejectedRollTimer.current);
    rejectedRollTimer.current = window.setTimeout(() => {
      if (rejectedRollRevision.current === revision) setRejectedRoll(null);
    }, 180);
  }, [prefersReducedMotion, rejectedRoll]);
  useEffect(() => () => {
    rollRevision.current += 1;
    rejectedRollRevision.current += 1;
    window.clearTimeout(rollTimer.current);
    window.clearTimeout(rejectedRollTimer.current);
  }, []);

  if (!room) return null;
  const state = room.state as GameState;
  const map = room.map as MapDef;

  // Started=false nghĩa là chưa đủ người (OnRoomFull backend chưa chạy) — Positions còn rỗng,
  // không thể render đường đua. Cùng khuôn màn "ĐANG CHỜ" của BangBoard.
  if (!state.started || room.status === "Waiting") {
    const joined = room.seats.filter((s) => s.displayName !== null).length;
    return (
      <div className={`animate-board-enter flex flex-col gap-3 w-full max-w-md mx-auto ${changeFlashClass(roomStatusChanged, "animate-board-enter")}`}>
        <ConnectionBanner connectionState={connectionState} />
        <div className="relative overflow-hidden rounded-sm border border-amber-500/20 bg-stone-900/80 p-1 shadow-2xl">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
          <div className="rounded-sm border border-amber-500/30 bg-gradient-to-b from-[#2b2013] to-[#1a1208] p-6 text-center">
            <div className="text-4xl mb-2">🎠</div>
            <h2 className="font-western text-xl text-amber-300 tracking-wide mb-1 [text-shadow:0_1px_0_rgba(255,255,255,0.15),0_2px_6px_rgba(0,0,0,0.9)]">ĐUA XE HOÀNG ĐẠO</h2>
            <p className="text-amber-500/60 text-xs uppercase tracking-widest mb-4">Phòng chờ · {room.id.slice(0, 8)}</p>

            <div className="flex items-center justify-center gap-2 mb-4">
              {Array.from({ length: room.seatCount }, (_, i) => (
                <div
                  key={i}
                  className={`zodiac-seat-count w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    i < joined
                      ? "border-t border-amber-300/60 bg-gradient-to-b from-amber-600 to-amber-800 text-amber-100 shadow-[0_2px_0_0_#451a03,0_0_8px_rgba(245,158,11,0.3)]"
                      : "border border-dashed border-amber-900/60 bg-amber-950/20 text-amber-900/40 shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)]"
                  }`}
                >
                  {i < joined ? "★" : "○"}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 mb-2">
              {room.seats.map((seat, i) => (
                seat.displayName ? (
                  <div key={i} className={`relative overflow-hidden flex flex-col items-center rounded-sm border border-amber-600/50 bg-gradient-to-b from-[#251810] to-[#140d08] p-2.5 shadow-[0_4px_12px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(245,158,11,0.25)] ${changedIndexClass(joiningSeats, i, "animate-seat-arrive")}`} style={{ animationDelay: `${i * 55}ms` }}>
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
                    <div className="h-10 w-10 rounded-full border-2 border-amber-500/80 bg-amber-950/60 flex items-center justify-center text-lg shadow-[0_0_10px_rgba(245,158,11,0.3)]">{iconForSeat(i)}</div>
                    <span className="mt-1.5 text-[11px] font-bold text-amber-200 truncate max-w-full [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]">{seat.displayName}</span>
                    <span className="text-[9px] uppercase tracking-wider text-amber-600/80">Sẵn sàng</span>
                  </div>
                ) : (
                  <div key={i} className={`zodiac-empty-seat flex flex-col items-center justify-center rounded-sm border-2 border-dashed border-amber-950/70 bg-[#0d0805]/70 p-2.5 shadow-[inset_0_3px_8px_rgba(0,0,0,0.9)] transition-colors hover:border-amber-800/50 ${changedIndexClass(joiningSeats, i, "animate-seat-vacate")}`}>
                    <div className="h-10 w-10 rounded-full border border-dashed border-amber-900/50 bg-black/40 flex items-center justify-center text-amber-900/60 text-xl font-light">+</div>
                    <span className="mt-1.5 text-[11px] italic text-amber-900/70">Ghế trống</span>
                  </div>
                )
              ))}
            </div>
          </div>
        </div>
        <DisconnectBadge seats={room.seats} />
        <RoomErrorBanner error={error} />
        <LeaveRoomButton onLeave={onLeave} label="← Rời phòng" />
      </div>
    );
  }

  const myTurn = isMyTurn(state, mySide);
  const isSpectator = mySide === null;
  const currentName = room.seats[state.turn]?.displayName ?? "…";
  const winnerIdx = state.winner ? seatIndexOfSide(state.winner) : null;
  const movementAnnouncement = [...raceMoves].map(([seat, move]) => {
    const playerName = room.seats[seat]?.displayName ?? `Người chơi ${seat + 1}`;
    const distance = Math.abs(move.to - move.from);
    const collectedCrate = Math.max(0, move.cratesTo - move.cratesFrom);
    const finishText = state.winner && winnerIdx === seat ? ", về đích và chiến thắng" : "";
    const crateText = collectedCrate > 0 ? `, nhặt ${collectedCrate} kiện hàng` : "";
    return `${playerName} tiến ${distance} ô${crateText}${finishText}.`;
  }).join(" ");

  const send = () => {
    if (rolling || connectionState !== "connected" || !isMyTurn(state, mySide)) return;
    requestedRollState.current = rollStateKey;
    requestedRollError.current = error;
    setRejectedRoll(null);
    window.clearTimeout(rejectedRollTimer.current);
    setRollingFaceIndex(0);
    setRolling(true);
    window.clearTimeout(rollTimer.current);
    const revision = ++rollRevision.current;
    rollTimer.current = window.setTimeout(() => {
      if (rollRevision.current !== revision) return;
      setRolling(false);
      if (connectionState === "connected") markRollRejected();
    }, 4500);
    makeMove(room.id, { type: "ROLL" });
  };
  const tiles = Array.from({ length: map.trackLength + 1 }, (_, i) => i);

  return (
    <div ref={boardRoot} className={`animate-board-enter relative flex flex-col gap-3 w-full max-w-2xl mx-auto ${changeFlashClass(roomStatusChanged, "animate-board-enter")}`}>
      {crateDeliveryFlights.length > 0 && (
        <div aria-hidden="true" className="zodiac-crate-delivery-layer">
          {crateDeliveryFlights.map((flight) => (
            <span
              key={flight.id}
              className="zodiac-crate-delivery"
              style={{
                left: `${flight.x}px`,
                top: `${flight.y}px`,
                "--crate-dx": `${flight.dx}px`,
                "--crate-dy": `${flight.dy}px`,
                "--crate-mid-x": `${flight.midX}px`,
                "--crate-mid-y": `${flight.midY}px`,
                "--crate-delivery-delay": `${flight.delayMs}ms`,
                "--crate-delivery-duration": `${RACE_CRATE_DELIVERY_DURATION_MS}ms`,
              } as import("react").CSSProperties}
            >📦</span>
          ))}
        </div>
      )}
      <div className="relative overflow-hidden rounded-sm border border-amber-500/20 bg-stone-900/80 p-1 shadow-lg">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
        <div className="rounded-sm border border-amber-500/30 bg-gradient-to-b from-[#2b2013] to-[#1a1208] px-4 py-2.5 flex items-center justify-between">
          <div>
            <div className="font-western text-amber-300 text-sm tracking-wide [text-shadow:0_1px_0_rgba(255,255,255,0.12),0_2px_4px_rgba(0,0,0,0.8)]">🎲 ĐUA XE HOÀNG ĐẠO</div>
            <div className="text-[11px] text-amber-500/60 font-mono">Phòng {room.id.slice(0, 8)}</div>
          </div>
          <div className="text-center">
            <div className="text-[11px] text-amber-400/70 uppercase tracking-widest">Lượt</div>
            <div className={`zodiac-turn-label font-semibold text-amber-200 text-sm ${changeFlashClass(turnChanged, "animate-zodiac-turn")}`}>
              {myTurn ? "ĐẾN LƯỢT BẠN" : `${currentName} đang đi`}
              {!myTurn && !isSpectator && !state.winner && <> <WaitingDots /></>}
            </div>
          </div>
          <button onClick={onLeave} className="room-action-button text-xs px-2.5 py-1.5 rounded-sm border border-amber-950/80 bg-[#140e0b]/90 text-amber-700/70 shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)] hover:border-amber-700/60 hover:bg-[#1a120d] hover:text-amber-400 transition-all uppercase tracking-wider">
            Thoát
          </button>
        </div>
      </div>

      <ConnectionBanner connectionState={connectionState} />
      <DisconnectBadge seats={room.seats} />

      {isSpectator && !state.winner && (
        <div className="rounded-sm p-2 text-center border border-amber-900/40 bg-[#1a1208] text-amber-700/60 text-sm">👁 Bạn đang xem — không thể chơi.</div>
      )}

      {/* Bảng người chơi */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {state.positions.map((pos, i) => {
          const activeMove = raceMoves.get(i);
          const displayPosition = activeMove?.to ?? pos;
          const revealDelay = prefersReducedMotion ? 0 : activeMove?.revealDelayMs ?? RACE_ROLL_REVEAL_MS;
          const movementDuration = activeMove ? raceDurationMs(activeMove.from, activeMove.to) : 0;
          const valueRevealDelay = activeMove && !prefersReducedMotion
            ? revealDelay + Math.round(movementDuration * 0.76)
            : 0;
          const displayCrates = activeMove?.cratesTo ?? state.cratesCollected[i];
          const crateGain = activeMove ? Math.max(0, activeMove.cratesTo - activeMove.cratesFrom) : 0;
            const crateRevealDelay = crateGain > 0
              ? valueRevealDelay + (prefersReducedMotion ? 0 : RACE_CRATE_DELIVERY_DURATION_MS)
              : 0;
          const crateAnimation = activeMove && crateGain > 0
            ? `animate-zodiac-crate-${activeMove.crateSequence % 2 === 0 ? "a" : "b"}`
            : "";
          return <div
            key={i}
            className={`zodiac-player-status rounded-sm p-2.5 border-2 text-sm transition-all ${state.turn === i && !state.winner ? "animate-zodiac-turn" : ""} ${
              state.turn === i && !state.winner
                ? "border-amber-400 bg-amber-950/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                : "border-amber-900/40 bg-gradient-to-b from-[#2b2013] to-[#1a1208]"
            }`}
          >
            <div className="font-semibold text-amber-100 flex items-center gap-1">
              <span
                style={activeMove ? { animationDelay: `${valueRevealDelay}ms` } : undefined}
                className={`inline-block text-base ${changedIndexClass(movedSeats, i, "animate-zodiac-arrive")}`}
              >{iconForSeat(i)}</span>
              <span className="truncate text-xs">{room.seats[i]?.displayName ?? `Người chơi ${i + 1}`}</span>
              {state.turn === i && !state.winner && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 game-turn-beacon ml-auto shrink-0" />}
            </div>
            <div className="text-amber-400/60 text-[10px] mt-0.5">
              Ô <AnimatedNumber value={displayPosition} delayMs={valueRevealDelay} />/{map.trackLength} · 📦 <span data-zodiac-crates-for-seat={i} className="relative inline-flex"><AnimatedNumber value={displayCrates} delayMs={crateRevealDelay} style={crateGain > 0 ? { animationDelay: `${crateRevealDelay}ms` } : undefined} className={crateAnimation} />{crateGain > 0 && <span key={`crate-delta-${i}-${activeMove?.crateSequence ?? 0}-${crateGain}`} aria-hidden="true" className="game-value-delta is-gain" style={{ animationDelay: `${crateRevealDelay}ms`, animationDuration: `${RACE_CRATE_COUNT_FLASH_DURATION_MS}ms` }}>+{crateGain}</span>}</span>
            </div>
            <div
              role="progressbar"
              aria-label={`Tiến độ của ${room.seats[i]?.displayName ?? `Người chơi ${i + 1}`}`}
              aria-valuemin={0}
              aria-valuemax={map.trackLength}
              aria-valuenow={displayPosition}
              className="mt-2 h-1 overflow-hidden rounded-full bg-amber-950/80 shadow-inner"
            >
              <div
                className={`zodiac-race-progress-fill h-full rounded-full ${winnerIdx === i ? "bg-gradient-to-r from-amber-400 to-yellow-200" : "bg-gradient-to-r from-amber-800 via-amber-500 to-yellow-300"}`}
                style={{
                  width: "100%",
                  transform: `scaleX(${Math.max(0, Math.min(1, displayPosition / map.trackLength))})`,
                  transformOrigin: "left center",
                  transitionProperty: "transform",
                  transitionDuration: prefersReducedMotion ? "1ms" : activeMove ? `${movementDuration}ms` : "220ms",
                  transitionDelay: prefersReducedMotion ? "0ms" : `${activeMove ? revealDelay : 0}ms`,
                  transitionTimingFunction: "cubic-bezier(0.2, 0.75, 0.25, 1)",
                }}
              />
            </div>
          </div>;
        })}
      </div>

      {/* Đường đua */}
      <div
        role="region"
        aria-label={`Đường đua gồm ${map.trackLength + 1} ô từ xuất phát đến đích`}
        tabIndex={0}
        className="bg-[#0e0905] rounded-sm p-3 border border-amber-950/60 overflow-x-auto shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
      >
        <div className="relative flex gap-1 min-w-max">
          {tiles.map((t) => {
            const isCrate = map.crateTiles.includes(t);
            const isFinish = t === map.trackLength;
            const crateMove = isCrate
              ? [...raceMoves].find(([, move]) => move.to === t && move.cratesTo > move.cratesFrom)?.[1]
              : undefined;
            const cratePickedHere = !!crateMove;
            const racerMove = [...raceMoves].find(([, move]) => move.to === t)?.[1];
            const racerArrivalDelay = racerMove ? (racerMove.revealDelayMs ?? RACE_ROLL_REVEAL_MS) + Math.round(raceDurationMs(racerMove.from, racerMove.to) * RACE_LANDING_RING_DELAY_RATIO) : 0;
            const winnerMove = isFinish && winnerIdx !== null ? raceMoves.get(winnerIdx) : undefined;
            const finishArrivalDelay = winnerMove ? (winnerMove.revealDelayMs ?? RACE_ROLL_REVEAL_MS) + Math.round(raceDurationMs(winnerMove.from, winnerMove.to) * 0.84) : 0;
            const crateArrivalDelay = crateMove ? (crateMove.revealDelayMs ?? RACE_ROLL_REVEAL_MS) + Math.round(raceDurationMs(crateMove.from, crateMove.to) * 0.76) : 0;
            const cartsHere = state.positions.map((p, i) => (p === t ? i : null)).filter((i): i is number => i !== null);
            return (
              <div
                key={t}
                data-zodiac-tile-index={t}
                className={`w-10 h-14 shrink-0 relative rounded-sm border flex flex-col items-center justify-center text-[10px] shadow-inner ${
                  isFinish ? "border-amber-400 bg-amber-900/30 shadow-[inset_0_0_8px_rgba(245,158,11,0.2)]" : isCrate ? "border-lime-700/60 bg-lime-900/20" : "border-amber-950/50 bg-[#130d07]"
                }`}
              >
                {racerMove && <span aria-hidden="true" className="zodiac-landing-ring" style={{ animationDelay: `${racerArrivalDelay}ms` }} />}
                <span style={cratePickedHere ? { animationDelay: `${crateArrivalDelay}ms` } : winnerMove ? { animationDelay: `${finishArrivalDelay}ms` } : undefined} className={`${isCrate || isFinish ? "inline-block text-base" : "text-amber-900/50 font-mono text-[9px]"} ${cratePickedHere ? "animate-zodiac-crate-pickup" : ""} ${isFinish && state.winner ? "animate-zodiac-finish" : ""}`}>{isFinish ? "🏁" : isCrate ? "📦" : t}</span>
                <span className="flex items-center justify-center text-sm">
                  {cartsHere.filter((i) => !raceMoves.has(i)).map((i) => <span key={i} className={changedIndexClass(movedSeats, i, "animate-zodiac-arrive")}>{iconForSeat(i)}</span>)}
                </span>
              </div>
            );
          })}
          {[...raceMoves].map(([seat, move]) => {
            const steps = Math.max(1, Math.abs(move.to - move.from));
            const duration = raceDurationMs(move.from, move.to);
            return (
              <span
                key={seat}
                aria-hidden="true"
                className="zodiac-racer-travel"
                style={{
                  "--race-from": `${move.from * 44}px`,
                  "--race-to": `${move.to * 44}px`,
                  "--race-duration": `${duration}ms`,
                  animationDelay: `${move.revealDelayMs ?? RACE_ROLL_REVEAL_MS}ms`,
                  "--race-hop-duration": `${duration / steps}ms`,
                  "--race-steps": steps,
                } as import("react").CSSProperties}
              ><span className="zodiac-racer-hop" style={{ "--race-reveal-delay": `${move.revealDelayMs ?? RACE_ROLL_REVEAL_MS}ms` } as import("react").CSSProperties}>{iconForSeat(seat)}</span></span>
            );
          })}
        </div>
      </div>

      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{movementAnnouncement}</div>
      {turnChanged.active && !state.winner && (
        <div key={`turn-${turnChanged.sequence}`} className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          Đến lượt {room.seats[state.turn]?.displayName ?? `Người chơi ${state.turn + 1}`}.
        </div>
      )}

      {(state.lastRoll !== null || rolling || rejectedRoll) && !state.winner && (
        <div key={rejectedRoll?.sequence ?? (rolling ? "pending-roll" : `roll-${rollStateKey}`)} role="status" aria-live="polite" className={`text-center text-sm ${rejectedRoll ? "zodiac-roll-rejected-text" : "text-amber-200/70"} ${changeFlashClass(rollChanged, "animate-zodiac-roll")}`}>
          <span key={rolling ? "pending-roll" : `die-${rollStateKey}`} aria-label={rolling ? "Xúc xắc đang lăn" : `Kết quả ${state.lastRoll}`} className={`zodiac-die-face ${rolling ? "animate-die-pending" : changeFlashClass(rollChanged, "animate-die-roll")}`}>{rolling ? DIE_FACES[rollingFaceIndex] : DIE_FACES[(state.lastRoll ?? 0) - 1] ?? "🎲"}</span>
          {" "}{rejectedRoll ? "Lượt gieo chưa được nhận — hãy thử lại." : rolling ? "Đang đổ xúc xắc…" : raceMoves.size ? "Đang di chuyển:" : "Xúc xắc vừa đổ:"} {!rolling && !rejectedRoll && <span className="font-bold text-amber-300">{state.lastRoll}</span>}
          {!rolling && !rejectedRoll && raceMoves.size > 0 && (
            <div className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-amber-100/80">
              {[...raceMoves].map(([seat, move]) => (
                <span key={`move-status-${seat}-${move.to}`} className="inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-950/35 px-2 py-0.5">
                  <span aria-hidden="true">{iconForSeat(seat)}</span>
                  <span className="truncate max-w-32">{room.seats[seat]?.displayName ?? `Người chơi ${seat + 1}`}</span>
                  <span className="tabular-nums text-amber-300">ô {move.from} → {move.to}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {myTurn && !state.winner && (
        <button onClick={send} disabled={connectionState !== "connected" || rolling} aria-busy={rolling} className={`zodiac-roll-button animate-game-action-enter relative w-full rounded-sm bg-gradient-to-b from-amber-600 via-amber-700 to-amber-800 px-4 py-3 font-bold text-base text-amber-50 border-t border-amber-400/50 shadow-[0_4px_0_0_#451a03,0_8px_16px_rgba(0,0,0,0.5)] transition-all hover:-translate-y-0.5 hover:scale-[1.01] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 active:translate-y-0.5 active:scale-[0.99] active:shadow-[0_2px_0_0_#451a03] disabled:cursor-wait disabled:opacity-80 ${rejectedRoll ? `zodiac-roll-rejected-${rejectedRoll.sequence % 2 === 0 ? "b" : "a"}` : ""}`}>
          {rolling ? "🎲 ĐANG ĐỔ…" : "🎲 ĐỔ XÚC XẮC"}
        </button>
      )}

      {state.winner && winnerIdx !== null && (!raceMoves.has(winnerIdx) || prefersReducedMotion) && (
        <div className="rounded-sm border border-amber-600/30 bg-amber-950/20 p-1 shadow-[0_0_30px_rgba(251,191,36,0.2)]">
          <div className={`${mySide === null ? "animate-victory-neutral" : winnerIdx === seatIndexOfSide(mySide) ? "animate-victory-win" : "animate-victory-lose"} rounded-sm border border-amber-700/40 bg-gradient-to-b from-[#2b2013] to-[#1c150c] p-4 text-center`}>
            <div className="game-result-emblem text-3xl mb-1">🏆</div>
            <div className="game-result-title font-western text-lg text-amber-300 tracking-wide [text-shadow:0_1px_0_rgba(255,255,255,0.15),0_2px_6px_rgba(0,0,0,0.9)]">
              {iconForSeat(winnerIdx)} {room.seats[winnerIdx]?.displayName ?? state.winner}
            </div>
            <div className="text-amber-400/60 text-sm mt-0.5 uppercase tracking-widest">Về Đích Đầu Tiên!</div>
          </div>
        </div>
      )}

      <RoomErrorBanner error={error} />

      {state.winner && mySide && <RematchButton onRematch={onRematch} loading={rematching} />}
      <LeaveRoomButton onLeave={onLeave} />
    </div>
  );
}
