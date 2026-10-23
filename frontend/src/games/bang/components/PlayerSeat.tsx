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

/** Hiển thị HP theo bullet-hole style: vàng=còn, đỏ tối=mất. */
function HpBullets({ hp, maxHp }: { hp: number; maxHp: number }) {
  return (
    <div className="flex items-center gap-0.5 flex-wrap" aria-label={`HP ${hp}/${maxHp}`}>
      {Array.from({ length: maxHp }, (_, i) => (
        <span
          key={i}
          className={`inline-block rounded-full border ${
            i < hp
              ? "w-3 h-3 bg-amber-400 border-amber-600 shadow-[0_0_4px_rgba(251,191,36,0.6)]"
              : "w-3 h-3 bg-red-950/80 border-red-800"
          }`}
          aria-hidden="true"
        />
      ))}
      <span className="ml-1 text-[10px] font-mono text-amber-300/70">{hp}/{maxHp}</span>
    </div>
  );
}

/** HUD của MỘT người chơi quanh bàn — không bao giờ lộ mặt bài của họ, chỉ số lượng. */
export default function PlayerSeat({ player, isCurrentTurn, isMe, targetable, targeting, onClick }: Props) {
  const shaking = useDamageShake(player.hp);
  const weaponEquipped = useWeaponEquipFlash(player.weapon);

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
          : "border-[#4a3620]",
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
        <div className="mt-0.5 text-[10px] text-amber-300/60 truncate">
          🛡 {player.equipment.join(" · ")}
        </div>
      )}

      {/* Range indicator */}
      {!isMe && player.distance !== null && (
        <div className={`mt-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold text-center ${
          player.inRange
            ? "bg-emerald-900/70 text-emerald-300 border border-emerald-700/40"
            : "bg-slate-800/60 text-slate-500 border border-slate-700/30"
        }`}>
          {player.inRange ? "✦ TRONG TẦM" : `✕ ${player.distance} ô`}
        </div>
      )}
    </button>
  );
}
