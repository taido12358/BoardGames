import type { BangPublicPlayer, BangYourView } from "../types";
import { useDamageShake } from "../useDamageShake";
import { useWeaponEquipFlash } from "../useWeaponEquipFlash";

interface Props {
  me: BangPublicPlayer;
  you: BangYourView;
}

/** HP dạng viên đạn brass — còn nguyên = đồng dập nổi, đã bắn = vỏ rỗng. */
function HpBullets({ hp, maxHp }: { hp: number; maxHp: number }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-900/40 bg-black/40 px-3 py-1.5 backdrop-blur-sm" aria-label={`HP ${hp}/${maxHp}`}>
      {Array.from({ length: maxHp }, (_, i) => (
        i < hp ? (
          <div
            key={i}
            aria-hidden="true"
            className="h-5 w-2 rounded-t-sm border-t border-amber-300/60 bg-gradient-to-b from-amber-500 to-amber-700 shadow-[0_0_8px_rgba(245,158,11,0.4)]"
          />
        ) : (
          <div
            key={i}
            aria-hidden="true"
            className="h-5 w-2 rounded-t-sm border border-dashed border-amber-900/40 bg-stone-900/60 opacity-30"
          />
        )
      ))}
      <span className="ml-1 text-sm font-bold text-amber-200">
        {hp}<span className="text-amber-400/50 font-normal">/{maxHp}</span>
      </span>
    </div>
  );
}

/** Thông tin của CHÍNH người chơi — luôn ở dưới cùng màn hình (xem BangBoard). */
export default function LocalPlayerPanel({ me, you }: Props) {
  const shaking = useDamageShake(me.hp);
  const weaponEquipped = useWeaponEquipFlash(you.weapon);

  return (
    <div className={[
      "rounded-xl border-2 border-amber-600/50 bg-gradient-to-b from-[#2e2415] to-[#1c150c] p-3",
      "shadow-[inset_0_1px_0_rgba(251,191,36,0.08)]",
      shaking ? "animate-shake" : "",
    ].join(" ")}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[10px] text-amber-400/70 uppercase tracking-widest font-medium">Người chơi</div>
          <div className="font-bold text-base text-amber-100 leading-tight">{me.name}</div>
          <div className="text-xs text-amber-300/60">{me.character}</div>
        </div>
        <div className="text-right bg-amber-900/30 rounded-lg px-2.5 py-1.5 border border-amber-700/30">
          <div className="text-[10px] text-amber-400/70 uppercase tracking-wide">Vai trò</div>
          <div className="font-bold text-sm text-amber-200">{you.roleDisplay}</div>
        </div>
      </div>

      {/* HP + stats */}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <HpBullets hp={me.hp} maxHp={me.maxHp} />

        <div className={`flex items-center gap-1 text-sm text-amber-200 rounded -mx-0.5 px-0.5 ${weaponEquipped ? "animate-weapon-equip" : ""}`}>
          🔫 <span className="font-semibold">{you.weapon}</span>
          <span className="text-amber-400/50 text-xs">· tầm {you.weaponRange}</span>
        </div>

        <div className="flex items-center gap-1 text-sm text-amber-200">
          🃏 <span className="font-semibold">{you.hand.length}</span>
          <span className="text-amber-400/50 text-xs">lá bài</span>
        </div>
      </div>

      {me.equipment.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {me.equipment.map((eq) => (
            <span
              key={eq}
              className="inline-flex items-center gap-1 text-[11px] font-medium rounded-full bg-purple-900/50 border border-purple-700/40 px-2 py-0.5 text-purple-200"
            >
              {eq === "Thùng rượu" ? "🛢" : eq === "Ngựa" ? "🐎" : "🛡"} {eq}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
