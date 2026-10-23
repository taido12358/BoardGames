import { useEffect, useState } from "react";
import { useGameStore } from "../../platform/gameStore";
import {
  ConnectionBanner, DisconnectBadge, LeaveRoomButton, RematchButton, RoomErrorBanner, RoomStatusBanner,
} from "../../platform/RoomShell";
import { DAN_INDICES, QUAN_INDEX, isQuanPit, type Direction, type GameState, type Side } from "./types";

interface Props {
  makeMove: (roomId: string, move: unknown) => void;
  onLeave: () => void;
  onRematch: () => void;
  rematching: boolean;
}

/** "→"/"←" hiển thị trực quan theo hàng — hàng P1 xếp ngược (đi vòng quanh bàn) nên chiều "cw" logic đảo lại so với P0. */
function directionFor(side: Side, arrow: "left" | "right"): Direction {
  if (side === "P0") return arrow === "right" ? "cw" : "ccw";
  return arrow === "right" ? "ccw" : "cw";
}

function PitCell({
  index, count, selectable, selected, onClick,
}: { index: number; count: number; selectable: boolean; selected: boolean; onClick: () => void }) {
  const quan = isQuanPit(index);
  return (
    <button
      type="button"
      disabled={!selectable}
      onClick={onClick}
      aria-label={quan ? `Ô Quan, ${count} quân` : `Ô dân số ${index}, ${count} quân`}
      className={`flex flex-col items-center justify-center rounded-xl border-2 transition-all
        ${quan ? "w-16 h-full min-h-[5.5rem]" : "w-14 h-16 sm:w-16 sm:h-20"}
        ${selected ? "border-amber-400 bg-amber-900/40 -translate-y-1 shadow-[0_0_12px_rgba(251,191,36,0.5)]" : "border-lime-800/60 bg-[#1c2413] shadow-inner"}
        ${selectable ? "cursor-pointer hover:border-lime-500" : "cursor-default opacity-90"}
      `}
    >
      <span className={`font-bold ${quan ? "text-xl text-amber-200" : "text-base text-lime-100"}`}>{count}</span>
      {quan && <span className="text-[10px] text-amber-400/70 mt-0.5">QUAN</span>}
    </button>
  );
}

export default function OAnQuanBoard({ makeMove, onLeave, onRematch, rematching }: Props) {
  const { room, mySide, error, connectionState } = useGameStore();
  const [selectedPit, setSelectedPit] = useState<number | null>(null);
  const currentState = room?.state as GameState | undefined;
  useEffect(() => {
    setSelectedPit(null);
  }, [room?.id, currentState?.turn, room?.status, connectionState]);

  if (!room) return null;
  const state = room.state as GameState;
  const side = mySide as Side | null;
  const myTurn = room.status === "Playing" && !state.winner && state.turn === side;
  const canMove = myTurn && connectionState === "connected";

  const send = (pitIndex: number, direction: Direction) => {
    if (!canMove || state.pits[pitIndex] <= 0) return;
    makeMove(room.id, { pitIndex, direction });
    setSelectedPit(null);
  };

  function handlePitClick(index: number, owner: Side) {
    if (!canMove || owner !== side || isQuanPit(index) || state.pits[index] === 0) return;
    setSelectedPit((cur) => (cur === index ? null : index));
  }

  const row1 = DAN_INDICES.P0; // [1,2,3,4,5] — trái sang phải
  const row2 = [...DAN_INDICES.P1].reverse(); // [11,10,9,8,7] — đúng thứ tự vòng quanh bàn

  return (
    <div className="flex flex-col gap-3 w-full max-w-2xl mx-auto">
      {/* Status bar */}
      <div className="bg-gradient-to-r from-[#151b0d] to-[#111508] rounded-2xl px-4 py-3 shadow-lg border border-lime-900/40">
        <div className="grid grid-cols-3 gap-1 text-center">
          <div>
            <div className="text-lime-400/70 text-xs mb-0.5">Bạn</div>
            <div className="font-bold text-sm text-lime-100">
              {side === "P0" ? "Phía trên" : side === "P1" ? "Phía dưới" : "👁 Xem"}
            </div>
          </div>
          <div>
            <div className="text-lime-400/70 text-xs mb-0.5">Đến lượt</div>
            <div className="font-bold text-sm text-amber-300">{state.turn === "P0" ? "Phía trên" : "Phía dưới"}</div>
          </div>
          <div>
            <div className="text-lime-400/70 text-xs mb-0.5">Điểm</div>
            <div className="font-bold text-sm text-lime-100">{state.scores[0]} – {state.scores[1]}</div>
          </div>
        </div>
        {myTurn && !selectedPit && (
          <div className="mt-2 text-center text-amber-300 font-medium text-sm flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
            Tới lượt bạn! Chạm 1 ô dân của bạn
          </div>
        )}
        {!myTurn && room.status === "Playing" && !state.winner && side && (
          <div className="mt-2 text-center text-amber-400/50 font-medium text-sm flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600/40 animate-pulse shrink-0" />
            Chờ đối thủ đi…
          </div>
        )}
      </div>

      <ConnectionBanner connectionState={connectionState} />
      <DisconnectBadge seats={room.seats} />

      {/* Bàn cờ 12 ô: cột 1 = Quan P0, cột 2-6 = dân, cột 7 = Quan P1 */}
      <div className="bg-[#0f1409] rounded-2xl p-3 border border-lime-900/40 overflow-x-auto">
        <div className="grid gap-1.5 min-w-[420px]" style={{ gridTemplateColumns: "auto repeat(5, 1fr) auto", gridTemplateRows: "auto auto" }}>
          <div style={{ gridRow: "1 / span 2" }}>
            <PitCell index={QUAN_INDEX.P0} count={state.pits[0]} selectable={false} selected={false} onClick={() => {}} />
          </div>
          {row1.map((i) => (
            <div key={i} style={{ gridRow: 1 }}>
              <PitCell
                index={i} count={state.pits[i]} selected={selectedPit === i}
                selectable={canMove && side === "P0" && state.pits[i] > 0}
                onClick={() => handlePitClick(i, "P0")}
              />
            </div>
          ))}
          <div style={{ gridRow: "1 / span 2" }}>
            <PitCell index={QUAN_INDEX.P1} count={state.pits[6]} selectable={false} selected={false} onClick={() => {}} />
          </div>
          {row2.map((i) => (
            <div key={i} style={{ gridRow: 2 }}>
              <PitCell
                index={i} count={state.pits[i]} selected={selectedPit === i}
                selectable={canMove && side === "P1" && state.pits[i] > 0}
                onClick={() => handlePitClick(i, "P1")}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Chọn chiều rải */}
      {selectedPit !== null && side && canMove && (
        <div className="flex flex-wrap items-center justify-center gap-3 bg-amber-900/20 border border-amber-700/40 rounded-xl p-3">
          <span className="text-amber-300 text-sm font-medium">🎯 Rải quân sang:</span>
          <button
            onClick={() => send(selectedPit, directionFor(side, "left"))}
            className="relative rounded-lg bg-gradient-to-b from-amber-600 via-amber-700 to-amber-800 px-4 py-2 text-sm font-semibold text-amber-50 border-t border-amber-400/50 shadow-[0_3px_0_0_#451a03] transition-all hover:brightness-110 active:top-[1px] active:shadow-[0_1px_0_0_#451a03]"
          >
            ← Trái
          </button>
          <button
            onClick={() => send(selectedPit, directionFor(side, "right"))}
            className="relative rounded-lg bg-gradient-to-b from-amber-600 via-amber-700 to-amber-800 px-4 py-2 text-sm font-semibold text-amber-50 border-t border-amber-400/50 shadow-[0_3px_0_0_#451a03] transition-all hover:brightness-110 active:top-[1px] active:shadow-[0_1px_0_0_#451a03]"
          >
            Phải →
          </button>
          <button
            onClick={() => setSelectedPit(null)}
            className="rounded-lg bg-slate-700 hover:bg-slate-600 px-3 py-2 text-sm"
          >
            Huỷ
          </button>
        </div>
      )}

      {/* Thông báo kết quả */}
      {state.winner && (
        <div className={`rounded-2xl p-1 ${state.winner === "DRAW" ? "border border-slate-600/40 bg-slate-800/20" : "border border-amber-600/30 bg-amber-950/20 shadow-[0_0_30px_rgba(251,191,36,0.15)]"}`}>
          <div className={`rounded-xl p-4 text-center ${state.winner === "DRAW" ? "bg-slate-800/60 border border-slate-600/30" : "bg-gradient-to-b from-[#2b2013] to-[#1c150c] border border-amber-700/30"}`}>
            <div className="text-3xl mb-1">{state.winner === "DRAW" ? "🤝" : "🏆"}</div>
            <div className={`font-bold text-base [text-shadow:0_1px_0_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.8)] ${state.winner === "DRAW" ? "text-slate-200" : "text-amber-200"}`}>
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

      {state.winner && side && <RematchButton onRematch={onRematch} loading={rematching} />}
      <LeaveRoomButton onLeave={onLeave} />
    </div>
  );
}
