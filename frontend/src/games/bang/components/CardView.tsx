import { CARD_DISPLAY, type Card } from "../types";

interface Props {
  card: Card;
  selected?: boolean;
  disabled?: boolean;
  small?: boolean;
  onClick?: () => void;
}

const suitColor = (suit: string) => (suit === "♥" || suit === "♦" ? "text-red-500" : "text-slate-200");

/** Một lá bài trong bộ BANG! — không dùng artwork thật, chỉ icon Unicode + CSS. */
export default function CardView({ card, selected, disabled, small, onClick }: Props) {
  const display = CARD_DISPLAY[card.kind];
  return (
    <button
      type="button"
      disabled={disabled || !onClick}
      onClick={onClick}
      title={display.name}
      className={`relative shrink-0 rounded-lg border-2 bg-gradient-to-b from-[#f2e6c9] to-[#e2d0a0] text-left
        transition-all duration-150 select-none
        ${small ? "w-16 h-24 p-1.5" : "w-24 h-36 p-2"}
        ${selected ? "border-amber-400 -translate-y-3 shadow-[0_0_16px_rgba(251,191,36,0.6)]" : "border-[#7a5c2e] shadow-md"}
        ${disabled ? "opacity-40 grayscale cursor-not-allowed" : onClick ? "hover:-translate-y-2 cursor-pointer" : "cursor-default"}
      `}
    >
      <div className={`flex items-center justify-between font-bold ${suitColor(card.suit)} ${small ? "text-[10px]" : "text-xs"}`}>
        <span>{card.rank}</span>
        <span>{card.suit}</span>
      </div>
      <div className={`flex items-center justify-center ${small ? "text-lg my-0.5" : "text-2xl my-1"}`}>
        {display.icon}
      </div>
      <div className={`text-center font-semibold text-[#3b2a12] leading-tight ${small ? "text-[9px]" : "text-[11px]"}`}>
        {display.name}
      </div>
    </button>
  );
}
