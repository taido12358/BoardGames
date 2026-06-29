import { useGameStore } from "../../platform/gameStore";
import { legalMoves, occupancy, side, type GameState, type MapDef } from "./types";

interface Props {
  makeMove: (roomId: string, move: unknown) => void;
  onLeave: () => void;
}

/** Bàn chơi SVG cho game Vây Bắt. Server-authoritative. */
export default function VayBatBoard({ makeMove, onLeave }: Props) {
  const { room, mySide, selected, setSelected, error } = useGameStore();
  if (!room) return null;

  const map = room.map as MapDef;
  const state = room.state as GameState;
  const occ = occupancy(state);
  const myTurn = room.status === "Playing" && !state.winner && state.turn === mySide;
  const highlights =
    selected && myTurn ? new Set(legalMoves(map, state, selected)) : new Set<number>();

  const onNodeClick = (nodeId: number) => {
    if (!myTurn) return;
    const pid = occ.get(nodeId);
    if (pid && side(pid) === mySide) {
      setSelected(pid);
      return;
    }
    if (selected && highlights.has(nodeId)) {
      makeMove(room.id, { pieceId: selected, to: nodeId });
      setSelected(null);
      return;
    }
    setSelected(null);
  };

  return (
    <div className="grid md:grid-cols-[1fr_300px] gap-6">
      <div className="bg-slate-800 rounded-2xl p-4 shadow-lg">
        <svg viewBox="0 0 400 440" className="w-full h-auto rounded-xl bg-slate-900">
          {map.edges.map(([a, b], i) => {
            const na = map.nodes.find((n) => n.id === a)!;
            const nb = map.nodes.find((n) => n.id === b)!;
            return (
              <line key={i} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                stroke="#54607f" strokeWidth={3} strokeLinecap="round" />
            );
          })}
          {map.nodes.map((n) => {
            const pid = occ.get(n.id);
            const isHi = highlights.has(n.id);
            const isSel = pid === selected;
            const fill = pid
              ? pid[0] === "R" ? "#e7463c" : "#f4f6ff"
              : isHi ? "#173a2c" : "#222a4a";
            const stroke = pid
              ? isSel ? "#36d399" : "#0b0e1c"
              : isHi ? "#36d399" : "#7b88c4";
            return (
              <g key={n.id} style={{ cursor: myTurn ? "pointer" : "default" }}
                 onClick={() => onNodeClick(n.id)}>
                <text x={n.x} y={n.y - 22} textAnchor="middle" fontSize={10} fill="#6470a0">{n.id}</text>
                <circle cx={n.x} cy={n.y} r={pid ? 17 : 13}
                  fill={fill} stroke={stroke} strokeWidth={isHi || isSel ? 4 : 2} />
              </g>
            );
          })}
        </svg>
      </div>

      <div className="space-y-4">
        <div className="bg-slate-800 rounded-2xl p-4 shadow-lg text-sm space-y-1">
          <div>Phòng: <span className="font-mono text-xs">{room.id.slice(0, 8)}</span></div>
          <div>🔴 {room.redPlayer ?? "—"} vs ⚪ {room.whitePlayer ?? "—"}</div>
          <div>Bạn cầm:{" "}
            <b className={mySide === "RED" ? "text-red-400" : mySide === "WHITE" ? "text-slate-100" : "text-slate-500"}>
              {mySide === "RED" ? "🔴 Đỏ" : mySide === "WHITE" ? "⚪ Trắng" : "khán giả"}
            </b>
          </div>
          <div>Trạng thái: <b>{room.status}</b></div>
          <div>Lượt: <b className={state.turn === "RED" ? "text-red-400" : "text-slate-100"}>
            {state.turn === "RED" ? "🔴 Đỏ" : "⚪ Trắng"}</b></div>
          <div>Lượt Đỏ: <b>{state.redTurnsUsed} / {state.maxRedTurns}</b></div>
          {myTurn && <div className="text-emerald-400 font-medium">→ Tới lượt bạn!</div>}
        </div>

        {state.winner && (
          <div className={`rounded-xl p-3 text-center font-bold ${
            state.winner === "RED" ? "bg-red-900/40 text-red-300" : "bg-slate-700 text-slate-100"}`}>
            {state.winner === "RED" ? "🔴 PHE ĐỎ THẮNG — đã vây bắt!" : "⚪ PHE TRẮNG THẮNG — trốn thoát!"}
          </div>
        )}

        {room.status === "Waiting" && (
          <div className="rounded-xl p-3 text-center bg-amber-900/30 text-amber-300 text-sm">
            Đang chờ đối thủ vào phòng…
          </div>
        )}

        {error && <div className="rounded-xl p-2 text-center bg-red-900/40 text-red-300 text-sm">{error}</div>}

        <button onClick={onLeave}
          className="w-full rounded-lg bg-slate-700 hover:bg-slate-600 px-4 py-2 font-medium">
          ← Rời phòng
        </button>
      </div>
    </div>
  );
}
