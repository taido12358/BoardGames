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
  lose: { text: "💀 BẠN THUA", cls: "bg-red-950/60 border-red-700/50 text-red-300" },
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
    <div className="fixed inset-0 z-50 bg-black/88 flex items-center justify-center p-4">
      <div className={[
        "w-full max-w-md rounded-2xl border border-amber-600/30 bg-amber-950/20 p-1 shadow-2xl",
        cfg.glow,
        OUTCOME_ENTER_CLASS[outcome],
      ].join(" ")}>
      <div className={[
        "rounded-xl border border-amber-700/50",
        "bg-gradient-to-b from-[#2b2013] via-[#1c150c] to-[#120d08]",
        "p-6 text-center space-y-4",
      ].join(" ")}>

        {/* Icon + badge */}
        <div className="text-5xl">{cfg.emoji}</div>

        {badge && (
          <div className={`inline-block text-sm font-bold tracking-wide px-4 py-1.5 rounded-full border ${badge.cls}`}>
            {badge.text}
          </div>
        )}

        {/* Winner title */}
        <h2 className={`font-western text-lg tracking-wide leading-tight [text-shadow:0_1px_0_rgba(255,255,255,0.15),0_2px_6px_rgba(0,0,0,0.9)] ${cfg.color}`}>
          {cfg.title}
        </h2>

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
            className="w-full rounded-xl border border-amber-950/80 bg-[#140e0b]/90 px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-amber-700/70 shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)] hover:border-amber-700/60 hover:bg-[#1a120d] hover:text-amber-400 transition-all"
          >
            VỀ PHÒNG CHỜ
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
