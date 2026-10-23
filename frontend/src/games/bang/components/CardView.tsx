import { CARD_DISPLAY, type Card, type CardKind } from "../types";

interface Props {
  card: Card;
  selected?: boolean;
  disabled?: boolean;
  small?: boolean;
  onClick?: () => void;
}

const suitColor = (suit: string) => (suit === "♥" || suit === "♦" ? "text-red-600" : "text-slate-800");

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
  attack:    { bg: "from-[#f7ddd5] to-[#e8b49a]", border: "#b03020", text: "text-red-900",    stripe: "bg-red-700/10" },
  defense:   { bg: "from-[#d0e8f8] to-[#a8cce8]", border: "#1a6fa8", text: "text-blue-900",   stripe: "bg-blue-600/10" },
  heal:      { bg: "from-[#d4f0d4] to-[#a0d8a0]", border: "#1a7a3c", text: "text-green-900",  stripe: "bg-green-600/10" },
  weapon:    { bg: "from-[#faecd0] to-[#e8c47a]", border: "#b06010", text: "text-orange-900", stripe: "bg-orange-600/10" },
  equipment: { bg: "from-[#ead4f0] to-[#c8a0d8]", border: "#7030a0", text: "text-purple-900", stripe: "bg-purple-600/10" },
  action:    { bg: "from-[#f8f0c0] to-[#e8d870]", border: "#a08010", text: "text-yellow-900", stripe: "bg-yellow-600/10" },
};

/** Một lá bài trong bộ BANG! — color-coded theo loại (đỏ=tấn công, xanh=phòng thủ, v.v.). */
export default function CardView({ card, selected, disabled, small, onClick }: Props) {
  const display = CARD_DISPLAY[card.kind];
  const cat = cardCategory(card.kind);
  const cs = CATEGORY_STYLE[cat];

  return (
    <button
      type="button"
      disabled={disabled || !onClick}
      onClick={onClick}
      title={display.name}
      aria-label={display.name}
      className={[
        "relative shrink-0 rounded-lg border-2 text-left transition-all duration-150 select-none overflow-hidden",
        `bg-gradient-to-b ${cs.bg}`,
        small ? "w-16 h-24 p-1.5" : "w-24 h-36 p-2",
        selected
          ? "-translate-y-3 shadow-[0_0_18px_rgba(251,191,36,0.75)]"
          : "shadow-md",
        disabled
          ? "opacity-40 grayscale cursor-not-allowed"
          : onClick
            ? "hover:-translate-y-2 hover:shadow-xl cursor-pointer"
            : "cursor-default",
      ].join(" ")}
      style={{ borderColor: selected ? "#fbbf24" : cs.border }}
    >
      {/* Stripe overlay — type hint */}
      <div className={`absolute inset-0 ${cs.stripe} pointer-events-none`} />

      {/* Top: rank + suit */}
      <div className={`relative flex items-center justify-between font-bold leading-none ${suitColor(card.suit)} ${small ? "text-[10px]" : "text-xs"}`}>
        <span>{card.rank}</span>
        <span>{card.suit}</span>
      </div>

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
      {!small && (
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
