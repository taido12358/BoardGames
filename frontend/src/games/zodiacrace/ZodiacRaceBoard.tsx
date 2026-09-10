import { useGameStore } from "../../platform/gameStore";
import { ConnectionBanner, DisconnectBadge, LeaveRoomButton, RematchButton, RoomErrorBanner } from "../../platform/RoomShell";
import { iconForSeat, isMyTurn, seatIndexOfSide, type GameState, type MapDef } from "./types";

interface Props {
  makeMove: (roomId: string, move: unknown) => void;
  onLeave: () => void;
  onRematch: () => void;
  rematching: boolean;
}

export default function ZodiacRaceBoard({ makeMove, onLeave, onRematch, rematching }: Props) {
  const { room, mySide, error, connectionState } = useGameStore();

  if (!room) return null;
  const state = room.state as GameState;
  const map = room.map as MapDef;

  // Started=false nghĩa là chưa đủ người (OnRoomFull backend chưa chạy) — Positions còn rỗng,
  // không thể render đường đua. Cùng khuôn màn "ĐANG CHỜ" của BangBoard.
  if (!state.started || room.status === "Waiting") {
    return (
      <div className="flex flex-col gap-3 w-full max-w-md mx-auto">
        <ConnectionBanner connectionState={connectionState} />
        <div className="bg-slate-800 rounded-2xl p-5 text-center space-y-3">
          <div className="text-3xl">🎲</div>
          <h2 className="font-bold text-lg text-amber-300">ĐUA XE HOÀNG ĐẠO — ĐANG CHỜ</h2>
          <p className="text-slate-400 text-sm">
            {room.seats.filter((s) => s.displayName !== null).length}/{room.seatCount} người chơi đã vào phòng.
          </p>
          <ul className="text-sm text-slate-300 space-y-1">
            {room.seats.map((seat, i) => (
              <li key={i} className={seat.displayName ? "" : "text-slate-600"}>
                {seat.displayName ? `${iconForSeat(i)} ${seat.displayName}` : "— (trống)"}
              </li>
            ))}
          </ul>
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

  const send = () => makeMove(room.id, { type: "ROLL" });
  const tiles = Array.from({ length: map.trackLength + 1 }, (_, i) => i);

  return (
    <div className="flex flex-col gap-3 w-full max-w-2xl mx-auto">
      <div className="bg-gradient-to-r from-[#1a1030] to-[#241a3d] rounded-2xl px-4 py-2.5 shadow-lg flex items-center justify-between">
        <div>
          <div className="font-bold text-purple-200 text-sm">🎲 ĐUA XE HOÀNG ĐẠO</div>
          <div className="text-[11px] text-purple-300/60 font-mono">Phòng {room.id.slice(0, 8)}</div>
        </div>
        <div className="text-center">
          <div className="text-[11px] text-purple-300/70 uppercase">Lượt</div>
          <div className="font-semibold text-purple-100 text-sm">{myTurn ? "ĐẾN LƯỢT BẠN" : `${currentName} đang đi`}</div>
        </div>
        <button onClick={onLeave} className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-700/80 hover:bg-slate-600 text-slate-200">
          Thoát
        </button>
      </div>

      <ConnectionBanner connectionState={connectionState} />
      <DisconnectBadge seats={room.seats} />

      {isSpectator && !state.winner && (
        <div className="rounded-xl p-2 text-center bg-purple-900/30 text-purple-300 text-sm">👁 Bạn đang xem — không thể chơi.</div>
      )}

      {/* Bảng người chơi */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {state.positions.map((pos, i) => (
          <div
            key={i}
            className={`rounded-xl p-2 border text-sm ${
              state.turn === i && !state.winner ? "border-emerald-500 bg-emerald-900/20" : "border-slate-700 bg-slate-800/60"
            }`}
          >
            <div className="font-semibold text-slate-200">
              {iconForSeat(i)} {room.seats[i]?.displayName ?? `Người chơi ${i + 1}`}
            </div>
            <div className="text-slate-400 text-xs">
              Ô {pos}/{map.trackLength} · 📦 {state.cratesCollected[i]}
            </div>
          </div>
        ))}
      </div>

      {/* Đường đua */}
      <div className="bg-[#120c1f] rounded-2xl p-3 border border-purple-900/40 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {tiles.map((t) => {
            const isCrate = map.crateTiles.includes(t);
            const isFinish = t === map.trackLength;
            const cartsHere = state.positions.map((p, i) => (p === t ? i : null)).filter((i): i is number => i !== null);
            return (
              <div
                key={t}
                className={`w-10 h-14 shrink-0 rounded-lg border flex flex-col items-center justify-center text-[10px] ${
                  isFinish ? "border-amber-400 bg-amber-900/30" : isCrate ? "border-lime-700 bg-lime-900/20" : "border-slate-700 bg-slate-800/40"
                }`}
              >
                <span className="text-slate-500">{isFinish ? "🏁" : isCrate ? "📦" : t}</span>
                <span className="text-sm">{cartsHere.map((i) => iconForSeat(i)).join("")}</span>
              </div>
            );
          })}
        </div>
      </div>

      {state.lastRoll !== null && !state.winner && (
        <div className="text-center text-slate-300 text-sm">
          🎲 Xúc xắc vừa đổ: <span className="font-bold text-amber-300">{state.lastRoll}</span>
        </div>
      )}

      {myTurn && !state.winner && (
        <button onClick={send} className="w-full rounded-xl bg-amber-700 hover:bg-amber-600 px-4 py-3 font-bold text-base transition-colors">
          🎲 ĐỔ XÚC XẮC
        </button>
      )}

      {state.winner && winnerIdx !== null && (
        <div className="rounded-2xl p-4 text-center font-bold text-base bg-emerald-900/50 text-emerald-200 border border-emerald-700">
          🏆 {iconForSeat(winnerIdx)} {room.seats[winnerIdx]?.displayName ?? state.winner} VỀ ĐÍCH ĐẦU TIÊN!
        </div>
      )}

      <RoomErrorBanner error={error} />

      {state.winner && mySide && <RematchButton onRematch={onRematch} loading={rematching} />}
      <LeaveRoomButton onLeave={onLeave} />
    </div>
  );
}
