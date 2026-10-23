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
    const joined = room.seats.filter((s) => s.displayName !== null).length;
    return (
      <div className="flex flex-col gap-3 w-full max-w-md mx-auto">
        <ConnectionBanner connectionState={connectionState} />
        <div className="bg-gradient-to-b from-[#1a1030] to-[#110b20] rounded-2xl border border-purple-800/30 p-6 text-center shadow-xl">
          <div className="text-4xl mb-2">🎠</div>
          <h2 className="font-bold text-xl text-purple-200 tracking-wide mb-1">ĐUA XE HOÀNG ĐẠO</h2>
          <p className="text-purple-400/60 text-xs uppercase tracking-widest mb-4">Phòng chờ · {room.id.slice(0, 8)}</p>

          <div className="flex items-center justify-center gap-2 mb-4">
            {Array.from({ length: room.seatCount }, (_, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm ${
                  i < joined
                    ? "border-purple-500 bg-purple-900/50 text-purple-200"
                    : "border-slate-700 bg-slate-800/50 text-slate-600"
                }`}
              >
                {i < joined ? "●" : "○"}
              </div>
            ))}
          </div>

          <ul className="text-sm space-y-1.5 text-left mb-2">
            {room.seats.map((seat, i) => (
              <li key={i} className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 ${
                seat.displayName
                  ? "bg-purple-900/30 text-purple-200 border border-purple-800/30"
                  : "text-slate-600 border border-slate-800/50"
              }`}>
                <span>{seat.displayName ? iconForSeat(i) : "…"}</span>
                <span>{seat.displayName ?? "(trống)"}</span>
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

  const send = () => {
    if (connectionState !== "connected" || !isMyTurn(state, mySide)) return;
    makeMove(room.id, { type: "ROLL" });
  };
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
            className={`rounded-xl p-2.5 border-2 text-sm transition-all ${
              state.turn === i && !state.winner
                ? "border-purple-400 bg-purple-900/30 shadow-[0_0_12px_rgba(168,85,247,0.3)]"
                : "border-purple-900/40 bg-gradient-to-b from-[#1a1030] to-[#110b20]"
            }`}
          >
            <div className="font-semibold text-purple-100 flex items-center gap-1">
              <span className="text-base">{iconForSeat(i)}</span>
              <span className="truncate text-xs">{room.seats[i]?.displayName ?? `Người chơi ${i + 1}`}</span>
              {state.turn === i && !state.winner && <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse ml-auto shrink-0" />}
            </div>
            <div className="text-purple-300/60 text-[10px] mt-0.5">
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
                className={`w-10 h-14 shrink-0 rounded-lg border flex flex-col items-center justify-center text-[10px] shadow-inner ${
                  isFinish ? "border-amber-400 bg-amber-900/30 shadow-[inset_0_0_8px_rgba(245,158,11,0.2)]" : isCrate ? "border-lime-700 bg-lime-900/20" : "border-purple-900/40 bg-[#110b20]"
                }`}
              >
                <span className={isFinish || isCrate ? "text-base" : "text-purple-900/70 font-mono text-[9px]"}>{isFinish ? "🏁" : isCrate ? "📦" : t}</span>
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
        <button onClick={send} disabled={connectionState !== "connected"} className="relative w-full rounded-lg bg-gradient-to-b from-amber-600 via-amber-700 to-amber-800 px-4 py-3 font-bold text-base text-amber-50 border-t border-amber-400/50 shadow-[0_4px_0_0_#451a03,0_8px_16px_rgba(0,0,0,0.5)] transition-all hover:brightness-110 active:top-[2px] active:shadow-[0_2px_0_0_#451a03]">
          🎲 ĐỔ XÚC XẮC
        </button>
      )}

      {state.winner && winnerIdx !== null && (
        <div className="rounded-2xl border border-amber-600/30 bg-amber-950/20 p-1 shadow-[0_0_30px_rgba(251,191,36,0.2)]">
          <div className="rounded-xl border border-amber-700/40 bg-gradient-to-b from-[#2b2013] to-[#1c150c] p-4 text-center">
            <div className="text-3xl mb-1">🏆</div>
            <div className="font-western text-lg text-amber-300 tracking-wide [text-shadow:0_1px_0_rgba(255,255,255,0.15),0_2px_6px_rgba(0,0,0,0.9)]">
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
