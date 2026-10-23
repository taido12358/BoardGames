import { ROLE_ICON, type BangPublicPlayer } from "../types";
import { useDamageShake } from "../useDamageShake";
import { useWeaponEquipFlash } from "../useWeaponEquipFlash";

interface Props {
  player: BangPublicPlayer;
  isCurrentTurn: boolean;
  isMe: boolean;
  targetable: boolean;
  targeting: boolean;
  onClick?: () => void;
}

/** Hiển thị HP theo kiểu viên đạn brass (còn nguyên = đồng thau dập nổi, đã bắn = vỏ rỗng). */
function HpBullets({ hp, maxHp }: { hp: number; maxHp: number }) {
  return (
    <div className="flex items-center gap-1 flex-wrap" aria-label={`HP ${hp}/${maxHp}`}>
      {Array.from({ length: maxHp }, (_, i) => (
        i < hp ? (
          <div
            key={i}
            aria-hidden="true"
            className="h-4 w-[6px] rounded-t-sm border-t border-amber-300/60 bg-gradient-to-b from-amber-500 to-amber-700 shadow-[0_0_6px_rgba(245,158,11,0.4)]"
          />
        ) : (
          <div
            key={i}
            aria-hidden="true"
            className="h-4 w-[6px] rounded-t-sm border border-dashed border-amber-900/40 bg-stone-900/60 opacity-30"
          />
        )
      ))}
      <span className="ml-0.5 text-[10px] font-mono text-amber-300/60">{hp}/{maxHp}</span>
    </div>
  );
}

const FACTION_BORDER: Record<string, string> = {
  Sheriff:  "border-amber-500/60 shadow-[0_0_15px_-3px_rgba(245,158,11,0.3)]",
  Outlaw:   "border-red-700/50 shadow-[0_0_15px_-3px_rgba(220,38,38,0.25)]",
  Renegade: "border-slate-500/50 shadow-[0_0_15px_-3px_rgba(100,116,139,0.3)]",
  Deputy:   "border-amber-700/40",
};

/** HUD của MỘT người chơi quanh bàn — không bao giờ lộ mặt bài của họ, chỉ số lượng. */
export default function PlayerSeat({ player, isCurrentTurn, isMe, targetable, targeting, onClick }: Props) {
  const shaking = useDamageShake(player.hp);
  const weaponEquipped = useWeaponEquipFlash(player.weapon);
  const factionCls = FACTION_BORDER[player.publicRole] ?? "border-[#4a3620]";

  return (
    <button
      type="button"
      onClick={targetable ? onClick : undefined}
      disabled={!targetable}
      className={[
        "w-full text-left rounded-xl border-2 p-2.5 transition-all",
        player.alive
          ? "bg-gradient-to-b from-[#2b2013] to-[#1c150c]"
          : "bg-[#141010] grayscale opacity-50",
        isCurrentTurn
          ? "border-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.55)]"
          : factionCls,
        targeting && !targetable ? "opacity-30" : "",
        targetable ? "cursor-pointer ring-2 ring-amber-300 hover:ring-amber-200 hover:border-amber-300" : "cursor-default",
        shaking ? "animate-shake" : "",
      ].join(" ")}
    >
      {/* Name row */}
      <div className="flex items-center justify-between gap-1">
        <div className="min-w-0 flex-1">
          <div className="font-bold text-sm text-amber-100 truncate flex items-center gap-1">
            {isMe ? "BẠN" : player.name}
            {isCurrentTurn && (
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            )}
          </div>
          <div className="text-[10px] text-amber-200/60 truncate">
            {ROLE_ICON[player.publicRole] ?? "❓"} {player.publicRole}
          </div>
        </div>
        <div className="shrink-0 text-[10px] text-amber-300/60 text-right">
          {player.alive
            ? <span className="text-slate-400">{player.character}</span>
            : <span className="text-lg">💀</span>}
        </div>
      </div>

      {/* HP bullets */}
      <div className="mt-2">
        <HpBullets hp={player.hp} maxHp={player.maxHp} />
      </div>

      {/* Weapon + card count */}
      <div className="mt-1.5 flex items-center justify-between text-[10px] text-amber-200/70">
        <span className={`rounded-sm px-0.5 -mx-0.5 ${weaponEquipped ? "animate-weapon-equip" : ""}`}>
          🔫 <span className="font-semibold">{player.weapon}</span>
          <span className="text-amber-300/50"> ·{player.weaponRange}</span>
        </span>
        <span>🃏 {player.cardCount}</span>
      </div>

      {/* Equipment */}
      {player.equipment.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {player.equipment.map((eq) => (
            <span
              key={eq}
              className="inline-flex items-center gap-0.5 text-[9px] rounded-full border border-amber-800/40 bg-amber-950/40 px-1.5 py-0.5 text-amber-400/80 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]"
            >
              {eq === "Thùng rượu" ? "🛢" : eq === "Ngựa" ? "🐎" : "🛡"} {eq}
            </span>
          ))}
        </div>
      )}

      {/* Range indicator */}
      {!isMe && player.distance !== null && (
        <div className={`mt-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold text-center ${
          player.inRange
            ? "bg-amber-900/40 text-amber-300 border border-amber-700/40 shadow-[0_0_8px_rgba(245,158,11,0.2)]"
            : "border border-amber-950/60 bg-[#0d0805]/60 text-amber-900/50 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]"
        }`}>
          {player.inRange ? "✦ TRONG TẦM" : `✕ ${player.distance} ô`}
        </div>
      )}
    </button>
  );
}
