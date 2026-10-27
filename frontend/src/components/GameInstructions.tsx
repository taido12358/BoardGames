import { type ReactNode, useId, useRef, useState } from "react";
import type { CardGuideEntry, InstructionSection, RacerGuideEntry } from "../platform/gameLibraryTypes";

interface Props {
  sections: InstructionSection[];
}

function TextSection({ paragraphs, bullets }: { paragraphs: string[]; bullets?: string[] }) {
  return (
    <div className="space-y-3">
      {paragraphs.map((p, i) => <p key={i} className="text-sm text-[#d6c1a8]/80 leading-relaxed">{p}</p>)}
      {bullets && bullets.length > 0 && (
        <ul className="list-disc list-inside space-y-1.5 text-sm text-[#d6c1a8]/80">
          {bullets.map((b, i) => <li key={i}>{b}</li>)}
        </ul>
      )}
    </div>
  );
}

function FlowSection({ steps }: { steps: string[] }) {
  return (
    <div className="flex flex-col items-center gap-1.5 py-2">
      {steps.map((step, i) => (
        <div key={i} className="flex flex-col items-center gap-1.5">
          <div className="rounded-sm border border-amber-700/50 bg-amber-950/30 px-4 py-2 text-sm font-semibold text-[#d4b996] text-center">
            {step}
          </div>
          {i < steps.length - 1 && <span className="text-amber-600/70 text-lg leading-none">↓</span>}
        </div>
      ))}
    </div>
  );
}

function RolesSection({ roles }: { roles: Extract<InstructionSection, { kind: "roles" }>["roles"] }) {
  const hasHidden = roles.some((r) => r.hidden);
  return (
    <div className="space-y-3">
      {hasHidden && (
        <p className="text-xs text-amber-300/70 bg-amber-950/30 border border-amber-800/40 rounded-sm px-3 py-2">
          ⚠ Trong ván thật, chỉ Cảnh sát trưởng công khai — các vai trò khác được GIỮ BÍ MẬT cho tới khi lộ hoặc bị loại.
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {roles.map((r) => (
          <div key={r.name} className="relative overflow-hidden rounded-sm border border-amber-900/40 bg-[#1a1208] p-3.5">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
            <div className="flex items-center justify-between">
              <div className="font-bold text-[#f5d09d] flex items-center gap-1.5">
                <span>{r.icon}</span> {r.name}
              </div>
              {r.hidden ? (
                <span className="text-[10px] rounded-sm bg-[#0d0a07] border border-amber-900/50 px-2 py-0.5 text-[#bba182]">VAI TRÒ ẨN</span>
              ) : (
                <span className="text-[10px] rounded-sm bg-amber-900/60 border border-amber-600 px-2 py-0.5 text-amber-300">CÔNG KHAI</span>
              )}
            </div>
            <p className="text-xs text-amber-700/60 mt-1.5"><span className="text-amber-300/70 font-medium">Mục tiêu:</span> {r.goal}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const TYPE_STYLE: Record<string, { badge: string; border: string; fromBg: string; glow: string }> = {
  "Tấn công":           { badge: "bg-red-900/50 border-red-700/50 text-red-300",        border: "border-red-900/60",    fromBg: "from-[#2b1010]", glow: "hover:shadow-[0_0_10px_rgba(220,38,38,0.2)]"   },
  "Tấn công diện rộng": { badge: "bg-orange-900/50 border-orange-700/50 text-orange-300",border: "border-orange-900/60", fromBg: "from-[#2b1a0e]", glow: "hover:shadow-[0_0_10px_rgba(249,115,22,0.2)]"  },
  "Phòng thủ":          { badge: "bg-sky-900/50 border-sky-700/50 text-sky-300",         border: "border-sky-900/60",    fromBg: "from-[#0f1828]", glow: "hover:shadow-[0_0_10px_rgba(56,189,248,0.2)]"  },
  "Hồi máu":            { badge: "bg-green-900/50 border-green-700/50 text-green-300",   border: "border-green-900/60",  fromBg: "from-[#0d2010]", glow: "hover:shadow-[0_0_10px_rgba(34,197,94,0.2)]"   },
  "Hành động":          { badge: "bg-purple-900/50 border-purple-700/50 text-purple-300",border: "border-purple-900/60", fromBg: "from-[#1a1028]", glow: "hover:shadow-[0_0_10px_rgba(168,85,247,0.2)]"  },
  "Vũ khí":             { badge: "bg-amber-900/50 border-amber-700/50 text-amber-300",   border: "border-amber-900/60",  fromBg: "from-[#2b2013]", glow: "hover:shadow-[0_0_10px_rgba(245,158,11,0.2)]"  },
  "Trang bị":           { badge: "bg-teal-900/50 border-teal-700/50 text-teal-300",      border: "border-teal-900/60",   fromBg: "from-[#0d2020]", glow: "hover:shadow-[0_0_10px_rgba(20,184,166,0.2)]"  },
};
const TYPE_STYLE_DEFAULT = { badge: "bg-amber-900/40 border-amber-700/40 text-amber-400", border: "border-[#7a5c2e]/60", fromBg: "from-[#2b2013]", glow: "hover:shadow-[0_0_8px_rgba(245,158,11,0.15)]" };

// ── Card-face visual style ────────────────────────────────────────────────────
// Mirrors CATEGORY_STYLE in CardView — parchment cards with colored banners.

const CARD_LOOK: Record<string, { border: string; banner: string; bannerText: string; catLabel: string }> = {
  "Tấn công":           { border: "#8b2515", banner: "#8b2515", bannerText: "#fff3e8", catLabel: "TẤN CÔNG" },
  "Tấn công diện rộng": { border: "#7a2a08", banner: "#7a2a08", bannerText: "#fff3e8", catLabel: "DIỆN RỘNG" },
  "Phòng thủ":          { border: "#1e3a5a", banner: "#1e3a5a", bannerText: "#d8edff", catLabel: "PHÒNG THỦ" },
  "Hồi máu":            { border: "#1a5a1a", banner: "#1a5a1a", bannerText: "#d8ffd8", catLabel: "HỒI MÁU" },
  "Hành động":          { border: "#5a4507", banner: "#5a4507", bannerText: "#fffbd0", catLabel: "HÀNH ĐỘNG" },
  "Vũ khí":             { border: "#6b3507", banner: "#6b3507", bannerText: "#fff3d0", catLabel: "VŨ KHÍ" },
  "Trang bị":           { border: "#4a1a6b", banner: "#4a1a6b", bannerText: "#eed8ff", catLabel: "TRANG BỊ" },
};
const CARD_LOOK_DEFAULT = { border: "#5a3a07", banner: "#5a3a07", bannerText: "#fffbd0", catLabel: "ĐẶC BIỆT" };

// Inline SVG icons — replaces emoji that render inconsistently across platforms.
function RevolverSvg({ size }: { size: number }) {
  return (
    <svg width={size} height={Math.round(size * 0.64)} viewBox="0 0 50 32" fill="currentColor" aria-hidden="true">
      <rect x="18" y="8" width="30" height="6" rx="2" />
      <rect x="46" y="6" width="2" height="4" rx="1" />
      <ellipse cx="16" cy="11" rx="9" ry="8" />
      <ellipse cx="16" cy="11" rx="5.5" ry="5" fill="rgba(0,0,0,0.14)" />
      <circle cx="16" cy="3.8" r="1.3" fill="rgba(255,255,255,0.38)" />
      <circle cx="21.8" cy="6.5" r="1.3" fill="rgba(255,255,255,0.38)" />
      <circle cx="22.8" cy="13" r="1.3" fill="rgba(255,255,255,0.38)" />
      <circle cx="18" cy="18" r="1.3" fill="rgba(255,255,255,0.38)" />
      <circle cx="10.5" cy="17" r="1.3" fill="rgba(255,255,255,0.38)" />
      <circle cx="8.5" cy="10" r="1.3" fill="rgba(255,255,255,0.38)" />
      <path d="M7 15 L5 22 L5 29 Q5 31 8 31 L12 31 Q15 31 14 28 L12.5 17 Z" />
      <path d="M12.5 17 Q10 26 14 26 Q18 26 16.5 17" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="15" y1="18" x2="14" y2="25" strokeWidth="1.2" />
      <path d="M9 8 L7 5 L8.5 4 L11 7 Z" />
    </svg>
  );
}
function GatlingSvg({ size }: { size: number }) {
  return (
    <svg width={size} height={Math.round(size * 0.78)} viewBox="0 0 48 37" fill="currentColor" aria-hidden="true">
      <rect x="14" y="3"  width="32" height="5" rx="2" />
      <rect x="14" y="10" width="32" height="5" rx="2" />
      <rect x="14" y="17" width="32" height="5" rx="2" />
      <rect x="14" y="24" width="32" height="5" rx="2" />
      <rect x="8" y="1" width="8" height="31" rx="3" />
      <circle cx="5" cy="16.5" r="5" />
      <circle cx="5" cy="16.5" r="2.2" fill="rgba(255,255,255,0.18)" />
      <line x1="5" y1="11.5" x2="5" y2="21.5" strokeWidth="1.5" stroke="rgba(255,255,255,0.28)" />
      <line x1="0" y1="16.5" x2="10" y2="16.5" strokeWidth="1.5" stroke="rgba(255,255,255,0.28)" />
    </svg>
  );
}
function BarrelSvg({ size }: { size: number }) {
  return (
    <svg width={size} height={Math.round(size * 1.1)} viewBox="0 0 40 44" fill="currentColor" aria-hidden="true">
      <ellipse cx="20" cy="8" rx="17" ry="6" />
      <rect x="3" y="8" width="34" height="28" />
      <ellipse cx="20" cy="36" rx="17" ry="6" />
      <rect x="3" y="14" width="34" height="3" fill="rgba(0,0,0,0.2)" />
      <rect x="3" y="27" width="34" height="3" fill="rgba(0,0,0,0.2)" />
      <line x1="11" y1="8" x2="11" y2="36" strokeWidth="1" stroke="rgba(255,255,255,0.15)" />
      <line x1="20" y1="2" x2="20" y2="42" strokeWidth="1" stroke="rgba(255,255,255,0.15)" />
      <line x1="29" y1="8" x2="29" y2="36" strokeWidth="1" stroke="rgba(255,255,255,0.15)" />
    </svg>
  );
}

// Map icon emoji → SVG render function. Covers icons known to render inconsistently or that have a better SVG.
const GUIDE_ICON_SVG: Record<string, (size: number) => ReactNode> = {
  "🔫": (s) => <RevolverSvg size={s} />,
  "🌋": (s) => <RevolverSvg size={s} />,  // Volcanic pistol
  "💥": (s) => <GatlingSvg size={s} />,
  "🛢": (s) => <BarrelSvg size={s} />,
};

function CardEntry({ card }: { card: CardGuideEntry }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const cl = CARD_LOOK[card.type] ?? CARD_LOOK_DEFAULT;
  const svgIcon = GUIDE_ICON_SVG[card.icon];

  return (
    <div className="flex flex-col gap-1.5">
      {/* Playing-card face */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="relative rounded border-2 overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 w-full"
        style={{
          aspectRatio: "2/3",
          borderColor: open ? cl.border : `${cl.border}cc`,
          background: "linear-gradient(168deg, #fef9ec 0%, #f3e7c4 55%, #e8daab 100%)",
          boxShadow: open
            ? `0 0 14px ${cl.banner}55, 0 6px 20px rgba(0,0,0,0.5)`
            : "0 4px 14px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.85)",
        }}
      >
        {/* Parchment aging vignette */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at center, transparent 48%, rgba(100,65,15,0.28) 100%)" }} />
        {/* Category colour wash */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: `${cl.banner}0b` }} />
        {/* Inner ornamental border */}
        <div className="absolute pointer-events-none" style={{ inset: "3px", border: `0.5px solid ${cl.border}45`, borderRadius: "1px" }} />
        {/* Corner brackets */}
        <div className="absolute top-[3px] left-[3px]  w-2.5 h-2.5 pointer-events-none" style={{ borderTop: `1px solid ${cl.border}60`, borderLeft:  `1px solid ${cl.border}60` }} />
        <div className="absolute top-[3px] right-[3px] w-2.5 h-2.5 pointer-events-none" style={{ borderTop: `1px solid ${cl.border}60`, borderRight: `1px solid ${cl.border}60` }} />
        <div className="absolute bottom-[3px] left-[3px]  w-2.5 h-2.5 pointer-events-none" style={{ borderBottom: `1px solid ${cl.border}60`, borderLeft:  `1px solid ${cl.border}60` }} />
        <div className="absolute bottom-[3px] right-[3px] w-2.5 h-2.5 pointer-events-none" style={{ borderBottom: `1px solid ${cl.border}60`, borderRight: `1px solid ${cl.border}60` }} />

        {/* Content */}
        <div className="relative flex flex-col h-full p-1.5">
          {/* Title banner */}
          <div
            className="flex items-center justify-center py-[5px]"
            style={{
              background: cl.banner,
              boxShadow: "0 1px 3px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.25)",
            }}
          >
            <span className="font-black uppercase tracking-widest leading-tight text-center text-[8px]" style={{ color: cl.bannerText }}>
              {card.name}
            </span>
          </div>

          {/* Illustration */}
          <div className="flex-1 flex flex-col items-center justify-center gap-1">
            <div style={{ color: cl.border, filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.22))", lineHeight: 1 }}>
              {svgIcon
                ? svgIcon(38)
                : <span className="text-[2.25rem]" style={{ lineHeight: 1 }} aria-hidden="true">{card.icon}</span>
              }
            </div>
            <span className="text-[6px] font-bold uppercase tracking-[0.18em] text-center" style={{ color: `${cl.border}88` }}>
              {cl.catLabel}
            </span>
          </div>

          {/* Bottom hint */}
          <div
            className="text-[7px] leading-snug italic text-center pt-[3px] px-0.5"
            style={{ color: "#7a5530", borderTop: `0.5px solid ${cl.border}35` }}
          >
            {open ? "✕ đóng" : "nhấn để xem"}
          </div>
        </div>
      </button>

      {/* Expandable effect panel — rendered below the card face */}
      <div id={panelId} aria-hidden={!open} className={`game-guide-collapse ${open ? "is-open" : ""}`}>
        <div className="min-h-0 overflow-hidden">
          <div className="rounded-sm border p-2.5 space-y-1" style={{ borderColor: `${cl.border}40`, background: "#1a1208" }}>
            <p className="text-xs text-[#d4b996]/80 leading-relaxed">{card.effect}</p>
            {card.example && <p className="text-[11px] text-[#e8c07e]/70 italic leading-snug">{card.example}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function CardsSection({ cards }: { cards: CardGuideEntry[] }) {
  const types = Array.from(new Set(cards.map((c) => c.type)));
  const [filter, setFilter] = useState("Tất cả");
  const visible = filter === "Tất cả" ? cards : cards.filter((c) => c.type === filter);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {["Tất cả", ...types].map((t) => {
          const active = filter === t;
          const ts = TYPE_STYLE[t];
          return (
            <button
              key={t}
              type="button"
              onClick={() => setFilter(t)}
              className={`text-[11px] rounded-full px-3 py-1 border font-semibold uppercase tracking-wide transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-300 ${
                active
                  ? ts ? `${ts.badge} shadow-sm` : "bg-amber-700/80 border-amber-500/70 text-amber-100"
                  : "border-amber-900/40 bg-[#1a130a] text-amber-700/60 hover:text-amber-400 hover:border-amber-700/50"
              }`}
            >
              {t === "Tất cả" ? `Tất cả (${cards.length})` : t}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
        {visible.map((c) => <CardEntry key={c.name} card={c} />)}
      </div>
    </div>
  );
}

function CharactersSection({ characters }: { characters: Extract<InstructionSection, { kind: "characters" }>["characters"] }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-amber-800/50 italic">Thông tin nhân vật LUÔN công khai — vai trò ẩn là chuyện khác, xem tab VAI TRÒ.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {characters.map((c) => (
          <div key={c.name} className="relative overflow-hidden rounded-sm border border-amber-900/40 bg-[#1a1208] p-3.5 flex gap-3">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
            <div className="shrink-0 w-12 h-12 rounded-full bg-gradient-to-b from-amber-800 to-amber-950 border border-amber-600/50 flex items-center justify-center text-lg font-black text-amber-200">
              {c.name[0]}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-[#f5d09d]">{c.name}</div>
              <div className="text-xs text-red-400">{"❤️".repeat(c.hp)} {c.hp} HP</div>
              <div className="text-xs text-amber-300 font-semibold mt-1">{c.abilityName}</div>
              <p className="text-xs text-amber-700/60 leading-snug">{c.ability}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const ZODIAC_COLOR: Record<string, string> = {
  "♈": "from-red-950 border-red-800/60 text-red-300",
  "♉": "from-emerald-950 border-emerald-800/60 text-emerald-300",
  "♊": "from-yellow-950 border-yellow-800/60 text-yellow-300",
  "♋": "from-sky-950 border-sky-800/60 text-sky-300",
  "♌": "from-orange-950 border-orange-800/60 text-orange-300",
  "♍": "from-teal-950 border-teal-800/60 text-teal-300",
  "♎": "from-violet-950 border-violet-800/60 text-violet-300",
  "♏": "from-red-950 border-red-900/60 text-red-400",
  "♐": "from-purple-950 border-purple-800/60 text-purple-300",
  "♑": "from-stone-900 border-stone-700/60 text-stone-300",
  "♒": "from-blue-950 border-blue-800/60 text-blue-300",
  "♓": "from-cyan-950 border-cyan-800/60 text-cyan-300",
};

function RacersSection({ racers }: { racers: RacerGuideEntry[] }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {racers.map((r) => {
        const colorCls = ZODIAC_COLOR[r.sign] ?? "from-amber-950 border-amber-800/60 text-amber-300";
        return (
          <div key={r.name} className={`relative overflow-hidden rounded-sm border bg-gradient-to-b ${colorCls} to-[#0d0a07] p-2.5 text-center`}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <div className="text-2xl">{r.emoji}</div>
            <div className="text-[11px] font-bold text-[#f5d09d] mt-1 leading-tight">{r.name}</div>
            <div className="text-lg leading-none mt-0.5 opacity-60">{r.sign}</div>
          </div>
        );
      })}
    </div>
  );
}

function OAnQuanBoardSection() {
  const QUAN_STYLE = "rounded border border-amber-600/70 bg-gradient-to-b from-amber-900/60 to-amber-950/80 p-2 text-center";
  const DAN_STYLE = "rounded border border-[#5c3818]/60 bg-[#1a1208]/80 p-2 text-center";
  const fivePits = Array.from({ length: 5 });
  return (
    <div className="space-y-3">
      <p className="text-xs text-amber-700/60 italic text-center">Bố cục ban đầu — mỗi ô Dân có 5 quân, mỗi ô Quan có 10 quân.</p>
      {/* Board layout: Quan A | top row (Người chơi 2) | Quan B */}
      <div className="grid grid-cols-[44px_1fr_44px] gap-1.5 items-center text-[11px]">
        {/* Left Quan */}
        <div className={`${QUAN_STYLE} row-span-2`}>
          <div className="text-lg">👑</div>
          <div className="font-bold text-amber-300 leading-tight">Quan</div>
          <div className="text-amber-400/70 mt-0.5">10 quân</div>
        </div>
        {/* Top row — player 2 side (reversed) */}
        <div className="grid grid-cols-5 gap-1">
          {[...fivePits].reverse().map((_, i) => (
            <div key={i} className={DAN_STYLE}>
              <div className="text-sm">🌾</div>
              <div className="text-[#d6c1a8]/60 mt-0.5">5</div>
            </div>
          ))}
        </div>
        {/* Right Quan */}
        <div className={`${QUAN_STYLE} row-span-2`}>
          <div className="text-lg">👑</div>
          <div className="font-bold text-amber-300 leading-tight">Quan</div>
          <div className="text-amber-400/70 mt-0.5">10 quân</div>
        </div>
        {/* Bottom row — player 1 side */}
        <div className="grid grid-cols-5 gap-1">
          {fivePits.map((_, i) => (
            <div key={i} className={DAN_STYLE}>
              <div className="text-sm">🌾</div>
              <div className="text-[#d6c1a8]/60 mt-0.5">5</div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-between text-[10px] text-amber-700/50 px-[52px]">
        <span>← Người chơi 2</span>
        <span>Người chơi 1 →</span>
      </div>
      <p className="text-xs text-[#d6c1a8]/60 text-center">2 ô Quan ở hai đầu · 5 ô Dân mỗi bên · Tổng 70 quân</p>
    </div>
  );
}

function DistanceDemoSection({ paragraphs }: { paragraphs: string[] }) {
  return (
    <div className="space-y-4">
      <TextSection paragraphs={paragraphs} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-sm border border-amber-700/50 bg-amber-950/20 p-4 text-center space-y-2">
          <div className="text-xs text-amber-700/70">BẠN — Tầm bắn: 1</div>
          <div className="text-2xl">🤠 → 🎯</div>
          <div className="text-xs text-amber-300/70">Khoảng cách: 1</div>
          <div className="text-sm font-bold text-amber-300">✓ CÓ THỂ BẮN</div>
        </div>
        <div className="rounded-sm border border-amber-900/40 bg-[#1a1208]/40 p-4 text-center space-y-2">
          <div className="text-xs text-amber-700/60">BẠN — Tầm bắn: 1</div>
          <div className="text-2xl">🤠 → · → 🎯</div>
          <div className="text-xs text-amber-700/50">Khoảng cách: 2</div>
          <div className="text-sm font-bold text-amber-900/70">✕ NGOÀI TẦM</div>
        </div>
      </div>
    </div>
  );
}

/** Bộ tab hướng dẫn theo game — kind của từng section quyết định cách vẽ, không hard-code theo gameKey. */
export default function GameInstructions({ sections }: Props) {
  const [active, setActive] = useState(sections[0]?.id ?? "");
  const baseId = useId();
  const tabs = useRef<Record<string, HTMLButtonElement | null>>({});
  if (sections.length === 0) {
    return <p className="text-amber-800/50 text-sm italic">Trò chơi này chưa có hướng dẫn chi tiết.</p>;
  }
  const section = sections.find((s) => s.id === active) ?? sections[0];

  return (
    <div>
      <div role="tablist" aria-label="Mục hướng dẫn" className="flex gap-1 p-1.5 bg-[#170e08] border border-[#5c3818]/60 rounded-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] mb-4 overflow-x-auto [&::-webkit-scrollbar]:hidden">
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            id={`${baseId}-tab-${s.id}`}
            aria-controls={`${baseId}-panel`}
            aria-selected={s.id === section.id}
            tabIndex={s.id === section.id ? 0 : -1}
            ref={(element) => { tabs.current[s.id] = element; }}
            onClick={() => setActive(s.id)}
            onKeyDown={(event) => {
              const index = sections.findIndex((entry) => entry.id === s.id);
              let next = index;
              if (event.key === "ArrowRight") next = (index + 1) % sections.length;
              else if (event.key === "ArrowLeft") next = (index - 1 + sections.length) % sections.length;
              else if (event.key === "Home") next = 0;
              else if (event.key === "End") next = sections.length - 1;
              else return;
              event.preventDefault();
              setActive(sections[next].id);
              tabs.current[sections[next].id]?.focus();
            }}
            className={`font-serif rounded-sm px-4 py-2 text-xs uppercase tracking-wider transition-all whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 ${
              s.id === section.id
                ? "font-black text-[#221006] bg-gradient-to-b from-[#f5ca80] via-[#d08f3e] to-[#96571a] border-t border-[#ffe4b0] border-b-2 border-[#542d09] shadow-[0_2px_6px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.3)] active:translate-y-0.5"
                : "font-bold text-[#aa9176] hover:text-[#fae2c0] hover:bg-[#25160d]"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div key={section.id} role="tabpanel" id={`${baseId}-panel`} aria-labelledby={`${baseId}-tab-${section.id}`} tabIndex={0} className="animate-game-action-enter rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300">
        {section.kind === "text" && <TextSection paragraphs={section.paragraphs} bullets={section.bullets} />}
        {section.kind === "flow" && <FlowSection steps={section.steps} />}
        {section.kind === "roles" && <RolesSection roles={section.roles} />}
        {section.kind === "cards" && <CardsSection cards={section.cards} />}
        {section.kind === "characters" && <CharactersSection characters={section.characters} />}
        {section.kind === "distanceDemo" && <DistanceDemoSection paragraphs={section.paragraphs} />}
        {section.kind === "racers" && <RacersSection racers={section.racers} />}
        {section.kind === "board" && section.boardKind === "oanquan" && <OAnQuanBoardSection />}
      </div>
    </div>
  );
}
