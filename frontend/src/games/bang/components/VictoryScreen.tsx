import { RematchButton } from "../../../platform/RoomShell";
import { localOutcome, type BangViewerState } from "../types";

interface Props {
  state: BangViewerState;
  onLeave: () => void;
  /** undefined = khán giả, không cho chơi lại. */
  onRematch?: () => void;
  rematching: boolean;
}

const WINNER_CONFIG: Record<string, { title: string; emoji: string; color: string; glow: string }> = {
  sheriff: { title: "CẢNH SÁT TRƯỞNG CHIẾN THẮNG", emoji: "⭐", color: "text-amber-300", glow: "shadow-[0_0_40px_rgba(251,191,36,0.3)]" },
  outlaw:  { title: "KẺ NGOÀI VÒNG PHÁP LUẬT CHIẾN THẮNG", emoji: "🏴", color: "text-red-400",   glow: "shadow-[0_0_40px_rgba(220,38,38,0.3)]" },
  renegade:{ title: "KẺ PHẢN BỘI CHIẾN THẮNG", emoji: "🎭", color: "text-purple-400", glow: "shadow-[0_0_40px_rgba(168,85,247,0.3)]" },
};

const OUTCOME_ENTER_CLASS: Record<ReturnType<typeof localOutcome>, string> = {
  win: "animate-victory-win",
  lose: "animate-victory-lose",
  neutral: "animate-victory-neutral",
};

const OUTCOME_BADGE: Record<ReturnType<typeof localOutcome>, { text: string; cls: string } | null> = {
  win: { text: "🎉 BẠN THẮNG", cls: "bg-amber-900/60 border-amber-500/50 text-amber-200" },
  lose: { text: "💀 BẠN THUA", cls: "bg-[#7a201b]/60 border-[#9a3030]/60 text-[#d4a0a0]" },
  neutral: null,
};

/** Màn hình kết thúc ván — overlay toàn màn, animation theo kết quả cá nhân. */
export default function VictoryScreen({ state, onLeave, onRematch, rematching }: Props) {
  const winnerKey = (state.winner ?? "").toLowerCase();
  const cfg = WINNER_CONFIG[winnerKey] ?? { title: `${state.winner ?? "?"} THẮNG`, emoji: "🏆", color: "text-amber-300", glow: "" };
  const alive = state.players.filter((p) => p.alive);
  const dead = state.players.filter((p) => !p.alive);
  const outcome = localOutcome(state);
  const badge = OUTCOME_BADGE[outcome];

  return (
    <div className="fixed inset-0 z-50 bg-[#0d0a07]/88 backdrop-blur-sm backdrop-sepia-[0.4] flex items-center justify-center p-4">
      <div className={[
        "w-full max-w-md rounded-sm border-double border-8 border-amber-950 bg-amber-950/20 p-1 shadow-2xl",
        "shadow-[inset_0_0_40px_15px_rgba(0,0,0,0.8)]",
        cfg.glow,
        OUTCOME_ENTER_CLASS[outcome],
      ].join(" ")}>
      <div className={[
        "rounded-xs border border-amber-700/50",
        "bg-gradient-to-r from-[#1a130e] via-[#0d0a07] to-[#1a130e]",
        "p-6 text-center space-y-4",
      ].join(" ")}>

        {/* Icon + badge */}
        <div className="text-5xl">{cfg.emoji}</div>

        {badge && (
          <div className={`inline-block text-sm font-bold uppercase tracking-widest px-4 py-1.5 rounded-sm border ${badge.cls}`}>
            {badge.text}
          </div>
        )}

        {/* Winner title */}
        <h2 className={`font-serif font-black text-xl tracking-[0.15em] uppercase leading-tight -rotate-1 scale-105 [text-shadow:3px_3px_0px_#000,-1px_-1px_0px_rgba(255,191,0,0.25),0_3px_8px_rgba(0,0,0,0.9)] ${cfg.color}`}>
          {cfg.title}
        </h2>
        <div className="flex items-center justify-center gap-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-700/40" />
          <span className="text-amber-700/50 text-xs">✦</span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-700/40" />
        </div>

        {/* Player lists */}
        <div className="grid grid-cols-2 gap-3 text-left text-sm">
          <div>
            <div className="text-amber-400 text-xs font-bold mb-1.5 uppercase tracking-wide">✅ Còn sống</div>
            {alive.length === 0
              ? <div className="text-amber-900/40 text-xs">—</div>
              : alive.map((p) => (
                <div key={p.id} className="text-amber-200 text-xs py-0.5">
                  {p.name}
                  <span className="text-amber-700/60 ml-1">({p.publicRole})</span>
                </div>
              ))
            }
          </div>
          <div>
            <div className="text-red-400 text-xs font-bold mb-1.5 uppercase tracking-wide">💀 Bị loại</div>
            {dead.length === 0
              ? <div className="text-amber-900/40 text-xs">—</div>
              : dead.map((p) => (
                <div key={p.id} className="text-amber-700/50 text-xs py-0.5">
                  {p.name}
                  <span className="text-amber-900/60 ml-1">({p.publicRole})</span>
                </div>
              ))
            }
          </div>
        </div>

        <div className="text-[10px] text-amber-900/60 font-mono">
          {state.turnNumber} lượt
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {onRematch && <RematchButton onRematch={onRematch} loading={rematching} />}
          <button
            onClick={onLeave}
            className="w-full rounded-sm border border-[#6b4725]/60 bg-[#22140c]/90 px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-[#bba182] shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)] hover:border-[#b47a3c]/80 hover:bg-[#2c1a10] hover:text-[#f3d4a2] transition-all"
          >
            VỀ PHÒNG CHỜ
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
