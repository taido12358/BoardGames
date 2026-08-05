import type { BangViewerState } from "../types";

interface Props {
  state: BangViewerState;
  onLeave: () => void;
}

const WINNER_TITLE: Record<string, { title: string; color: string }> = {
  sheriff: { title: "CẢNH SÁT TRƯỞNG CHIẾN THẮNG", color: "text-amber-300" },
  outlaw: { title: "KẺ NGOÀI VÒNG PHÁP LUẬT CHIẾN THẮNG", color: "text-red-400" },
  renegade: { title: "KẺ PHẢN BỘI CHIẾN THẮNG", color: "text-purple-400" },
};

/** Màn hình chiến thắng — che toàn màn hình khi ván kết thúc (§29). */
export default function VictoryScreen({ state, onLeave }: Props) {
  const winnerKey = (state.winner ?? "").toLowerCase();
  const info = WINNER_TITLE[winnerKey] ?? { title: `${state.winner ?? "?"} CHIẾN THẮNG`, color: "text-amber-300" };
  const alive = state.players.filter((p) => p.alive);
  const dead = state.players.filter((p) => !p.alive);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border-2 border-amber-600 bg-gradient-to-b from-[#241a10] to-[#120d08] p-6 text-center space-y-4 shadow-2xl">
        <div className="text-4xl">🏆</div>
        <h2 className={`text-xl font-black tracking-wide ${info.color}`}>{info.title}</h2>

        <div className="grid grid-cols-2 gap-3 text-left text-sm">
          <div>
            <div className="text-emerald-400 font-semibold mb-1">✅ Còn sống</div>
            {alive.length === 0 && <div className="text-slate-500">—</div>}
            {alive.map((p) => (
              <div key={p.id} className="text-slate-300">{p.name} <span className="text-slate-500">({p.publicRole})</span></div>
            ))}
          </div>
          <div>
            <div className="text-red-400 font-semibold mb-1">💀 Đã bị loại</div>
            {dead.length === 0 && <div className="text-slate-500">—</div>}
            {dead.map((p) => (
              <div key={p.id} className="text-slate-400">{p.name} <span className="text-slate-500">({p.publicRole})</span></div>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-500">Tổng số lượt: {state.turnNumber}</div>

        <button
          onClick={onLeave}
          className="w-full rounded-xl bg-amber-700 hover:bg-amber-600 px-4 py-3 font-bold text-sm transition-colors"
        >
          VỀ PHÒNG CHỜ
        </button>
      </div>
    </div>
  );
}
