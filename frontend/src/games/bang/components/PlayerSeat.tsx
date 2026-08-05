import { ROLE_ICON, type BangPublicPlayer } from "../types";

interface Props {
  player: BangPublicPlayer;
  isCurrentTurn: boolean;
  isMe: boolean;
  targetable: boolean;   // đang trong chế độ chọn mục tiêu VÀ hợp lệ
  targeting: boolean;    // đang trong chế độ chọn mục tiêu (để làm mờ người không hợp lệ)
  onClick?: () => void;
}

/** HUD của MỘT người chơi quanh bàn — không bao giờ lộ mặt bài của họ, chỉ số lượng. */
export default function PlayerSeat({ player, isCurrentTurn, isMe, targetable, targeting, onClick }: Props) {
  const hearts = Array.from({ length: player.maxHp }, (_, i) => i < player.hp);

  return (
    <button
      type="button"
      onClick={targetable ? onClick : undefined}
      disabled={!targetable}
      className={`w-full text-left rounded-xl border-2 p-2.5 transition-all
        ${player.alive ? "bg-[#241a10]" : "bg-[#1a1410] grayscale opacity-60"}
        ${isCurrentTurn ? "border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]" : "border-[#4a3620]"}
        ${targeting && !targetable ? "opacity-35" : ""}
        ${targetable ? "cursor-pointer ring-2 ring-amber-300 hover:ring-amber-200" : "cursor-default"}
      `}
    >
      <div className="flex items-center justify-between gap-1">
        <div className="min-w-0">
          <div className="font-bold text-sm text-amber-100 truncate">
            {isMe ? "BẠN" : player.name}
            {isCurrentTurn && <span className="ml-1 text-amber-400">●</span>}
          </div>
          <div className="text-[11px] text-amber-200/70 truncate">
            {ROLE_ICON[player.publicRole] ?? "❓"} {player.publicRole} · {player.character}
          </div>
        </div>
        {!player.alive && <span className="shrink-0 text-lg" title="Đã bị loại">💀</span>}
      </div>

      <div className="mt-1.5 flex items-center gap-0.5 flex-wrap" aria-label={`HP ${player.hp}/${player.maxHp}`}>
        {hearts.map((full, i) => (
          <span key={i} className={full ? "text-red-500" : "text-slate-700"}>{full ? "❤️" : "🖤"}</span>
        ))}
        <span className="ml-1 text-[11px] text-amber-200/80">{player.hp}/{player.maxHp}</span>
      </div>

      <div className="mt-1 flex items-center justify-between text-[11px] text-amber-200/80">
        <span>🔫 {player.weapon} (tầm {player.weaponRange})</span>
        <span>🃏 {player.cardCount} lá</span>
      </div>

      {player.equipment.length > 0 && (
        <div className="mt-0.5 text-[10px] text-amber-300/70 truncate">
          🛠 {player.equipment.join(", ")}
        </div>
      )}

      {!isMe && player.distance !== null && (
        <div className={`mt-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-center ${
          player.inRange ? "bg-emerald-900/60 text-emerald-300" : "bg-slate-800 text-slate-500"
        }`}>
          Khoảng cách: {player.distance} {player.inRange ? "· ✓ TRONG TẦM" : "· ✕ NGOÀI TẦM"}
        </div>
      )}
    </button>
  );
}
