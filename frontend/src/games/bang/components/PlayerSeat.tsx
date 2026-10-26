import { ROLE_ICON, type BangPublicPlayer } from "../types";
import { useDamageShake } from "../useDamageShake";
import { useWeaponEquipFlashState } from "../useWeaponEquipFlash";
import { useHandCountChange } from "../useHandCountChange";
import { useHealFlash } from "../useHealFlash";
import { useTurnStartFlash } from "../useTurnStartFlash";
import { useEquipmentFlashState } from "../useEquipmentFlash";
import { useEquipmentLossFlash } from "../useEquipmentLossFlash";
import { useHpDelta } from "../useHpDelta";
import { useEliminationFlash } from "../useEliminationFlash";
import AnimatedNumber from "../../../components/AnimatedNumber";
import { changeFlashClass, useChangeFlash } from "../../useChangeFlash";
import EliminatedHandLoss from "./EliminatedHandLoss";

interface Props {
  player: BangPublicPlayer;
  isCurrentTurn: boolean;
  isMe: boolean;
  targetable: boolean;
  targeting: boolean;
  dragTarget?: boolean;
  dragInvalidTarget?: boolean;
  dragInvalidDrop?: number;
  draggingCard?: boolean;
  onClick?: () => void;
  roomId?: string;
  defenseKey?: number | null;
  duelLossKey?: number | null;
  roleRevealDelayMs?: number;
}

/** Hiển thị HP theo kiểu viên đạn brass (còn nguyên = đồng thau dập nổi, đã bắn = vỏ rỗng). */
function HpBullets({ hp, maxHp, hpDelta }: { hp: number; maxHp: number; hpDelta: number | null }) {
  return (
    <div className="flex items-center gap-1 flex-wrap" aria-label={`HP ${hp}/${maxHp}`}>
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
              className={`h-4 w-[6px] rounded-t-sm border-t border-amber-300/60 bg-gradient-to-b from-amber-500 to-amber-700 shadow-[0_0_6px_rgba(245,158,11,0.4)] ${animation}`}
            />
          ) : (
            <div
              key={i}
              aria-hidden="true"
              style={animationStyle}
              className={`h-4 w-[6px] rounded-t-sm border border-dashed border-amber-900/40 bg-[#1a1208]/60 opacity-30 ${animation}`}
            />
          )
        );
      })}
      <span className="ml-0.5 text-[10px] font-mono text-amber-300/60"><AnimatedNumber value={hp} />/{maxHp}</span>
    </div>
  );
}

const FACTION_BORDER: Record<string, string> = {
  Sheriff:  "border-amber-500/60 shadow-[0_0_15px_-3px_rgba(245,158,11,0.3)]",
  Outlaw:   "border-red-700/50 shadow-[0_0_15px_-3px_rgba(220,38,38,0.25)]",
  Renegade: "border-amber-700/30 shadow-[0_0_15px_-3px_rgba(180,120,30,0.2)]",
  Deputy:   "border-amber-700/40",
};

/** HUD của MỘT người chơi quanh bàn — không bao giờ lộ mặt bài của họ, chỉ số lượng. */
export default function PlayerSeat({ player, isCurrentTurn, isMe, targetable, targeting, dragTarget = false, dragInvalidTarget = false, dragInvalidDrop, draggingCard = false, onClick, roomId, defenseKey, duelLossKey, roleRevealDelayMs = 0 }: Props) {
  const shaking = useDamageShake(player.hp, roomId);
  const healing = useHealFlash(player.hp, roomId);
  const hpDeltaState = useHpDelta(player.hp, roomId);
  const hpDelta = hpDeltaState?.value ?? null;
  const eliminationFlash = useEliminationFlash(player.alive, roomId);
  const turnStarted = useTurnStartFlash(isCurrentTurn, roomId);
  const handChange = useHandCountChange(player.cardCount, roomId);
  const weaponEquipped = useWeaponEquipFlashState(player.weapon, roomId);
  const newEquipment = useEquipmentFlashState(player.equipment, roomId);
  const leavingEquipment = useEquipmentLossFlash(player.equipment, roomId);
  const rangeState = player.distance === null ? undefined : `${player.distance}:${player.inRange}`;
  const rangeChanged = useChangeFlash(rangeState, 520, roomId);
  const factionCls = FACTION_BORDER[player.publicRole] ?? "border-[#4a3620]";

  return (
    <button
      type="button"
      data-player-id={player.id}
      onClick={targetable ? onClick : undefined}
      disabled={!targetable && !draggingCard}
      className={[
        "relative overflow-hidden w-full text-left rounded-sm border-2 p-2.5 transition-all",
        player.alive
          ? "bg-gradient-to-b from-[#2e2214] to-[#1a130a] shadow-[inset_0_1px_0_rgba(255,200,100,0.06)]"
          : "bg-[#141010] grayscale opacity-50",
        isCurrentTurn
          ? "border-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.6),inset_0_1px_0_rgba(255,220,100,0.12)]"
          : factionCls,
        targeting && !targetable ? "opacity-30" : "",
        targetable ? "bang-targetable cursor-pointer ring-2 ring-amber-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:ring-amber-200 hover:border-amber-300 focus-visible:-translate-y-0.5 focus-visible:scale-[1.02] focus-visible:ring-amber-200 focus-visible:border-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-100 active:translate-y-0 active:scale-[0.99]" : "cursor-default",
        dragTarget ? "bang-drag-over-target" : "",
        dragInvalidTarget ? "bang-drag-invalid-target" : "",
        dragInvalidDrop !== undefined ? `bang-drag-invalid-drop-${dragInvalidDrop % 2 === 0 ? "a" : "b"}` : "",
      changeFlashClass(shaking, "animate-shake"),
      ].join(" ")}
    >
      {healing.active && <span key={`heal-${healing.sequence}`} aria-hidden="true" className="bang-seat-heal-glow" />}
      {turnStarted.active && <span key={`turn-${turnStarted.sequence}`} aria-hidden="true" className="bang-seat-turn-glow" />}
      {defenseKey != null && <span key={defenseKey} aria-hidden="true" className="bang-defense-flash">💨</span>}
      {duelLossKey != null && <span key={duelLossKey} aria-hidden="true" className="bang-duel-loss-flash">⚡</span>}
      {hpDelta !== null && (
        <span key={hpDeltaState?.sequence} aria-hidden="true" className={`bang-hp-delta bang-hp-delta-seat ${hpDelta > 0 ? "is-heal" : "is-damage"}`}>
          {hpDelta > 0 ? "+" : "−"}{Math.abs(hpDelta)} HP
        </span>
      )}
      {/* Worn leather vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.3)_100%)] pointer-events-none rounded-sm" />
      {eliminationFlash && <span aria-hidden="true" className="bang-elimination-flash"><span>💀</span><span>BỊ LOẠI</span></span>}
      {eliminationFlash && !player.alive && handChange?.kind === "loss" && handChange.amount > 0 && (
        <EliminatedHandLoss amount={handChange.amount} />
      )}
      {/* Name row */}
      <div className="flex items-center justify-between gap-1">
        <div className="min-w-0 flex-1">
          <div className="font-bold text-sm text-[#f5d09d] truncate flex items-center gap-1">
            {isMe ? "BẠN" : player.name}
            {targetable && <span aria-hidden="true" className="bang-target-cue">⊕</span>}
            {isCurrentTurn && (
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 game-turn-beacon" />
            )}
          </div>
          <div style={{ animationDelay: `${roleRevealDelayMs}ms` }} className="bang-role-reveal text-[10px] text-[#bba182]/60 truncate">
            {ROLE_ICON[player.publicRole] ?? "❓"} {player.publicRole}
          </div>
        </div>
        <div className="shrink-0 text-[10px] text-amber-300/60 text-right">
          {player.alive
            ? <span style={{ animationDelay: `${roleRevealDelayMs + 90}ms` }} className="bang-role-reveal text-amber-700/60">{player.character}</span>
            : <span className="text-lg">💀</span>}
        </div>
      </div>

      {/* HP bullets */}
      <div className="mt-2">
        <HpBullets hp={player.hp} maxHp={player.maxHp} hpDelta={hpDelta} />
      </div>

      {/* Weapon + card count */}
      <div className="mt-1.5 flex items-center justify-between text-[10px] text-[#d4b996]/70">
        <span data-bang-equipment-owner={player.id} data-bang-equipment-name={player.weapon} className={`rounded-sm px-0.5 -mx-0.5 ${changeFlashClass(weaponEquipped, "animate-weapon-equip")}`}>
          🔫 <span className="font-semibold">{player.weapon}</span>
          <span className="text-amber-300/50"> ·{player.weaponRange}</span>
        </span>
        <span className={`relative ${handChange ? `animate-card-${handChange.kind === "draw" ? "count" : "loss"}-${handChange.sequence % 2 === 0 ? "b" : "a"}` : ""}`}>
          🃏 <AnimatedNumber value={player.cardCount} />
          {handChange && player.alive && <span key={`${handChange.kind}-${player.cardCount}`} aria-hidden="true" className={`bang-hand-count-delta ${handChange.kind === "draw" ? "is-draw" : "is-loss"}`}>{handChange.kind === "draw" ? "+" : "−"}{handChange.amount} lá</span>}
        </span>
      </div>

      {/* Equipment */}
      {(player.equipment.length > 0 || leavingEquipment.size > 0) && (
        <div className="mt-1 flex flex-wrap gap-1">
          {player.equipment.map((eq) => (
            <span
              key={eq}
              data-bang-equipment-owner={player.id}
              data-bang-equipment-name={eq}
              className={`inline-flex items-center gap-0.5 text-[9px] rounded-sm border border-[#8b5a2b]/50 bg-[#3a2012]/80 px-1.5 py-0.5 text-[#e8c07e] shadow-inner ${newEquipment.has(eq) ? changeFlashClass(newEquipment.get(eq)!, "animate-equipment-enter") : ""}`}
            >
              {eq === "Thùng rượu" ? "🛢" : eq === "Ngựa" ? "🐎" : "🔫"} {eq}
            </span>
          ))}
          {[...leavingEquipment].map(([eq, sequence]) => (
            <span
              key={`leaving-${eq}-${sequence}`}
              aria-hidden="true"
              className="bang-equipment-exit inline-flex items-center gap-0.5 text-[9px] rounded-sm border border-red-800/50 bg-red-950/70 px-1.5 py-0.5 text-red-200/80"
            >
              {eq === "Thùng rượu" ? "🛢" : eq === "Ngựa" ? "🐎" : "🔫"} {eq}
            </span>
          ))}
        </div>
      )}

      {/* Range indicator */}
      {!isMe && player.distance !== null && (
        <div className={`mt-1.5 rounded-sm px-1.5 py-0.5 text-[10px] font-semibold text-center ${changeFlashClass(rangeChanged, "bang-range-change")} ${
          player.inRange
            ? "bg-[#3d2008]/70 text-[#f5c872] border border-[#c87d2a]/60 shadow-[0_0_10px_rgba(200,125,42,0.3),inset_0_1px_0_rgba(255,200,100,0.1)]"
            : "border border-amber-950/40 bg-[#0d0805]/50 text-amber-900/40 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]"
        }`}>
          {player.inRange ? "✦ TRONG TẦM" : `✕ ${player.distance} ô`}
        </div>
      )}
    </button>
  );
}
