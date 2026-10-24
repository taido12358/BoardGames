import type { BangPublicPlayer, BangYourView } from "../types";
import { useDamageShake } from "../useDamageShake";
import { useWeaponEquipFlashState } from "../useWeaponEquipFlash";
import { useHealFlash } from "../useHealFlash";
import { useTurnStartFlash } from "../useTurnStartFlash";
import { useEquipmentFlashState } from "../useEquipmentFlash";
import { useEquipmentLossFlash } from "../useEquipmentLossFlash";
import { useHpDelta } from "../useHpDelta";
import { useEliminationFlash } from "../useEliminationFlash";
import { useHandCountChange } from "../useHandCountChange";
import AnimatedNumber from "../../../components/AnimatedNumber";
import { changeFlashClass } from "../../useChangeFlash";
import EliminatedHandLoss from "./EliminatedHandLoss";

interface Props {
  me: BangPublicPlayer;
  you: BangYourView;
  isCurrentTurn?: boolean;
  roomId?: string;
  defenseKey?: number | null;
  duelLossKey?: number | null;
}

/** HP dạng viên đạn brass — còn nguyên = đồng dập nổi, đã bắn = vỏ rỗng. */
function HpBullets({ hp, maxHp, hpDelta }: { hp: number; maxHp: number; hpDelta: number | null }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-900/40 bg-black/40 px-3 py-1.5 backdrop-blur-sm" aria-label={`HP ${hp}/${maxHp}`}>
      {Array.from({ length: maxHp }, (_, i) => {
        const changed = hpDelta !== null && (hpDelta > 0 ? i >= hp - hpDelta && i < hp : i >= hp && i < hp - hpDelta);
        const animation = hpDelta !== null && changed ? (hpDelta > 0 ? "bang-hp-bullet-gain" : "bang-hp-bullet-loss") : "";
        const delayIndex = hpDelta === null ? 0 : hpDelta > 0 ? i - (hp - hpDelta) : i - hp;
        const animationStyle = changed ? { animationDelay: `${delayIndex * 42}ms` } : undefined;
        return (
          i < hp ? (
            <div
              key={i}
              aria-hidden="true"
              style={animationStyle}
              className={`h-5 w-2 rounded-t-sm border-t border-amber-300/60 bg-gradient-to-b from-amber-500 to-amber-700 shadow-[0_0_8px_rgba(245,158,11,0.4)] ${animation}`}
            />
          ) : (
            <div
              key={i}
              aria-hidden="true"
              style={animationStyle}
              className={`h-5 w-2 rounded-t-sm border border-dashed border-amber-900/40 bg-[#1a1208]/60 opacity-30 ${animation}`}
            />
          )
        );
      })}
      <span className="ml-1 text-sm font-bold text-amber-200">
        <AnimatedNumber value={hp} /><span className="text-amber-400/50 font-normal">/{maxHp}</span>
      </span>
    </div>
  );
}

/** Thông tin của CHÍNH người chơi — luôn ở dưới cùng màn hình (xem BangBoard). */
export default function LocalPlayerPanel({ me, you, isCurrentTurn = false, roomId, defenseKey, duelLossKey }: Props) {
  const shaking = useDamageShake(me.hp, roomId);
  const healing = useHealFlash(me.hp, roomId);
  const hpDeltaState = useHpDelta(me.hp, roomId);
  const hpDelta = hpDeltaState?.value ?? null;
  const eliminationFlash = useEliminationFlash(me.alive, roomId);
  const handChange = useHandCountChange(you.hand.length, roomId);
  const turnStarted = useTurnStartFlash(isCurrentTurn, roomId);
  const weaponEquipped = useWeaponEquipFlashState(you.weapon, roomId);
  const newEquipment = useEquipmentFlashState(me.equipment, roomId);
  const leavingEquipment = useEquipmentLossFlash(me.equipment, roomId);

  return (
    <div data-player-id={me.id} className={[ 
      "relative overflow-hidden rounded-sm border-2 border-amber-600/50 bg-gradient-to-b from-[#2e2415] to-[#1c150c] p-3",
      "shadow-[inset_0_1px_0_rgba(251,191,36,0.10),0_0_20px_rgba(0,0,0,0.6)]",
      changeFlashClass(shaking, "animate-shake"),
    ].join(" ")}>
      {healing.active && <span key={`heal-${healing.sequence}`} aria-hidden="true" className="bang-seat-heal-glow" />}
      {turnStarted.active && <span key={`turn-${turnStarted.sequence}`} aria-hidden="true" className="bang-seat-turn-glow" />}
      {defenseKey != null && <span key={defenseKey} aria-hidden="true" className="bang-defense-flash">🛡</span>}
      {duelLossKey != null && <span key={duelLossKey} aria-hidden="true" className="bang-duel-loss-flash">⚡</span>}
      {hpDelta !== null && (
        <span key={hpDeltaState?.sequence} aria-hidden="true" className={`bang-hp-delta bang-hp-delta-local ${hpDelta > 0 ? "is-heal" : "is-damage"}`}>
          {hpDelta > 0 ? "+" : "−"}{Math.abs(hpDelta)} HP
        </span>
      )}
      {eliminationFlash && <span aria-hidden="true" className="bang-elimination-flash"><span>💀</span><span>BỊ LOẠI</span></span>}
      {eliminationFlash && !me.alive && handChange?.kind === "loss" && handChange.amount > 0 && (
        <EliminatedHandLoss amount={handChange.amount} />
      )}
      {/* Worn leather vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.28)_100%)] rounded-sm" />
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[10px] text-amber-400/70 uppercase tracking-widest font-medium">Người chơi</div>
          <div className="font-bold text-base text-[#f5d09d] leading-tight">{me.name}</div>
          <div style={{ animationDelay: "90ms" }} className="bang-role-reveal text-xs text-[#d4b996]/60">{me.character}</div>
        </div>
        <div className="text-right bg-amber-900/30 rounded-sm px-2.5 py-1.5 border border-amber-700/30">
          <div className="text-[10px] text-[#bba182] uppercase tracking-wide">Vai trò</div>
          <div className="bang-role-reveal font-bold text-sm text-[#e8c07e]">{you.roleDisplay}</div>
        </div>
      </div>

      {/* HP + stats */}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <HpBullets hp={me.hp} maxHp={me.maxHp} hpDelta={hpDelta} />

        <div data-bang-equipment-owner={me.id} data-bang-equipment-name={you.weapon} className={`flex items-center gap-1 text-sm text-[#d4b996] rounded -mx-0.5 px-0.5 ${changeFlashClass(weaponEquipped, "animate-weapon-equip")}`}>
          🔫 <span className="font-semibold">{you.weapon}</span>
          <span className="text-amber-400/50 text-xs">· tầm {you.weaponRange}</span>
        </div>

        <div className={`relative flex items-center gap-1 text-sm text-[#d4b996] ${handChange ? `animate-card-${handChange.kind === "draw" ? "count" : "loss"}-${handChange.sequence % 2 === 0 ? "b" : "a"}` : ""}`}>
          🃏 <AnimatedNumber value={you.hand.length} className="font-semibold" />
          <span className="text-amber-400/50 text-xs">lá bài</span>
          {handChange && me.alive && <span key={`${handChange.kind}-${you.hand.length}`} aria-hidden="true" className={`bang-hand-count-delta ${handChange.kind === "draw" ? "is-draw" : "is-loss"}`}>{handChange.kind === "draw" ? "+" : "−"}{handChange.amount} lá</span>}
        </div>
      </div>

      {(me.equipment.length > 0 || leavingEquipment.size > 0) && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {me.equipment.map((eq) => (
            <span
              key={eq}
              data-bang-equipment-owner={me.id}
              data-bang-equipment-name={eq}
              className={`inline-flex items-center gap-1 text-[11px] font-medium rounded-sm border border-[#8b5a2b]/50 bg-[#3a2012]/80 px-2 py-0.5 text-[#e8c07e] shadow-inner ${newEquipment.has(eq) ? changeFlashClass(newEquipment.get(eq)!, "animate-equipment-enter") : ""}`}
            >
              {eq === "Thùng rượu" ? "🛢" : eq === "Ngựa" ? "🐎" : "🛡"} {eq}
            </span>
          ))}
          {[...leavingEquipment].map(([eq, sequence]) => (
            <span
              key={`leaving-${eq}-${sequence}`}
              aria-hidden="true"
              className="bang-equipment-exit inline-flex items-center gap-1 text-[11px] font-medium rounded-sm border border-red-800/50 bg-red-950/70 px-2 py-0.5 text-red-200/80"
            >
              {eq === "Thùng rượu" ? "🛢" : eq === "Ngựa" ? "🐎" : "🛡"} {eq}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
