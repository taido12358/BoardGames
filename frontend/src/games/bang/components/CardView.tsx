import type { DragEvent, ReactNode } from "react";
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

const RED_SUITS = new Set(["♥", "♦"]);

const CARD_EFFECT: Record<CardKind, string> = {
  bang:        "Bắn 1 mục tiêu trong tầm. Trúng: −1 máu.",
  missed:      "Đỡ Bang! hoặc Gatling. Không mất máu.",
  beer:        "Hồi 1 máu cho bạn. Doc hồi 2.",
  gatling:     "Bắn tất cả đối thủ. Trúng: −1 máu.",
  duel:        "Luân phiên dùng Bang! Người bỏ cuộc mất 1 máu.",
  indians:     "Mỗi đối thủ bỏ Bang! hoặc mất 1 máu.",
  panic:       "Lấy 1 lá của người ở khoảng cách 1.",
  catBalou:    "Bỏ 1 lá của người chơi khác.",
  stagecoach:  "Rút ngay 2 lá bài.",
  wellsFargo:  "Rút ngay 3 lá bài.",
  volcanic:    "Trang bị: bắn Bang! nhiều lần mỗi lượt.",
  schofield:   "Trang bị: tầm bắn 2.",
  remington:   "Trang bị: tầm bắn 3.",
  mustang:     "Trang bị: đối thủ nhìn bạn xa hơn 1.",
  barrel:      "Trang bị: lật ♥ để né Bang! hoặc Gatling.",
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

const CATEGORY_LABEL: Record<CardCategory, string> = {
  attack:    "TẤN CÔNG",
  defense:   "PHÒNG THỦ",
  heal:      "HỒI MÁU",
  weapon:    "VŨ KHÍ",
  equipment: "TRANG BỊ",
  action:    "HÀNH ĐỘNG",
};

const CATEGORY_STYLE: Record<CardCategory, { border: string; banner: string; bannerText: string }> = {
  attack:    { border: "#8b2515", banner: "#8b2515", bannerText: "#fff3e8" },
  defense:   { border: "#1e3a5a", banner: "#1e3a5a", bannerText: "#d8edff" },
  heal:      { border: "#1a5a1a", banner: "#1a5a1a", bannerText: "#d8ffd8" },
  weapon:    { border: "#6b3507", banner: "#6b3507", bannerText: "#fff3d0" },
  equipment: { border: "#4a1a6b", banner: "#4a1a6b", bannerText: "#eed8ff" },
  action:    { border: "#5a4507", banner: "#5a4507", bannerText: "#fffbd0" },
};

// Inline SVG revolver — replaces 🔫 which shows as water gun on Apple devices
function RevolverSvg({ size }: { size: number }) {
  return (
    <svg width={size} height={Math.round(size * 0.64)} viewBox="0 0 50 32" fill="currentColor" aria-hidden="true">
      {/* barrel */}
      <rect x="18" y="8" width="30" height="6" rx="2" />
      {/* front sight */}
      <rect x="46" y="6" width="2" height="4" rx="1" />
      {/* cylinder body */}
      <ellipse cx="16" cy="11" rx="9" ry="8" />
      {/* cylinder inner shading */}
      <ellipse cx="16" cy="11" rx="5.5" ry="5" fill="rgba(0,0,0,0.14)" />
      {/* 6 loading holes */}
      <circle cx="16" cy="3.8" r="1.3" fill="rgba(255,255,255,0.38)" />
      <circle cx="21.8" cy="6.5" r="1.3" fill="rgba(255,255,255,0.38)" />
      <circle cx="22.8" cy="13" r="1.3" fill="rgba(255,255,255,0.38)" />
      <circle cx="18" cy="18" r="1.3" fill="rgba(255,255,255,0.38)" />
      <circle cx="10.5" cy="17" r="1.3" fill="rgba(255,255,255,0.38)" />
      <circle cx="8.5" cy="10" r="1.3" fill="rgba(255,255,255,0.38)" />
      {/* grip */}
      <path d="M7 15 L5 22 L5 29 Q5 31 8 31 L12 31 Q15 31 14 28 L12.5 17 Z" />
      {/* trigger guard arch */}
      <path d="M12.5 17 Q10 26 14 26 Q18 26 16.5 17" fill="none" stroke="currentColor" strokeWidth="2" />
      {/* trigger */}
      <line x1="15" y1="18" x2="14" y2="25" strokeWidth="1.2" />
      {/* hammer */}
      <path d="M9 8 L7 5 L8.5 4 L11 7 Z" />
    </svg>
  );
}

// Inline SVG gatling gun — multi-barrel rotary cannon
function GatlingSvg({ size }: { size: number }) {
  return (
    <svg width={size} height={Math.round(size * 0.78)} viewBox="0 0 48 37" fill="currentColor" aria-hidden="true">
      {/* 4 barrels */}
      <rect x="14" y="3"   width="32" height="5" rx="2" />
      <rect x="14" y="10"  width="32" height="5" rx="2" />
      <rect x="14" y="17"  width="32" height="5" rx="2" />
      <rect x="14" y="24"  width="32" height="5" rx="2" />
      {/* central frame block */}
      <rect x="8" y="1" width="8" height="31" rx="3" />
      {/* crank wheel */}
      <circle cx="5" cy="16.5" r="5" />
      <circle cx="5" cy="16.5" r="2.2" fill="rgba(255,255,255,0.18)" />
      <line x1="5" y1="11.5" x2="5" y2="21.5" strokeWidth="1.5" stroke="rgba(255,255,255,0.28)" />
      <line x1="0" y1="16.5" x2="10" y2="16.5" strokeWidth="1.5" stroke="rgba(255,255,255,0.28)" />
    </svg>
  );
}

// SVG barrel / wooden keg
function BarrelSvg({ size }: { size: number }) {
  return (
    <svg width={size} height={Math.round(size * 1.1)} viewBox="0 0 40 44" fill="currentColor" aria-hidden="true">
      {/* barrel body */}
      <ellipse cx="20" cy="8" rx="17" ry="6" />
      <rect x="3" y="8" width="34" height="28" />
      <ellipse cx="20" cy="36" rx="17" ry="6" />
      {/* hoop bands */}
      <rect x="3" y="14" width="34" height="3" fill="rgba(0,0,0,0.2)" />
      <rect x="3" y="27" width="34" height="3" fill="rgba(0,0,0,0.2)" />
      {/* stave lines */}
      <line x1="11" y1="8" x2="11" y2="36" strokeWidth="1" stroke="rgba(255,255,255,0.15)" />
      <line x1="20" y1="2" x2="20" y2="42" strokeWidth="1" stroke="rgba(255,255,255,0.15)" />
      <line x1="29" y1="8" x2="29" y2="36" strokeWidth="1" stroke="rgba(255,255,255,0.15)" />
    </svg>
  );
}

const CARD_SVG: Partial<Record<CardKind, (size: number) => ReactNode>> = {
  bang:      (s) => <RevolverSvg size={s} />,
  schofield: (s) => <RevolverSvg size={s} />,
  remington: (s) => <RevolverSvg size={s} />,
  volcanic:  (s) => <RevolverSvg size={s} />,
  gatling:   (s) => <GatlingSvg size={s} />,
  barrel:    (s) => <BarrelSvg size={s} />,
};

/** Lá bài BANG! — nền giấy da parchment, banner tiêu đề có màu theo loại bài. */
export default function CardView({
  card, selected, pending, rejected, rejectedSequence = 0, selectionMode,
  disabled, disabledReason, responseReady, responseReadyDelayMs = 0,
  small, hideIdentity, onDragStart, onDragEnd, onClick,
}: Props) {
  const display = CARD_DISPLAY[card.kind];
  const cat = cardCategory(card.kind);
  const cs = CATEGORY_STYLE[cat];
  const suitClr = RED_SUITS.has(card.suit) ? "#9b1c1c" : "#1c1208";
  const iconSize = small ? 24 : 38;
  const svgIcon = CARD_SVG[card.kind];

  return (
    <button
      type="button"
      data-card-id={card.id}
      disabled={disabled || !onClick}
      onClick={onClick}
      title={
        disabled && disabledReason
          ? `${display.name} — ${disabledReason}`
          : `${display.name}${onDragStart ? " · Kéo để chơi hoặc chọn mục tiêu" : ""}`
      }
      aria-label={display.name}
      aria-description={`${card.rank}${card.suit}. ${CARD_EFFECT[card.kind]}${!disabled && onDragStart ? " Có thể kéo thả để thao tác." : ""}${disabled && disabledReason ? ` Không thể dùng: ${disabledReason}` : ""}`}
      aria-pressed={selectionMode ? !!selected : undefined}
      draggable={!!onDragStart && !disabled}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={[
        "relative shrink-0 rounded border-2 text-left transition-all duration-200 ease-[cubic-bezier(0.2,0.75,0.25,1)] select-none overflow-hidden active:scale-[0.97]",
        selected ? "bang-card-selected" : "",
        pending ? "bang-card-pending" : "",
        rejected ? `bang-card-rejected-${rejectedSequence % 2 === 0 ? "a" : "b"}` : "",
        small ? "w-16 h-24" : "w-24 h-36",
        selected
          ? "-translate-y-3 shadow-[0_0_18px_rgba(251,191,36,0.75),0_6px_20px_rgba(0,0,0,0.5)] ring-1 ring-amber-400/60"
          : "shadow-[0_4px_14px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.9)]",
        disabled
          ? "opacity-40 grayscale cursor-not-allowed"
          : onClick
            ? "hover:-translate-y-2 hover:shadow-xl focus-visible:-translate-y-2 focus-visible:scale-[1.025] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 cursor-pointer"
            : "cursor-default",
      ].join(" ")}
      style={{
        borderColor: selected ? "#fbbf24" : cs.border,
        background: "linear-gradient(168deg, #fef9ec 0%, #f3e7c4 55%, #e8daab 100%)",
      }}
    >
      {responseReady && !disabled && !pending && (
        <span
          aria-hidden="true"
          className="bang-card-response-ready"
          style={{ "--response-ready-delay": `${responseReadyDelayMs}ms` } as import("react").CSSProperties}
        />
      )}

      {/* Parchment aging: corner vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, transparent 48%, rgba(100,65,15,0.28) 100%)" }}
      />
      {/* Subtle category wash */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: `${cs.banner}0b` }} />

      {/* Inner ornamental border */}
      <div
        className="absolute pointer-events-none"
        style={{ inset: "3px", border: `0.5px solid ${cs.border}45`, borderRadius: "1px" }}
      />
      {/* Corner bracket ornaments */}
      <div className="absolute top-[3px] left-[3px] w-2.5 h-2.5 pointer-events-none" style={{ borderTop: `1px solid ${cs.border}60`, borderLeft: `1px solid ${cs.border}60` }} />
      <div className="absolute top-[3px] right-[3px] w-2.5 h-2.5 pointer-events-none" style={{ borderTop: `1px solid ${cs.border}60`, borderRight: `1px solid ${cs.border}60` }} />
      <div className="absolute bottom-[3px] left-[3px] w-2.5 h-2.5 pointer-events-none" style={{ borderBottom: `1px solid ${cs.border}60`, borderLeft: `1px solid ${cs.border}60` }} />
      <div className="absolute bottom-[3px] right-[3px] w-2.5 h-2.5 pointer-events-none" style={{ borderBottom: `1px solid ${cs.border}60`, borderRight: `1px solid ${cs.border}60` }} />

      {/* Content */}
      <div className={`relative flex flex-col h-full ${small ? "p-1" : "p-1.5"}`}>

        {/* Top rank + suit corner */}
        {!hideIdentity ? (
          <div className="flex justify-between mb-0.5">
            <div
              className={`flex flex-col items-center leading-none font-bold ${small ? "text-[9px]" : "text-[10px]"}`}
              style={{ color: suitClr }}
            >
              <span className="font-black" style={{ lineHeight: 1 }}>{card.rank}</span>
              <span style={{ lineHeight: 1 }}>{card.suit}</span>
            </div>
          </div>
        ) : (
          <div className={small ? "h-4" : "h-[18px]"} />
        )}

        {/* Title banner */}
        <div
          className={`flex items-center justify-center ${small ? "py-[3px]" : "py-[5px]"}`}
          style={{
            background: cs.banner,
            boxShadow: "0 1px 3px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.25)",
          }}
        >
          <span
            className={`font-black uppercase tracking-widest leading-none text-center ${small ? "text-[7px]" : "text-[9px]"}`}
            style={{ color: cs.bannerText }}
          >
            {display.name}
          </span>
        </div>

        {/* Illustration */}
        <div className="flex-1 flex flex-col items-center justify-center gap-1">
          <div
            style={{
              color: cs.border,
              filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.22))",
              lineHeight: 1,
            }}
          >
            {svgIcon
              ? svgIcon(iconSize)
              : (
                <span
                  className={small ? "text-2xl" : "text-[2.25rem]"}
                  style={{ lineHeight: 1 }}
                  aria-hidden="true"
                >
                  {display.icon}
                </span>
              )
            }
          </div>
          {!small && (
            <span
              className="text-[6px] font-bold uppercase tracking-[0.18em] text-center"
              style={{ color: `${cs.border}88` }}
            >
              {CATEGORY_LABEL[cat]}
            </span>
          )}
        </div>

        {/* Effect text */}
        {!small && (
          <div
            className="text-[7px] leading-snug italic text-center pt-[3px] px-0.5"
            style={{ color: "#5a3a14", borderTop: `0.5px solid ${cs.border}35` }}
          >
            {CARD_EFFECT[card.kind]}
          </div>
        )}
      </div>

      {/* Bottom-right rank + suit (mirrored, full size only) */}
      {!small && !hideIdentity && (
        <div
          className="absolute bottom-1.5 right-1.5 flex flex-col items-center font-bold leading-none rotate-180"
          style={{ color: suitClr, fontSize: "9px" }}
          aria-hidden="true"
        >
          <span className="font-black">{card.rank}</span>
          <span>{card.suit}</span>
        </div>
      )}
    </button>
  );
}
