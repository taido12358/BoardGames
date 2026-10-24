import type { DragEvent } from "react";
import { CARD_DISPLAY, type Card, type CardKind } from "../types";

interface Props {
  card: Card;
  selected?: boolean;
  pending?: boolean;
  rejected?: boolean;
  rejectedSequence?: number;
  selectionMode?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  responseReady?: boolean;
  responseReadyDelayMs?: number;
  small?: boolean;
  hideIdentity?: boolean;
  onDragStart?: (event: DragEvent<HTMLButtonElement>) => void;
  onDragEnd?: (event: DragEvent<HTMLButtonElement>) => void;
  onClick?: () => void;
}

const suitColor = (suit: string) => (suit === "♥" || suit === "♦" ? "text-[#b03030]" : "text-[#2c1a0c]");

const CARD_EFFECT: Record<CardKind, string> = {
  bang: "Bắn 1 mục tiêu trong tầm. Trúng: −1 máu.",
  missed: "Đỡ Bang! hoặc Gatling. Không mất máu.",
  beer: "Hồi 1 máu cho bạn. Doc hồi 2.",
  gatling: "Bắn tất cả đối thủ. Trúng: −1 máu.",
  duel: "Luân phiên dùng Bang! Người bỏ cuộc mất 1 máu.",
  indians: "Mỗi đối thủ bỏ Bang! hoặc mất 1 máu.",
  panic: "Lấy 1 lá của người ở khoảng cách 1.",
  catBalou: "Bỏ 1 lá của người chơi khác.",
  stagecoach: "Rút ngay 2 lá bài.",
  wellsFargo: "Rút ngay 3 lá bài.",
  volcanic: "Trang bị: bắn Bang! nhiều lần mỗi lượt.",
  schofield: "Trang bị: tầm bắn 2.",
  remington: "Trang bị: tầm bắn 3.",
  mustang: "Trang bị: đối thủ nhìn bạn xa hơn 1.",
  barrel: "Trang bị: lật ♥ để né Bang! hoặc Gatling.",
};

type CardCategory = "attack" | "defense" | "heal" | "weapon" | "equipment" | "action";

function cardCategory(kind: CardKind): CardCategory {
  if (kind === "bang" || kind === "gatling" || kind === "duel" || kind === "indians") return "attack";
  if (kind === "missed") return "defense";
  if (kind === "beer") return "heal";
  if (kind === "volcanic" || kind === "schofield" || kind === "remington") return "weapon";
  if (kind === "mustang" || kind === "barrel") return "equipment";
  return "action";
}

const CATEGORY_STYLE: Record<CardCategory, { bg: string; border: string; text: string; stripe: string }> = {
  attack:    { bg: "from-[#f5e8df] to-[#d4a88c]", border: "#8b2515", text: "text-red-950",    stripe: "bg-red-900/8" },
  defense:   { bg: "from-[#dde8f0] to-[#a8bfd4]", border: "#2a4f70", text: "text-slate-900",  stripe: "bg-blue-900/8" },
  heal:      { bg: "from-[#dff0e0] to-[#9ec89e]", border: "#1a5a2c", text: "text-green-950",  stripe: "bg-green-900/8" },
  weapon:    { bg: "from-[#f5e8cc] to-[#d4a850]", border: "#7a3e08", text: "text-amber-950",  stripe: "bg-amber-900/8" },
  equipment: { bg: "from-[#e8ddf5] to-[#b898cc]", border: "#4a2070", text: "text-purple-950", stripe: "bg-purple-900/8" },
  action:    { bg: "from-[#f5f0cc] to-[#d8c850]", border: "#6b5008", text: "text-yellow-950", stripe: "bg-yellow-900/8" },
};

/** Một lá bài trong bộ BANG! — color-coded theo loại (đỏ=tấn công, xanh=phòng thủ, v.v.). */
export default function CardView({ card, selected, pending, rejected, rejectedSequence = 0, selectionMode, disabled, disabledReason, responseReady, responseReadyDelayMs = 0, small, hideIdentity, onDragStart, onDragEnd, onClick }: Props) {
  const display = CARD_DISPLAY[card.kind];
  const cat = cardCategory(card.kind);
  const cs = CATEGORY_STYLE[cat];

  return (
    <button
      type="button"
      data-card-id={card.id}
      disabled={disabled || !onClick}
      onClick={onClick}
      title={disabled && disabledReason
        ? `${display.name} — ${disabledReason}`
        : `${display.name}${onDragStart ? " · Kéo để chơi hoặc chọn mục tiêu" : ""}`}
      aria-label={display.name}
      aria-description={`${card.rank}${card.suit}. ${CARD_EFFECT[card.kind]}${!disabled && onDragStart ? " Có thể kéo thả để thao tác." : ""}${disabled && disabledReason ? ` Không thể dùng: ${disabledReason}` : ""}`}
      aria-pressed={selectionMode ? !!selected : undefined}
      draggable={!!onDragStart && !disabled}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={[
        "relative shrink-0 rounded-sm border-2 text-left transition-all duration-200 ease-[cubic-bezier(0.2,0.75,0.25,1)] select-none overflow-hidden active:scale-[0.97]",
        selected ? "bang-card-selected" : "",
        pending ? "bang-card-pending" : "",
        rejected ? `bang-card-rejected-${rejectedSequence % 2 === 0 ? "a" : "b"}` : "",
        `bg-gradient-to-b ${cs.bg}`,
        small ? "w-16 h-24 p-1.5" : "w-24 h-36 p-2",
        selected
          ? "-translate-y-3 shadow-[0_0_18px_rgba(251,191,36,0.75),0_6px_20px_rgba(0,0,0,0.5)] ring-1 ring-amber-400/60"
          : "shadow-[0_4px_12px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.6)]",
        disabled
          ? "opacity-40 grayscale cursor-not-allowed"
          : onClick
            ? "hover:-translate-y-2 hover:shadow-xl focus-visible:-translate-y-2 focus-visible:scale-[1.025] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 cursor-pointer"
            : "cursor-default",
      ].join(" ")}
      style={{ borderColor: selected ? "#fbbf24" : cs.border }}
    >
      {responseReady && !disabled && !pending && <span aria-hidden="true" className="bang-card-response-ready" style={{ "--response-ready-delay": `${responseReadyDelayMs}ms` } as import("react").CSSProperties} />}
      {/* Stripe overlay — type hint */}
      <div className={`absolute inset-0 ${cs.stripe} pointer-events-none`} />
      {/* Parchment vignette — giả lập giấy da ố góc */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(255,255,255,0.18)_0%,transparent_65%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.22)_100%)] pointer-events-none" />

      {/* Top: rank + suit */}
      {!hideIdentity && (
        <div className={`relative flex items-center justify-between font-bold leading-none ${suitColor(card.suit)} ${small ? "text-[10px]" : "text-xs"}`}>
          <span>{card.rank}</span>
          <span>{card.suit}</span>
        </div>
      )}

      {/* Center: big icon */}
      <div className={`relative flex items-center justify-center ${small ? "text-xl my-0.5" : "text-3xl my-1"}`}>
        {display.icon}
      </div>

      {/* Name */}
      <div className={`relative text-center font-bold leading-tight ${cs.text} ${small ? "text-[9px]" : "text-[11px]"}`}>
        {display.name}
      </div>
      {!small && <p className={`relative mt-1 text-[9px] leading-tight ${cs.text}`}>{CARD_EFFECT[card.kind]}</p>}

      {/* Bottom-right corner (mirrored rank+suit) — full size only */}
      {!small && !hideIdentity && (
        <div
          className={`absolute bottom-1.5 right-1.5 flex flex-col items-center font-bold ${suitColor(card.suit)} text-[9px] leading-none rotate-180`}
          aria-hidden="true"
        >
          <span>{card.rank}</span>
          <span>{card.suit}</span>
        </div>
      )}
    </button>
  );
}
