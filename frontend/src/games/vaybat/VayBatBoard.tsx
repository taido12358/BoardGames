import { useRef, useState } from "react";
import { useGameStore } from "../../platform/gameStore";
import { legalMoves, occupancy, side, type GameState, type MapDef } from "./types";

interface Props {
  makeMove: (roomId: string, move: unknown) => void;
  onLeave: () => void;
}

interface DragState { pieceId: string; svgX: number; svgY: number; }

export default function VayBatBoard({ makeMove, onLeave }: Props) {
  const { room, mySide, selected, setSelected, error } = useGameStore();
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const didDrag = useRef(false);

  if (!room) return null;

  const map = room.map as MapDef;
  const state = room.state as GameState;
  const occ = occupancy(state);
  const myTurn = room.status === "Playing" && !state.winner && state.turn === mySide;
  const highlights = selected && myTurn
    ? new Set(legalMoves(map, state, selected))
    : new Set<number>();

  function toSvg(clientX: number, clientY: number) {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: p.x, y: p.y };
  }

  function nearestNode(x: number, y: number, threshold = 35) {
    let best: number | null = null, bestDist = threshold;
    for (const n of map.nodes) {
      const d = Math.hypot(n.x - x, n.y - y);
      if (d < bestDist) { bestDist = d; best = n.id; }
    }
    return best;
  }

  function onSvgPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    const pos = toSvg(e.clientX, e.clientY);
    const nodeId = nearestNode(pos.x, pos.y);
    if (nodeId === null) { setSelected(null); return; }

    const pid = occ.get(nodeId);

    if (myTurn && pid && side(pid) === mySide) {
      // Nhấc quân của mình — bắt đầu kéo
      svgRef.current?.setPointerCapture(e.pointerId);
      didDrag.current = false;
      setSelected(pid);
      setDrag({ pieceId: pid, svgX: pos.x, svgY: pos.y });
    } else if (myTurn && selected && highlights.has(nodeId)) {
      // Tap vào ô đích hợp lệ — đi ngay
      makeMove(room!.id, { pieceId: selected, to: nodeId });
      setSelected(null);
    } else {
      setSelected(null);
    }
  }

  function onSvgPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!drag) return;
    e.preventDefault();
    didDrag.current = true;
    const pos = toSvg(e.clientX, e.clientY);
    setDrag(d => d ? { ...d, svgX: pos.x, svgY: pos.y } : null);
  }

  function onSvgPointerUp(e: React.PointerEvent<SVGSVGElement>) {
    if (!drag) return;
    if (didDrag.current) {
      const pos = toSvg(e.clientX, e.clientY);
      // Chỉ snap vào ô hợp lệ
      let best: number | null = null, bestDist = 40;
      for (const n of map.nodes) {
        if (!highlights.has(n.id)) continue;
        const d = Math.hypot(n.x - pos.x, n.y - pos.y);
        if (d < bestDist) { bestDist = d; best = n.id; }
      }
      if (best !== null) {
        makeMove(room!.id, { pieceId: drag.pieceId, to: best });
        setSelected(null);
      }
    }
    setDrag(null);
    didDrag.current = false;
  }

  const dragColor = drag ? (drag.pieceId[0] === "R" ? "#e7463c" : "#f4f6ff") : null;

  return (
    <div className="flex flex-col gap-3 w-full max-w-md mx-auto">

      {/* Status bar */}
      <div className="bg-slate-800 rounded-2xl px-4 py-3 shadow-lg">
        <div className="grid grid-cols-3 gap-1 text-center">
          <div>
            <div className="text-slate-400 text-xs mb-0.5">Bạn cầm</div>
            <div className={`font-bold text-sm ${mySide === "RED" ? "text-red-400" : mySide === "WHITE" ? "text-white" : "text-slate-500"}`}>
              {mySide === "RED" ? "🔴 Đỏ" : mySide === "WHITE" ? "⚪ Trắng" : "👁 Xem"}
            </div>
          </div>
          <div>
            <div className="text-slate-400 text-xs mb-0.5">Lượt</div>
            <div className={`font-bold text-sm ${state.turn === "RED" ? "text-red-400" : "text-white"}`}>
              {state.turn === "RED" ? "🔴 Đỏ" : "⚪ Trắng"}
            </div>
          </div>
          <div>
            <div className="text-slate-400 text-xs mb-0.5">Lượt Đỏ</div>
            <div className="font-bold text-sm">{state.redTurnsUsed} / {state.maxRedTurns}</div>
          </div>
        </div>
        {myTurn && (
          <div className="mt-2 text-center text-emerald-400 font-medium text-sm">
            → Tới lượt bạn! {selected ? "Chọn ô đích hoặc kéo quân" : "Nhấn hoặc kéo quân của bạn"}
          </div>
        )}
        <div className="mt-1 text-center text-slate-500 text-xs">
          Phòng: <span className="font-mono">{room.id.slice(0, 8)}</span>
          {" · "}🔴 {room.redPlayer ?? "—"} vs ⚪ {room.whitePlayer ?? "—"}
        </div>
      </div>

      {/* Board */}
      <div className="bg-slate-800 rounded-2xl p-2 shadow-lg">
        <svg
          ref={svgRef}
          viewBox="0 0 400 440"
          className="w-full h-auto rounded-xl bg-slate-900 touch-none select-none"
          onPointerDown={onSvgPointerDown}
          onPointerMove={onSvgPointerMove}
          onPointerUp={onSvgPointerUp}
          onPointerCancel={() => { setDrag(null); didDrag.current = false; }}
        >
          {/* Cạnh đồ thị */}
          {map.edges.map(([a, b], i) => {
            const na = map.nodes.find(n => n.id === a)!;
            const nb = map.nodes.find(n => n.id === b)!;
            return (
              <line key={i} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                stroke="#3d4a6b" strokeWidth={3} strokeLinecap="round" />
            );
          })}

          {/* Đỉnh */}
          {map.nodes.map(n => {
            const pid = occ.get(n.id);
            const isDragged = drag?.pieceId === pid;
            const isHi = highlights.has(n.id);
            const isSel = pid === selected && !isDragged;

            const r = pid ? 20 : 15;
            const fill = pid
              ? isDragged ? "transparent"
              : pid[0] === "R" ? "#e7463c" : "#f4f6ff"
              : isHi ? "#0f2a1f" : "#1a2240";
            const stroke = pid
              ? isSel ? "#36d399" : "#0b0e1c"
              : isHi ? "#36d399" : "#3d4a6b";

            return (
              <g key={n.id} style={{ cursor: myTurn ? "pointer" : "default" }}>
                {/* Vùng chạm rộng */}
                <circle cx={n.x} cy={n.y} r={34} fill="transparent" />
                <text x={n.x} y={n.y - 27} textAnchor="middle" fontSize={11}
                  fill={isSel || isHi ? "#8b9fd4" : "#4a5580"} style={{ pointerEvents: "none" }}>
                  {n.id}
                </text>
                <circle cx={n.x} cy={n.y} r={r}
                  fill={fill} stroke={stroke}
                  strokeWidth={isSel || isHi ? 3.5 : 2}
                  style={{ pointerEvents: "none" }} />
                {/* Chấm xanh cho ô đích */}
                {isHi && !pid && (
                  <circle cx={n.x} cy={n.y} r={7} fill="#36d399" opacity={0.9}
                    style={{ pointerEvents: "none" }} />
                )}
                {/* Vòng sáng quanh quân đang được chọn */}
                {isSel && pid && (
                  <circle cx={n.x} cy={n.y} r={r + 6} fill="none"
                    stroke="#36d399" strokeWidth={2} opacity={0.5}
                    style={{ pointerEvents: "none" }} />
                )}
              </g>
            );
          })}

          {/* Quân ma (ghost) khi đang kéo */}
          {drag && dragColor && (
            <g style={{ pointerEvents: "none" }}>
              <circle cx={drag.svgX} cy={drag.svgY} r={22}
                fill={dragColor} stroke="#36d399" strokeWidth={3} opacity={0.92} />
            </g>
          )}
        </svg>
      </div>

      {/* Thông báo */}
      {state.winner && (
        <div className={`rounded-2xl p-4 text-center font-bold text-base ${
          state.winner === "RED"
            ? "bg-red-900/50 text-red-200 border border-red-700"
            : "bg-slate-700 text-white border border-slate-500"
        }`}>
          {state.winner === "RED"
            ? "🔴 PHE ĐỎ THẮNG — đã vây bắt!"
            : "⚪ PHE TRẮNG THẮNG — trốn thoát!"}
        </div>
      )}
      {room.status === "Waiting" && (
        <div className="rounded-2xl p-3 text-center bg-amber-900/30 text-amber-300 text-sm border border-amber-800/50">
          Đang chờ đối thủ vào phòng…
        </div>
      )}
      {error && (
        <div className="rounded-xl p-2 text-center bg-red-900/40 text-red-300 text-sm">{error}</div>
      )}

      <button onClick={onLeave}
        className="w-full rounded-xl bg-slate-700 hover:bg-slate-600 active:bg-slate-500 px-4 py-3 font-medium text-base transition-colors">
        ← Rời phòng
      </button>
    </div>
  );
}
