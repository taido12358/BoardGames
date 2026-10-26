import { useId, useRef, useState } from "react";
import type { CardGuideEntry, InstructionSection } from "../platform/gameLibraryTypes";

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
  return (
    <div className="space-y-3">
      <p className="text-xs text-amber-300/70 bg-amber-950/30 border border-amber-800/40 rounded-sm px-3 py-2">
        ⚠ Trong ván thật, chỉ Cảnh sát trưởng công khai — các vai trò khác được GIỮ BÍ MẬT cho tới khi lộ hoặc bị loại.
      </p>
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

function CardEntry({ card }: { card: CardGuideEntry }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const ts = TYPE_STYLE[card.type] ?? TYPE_STYLE_DEFAULT;
  return (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      aria-expanded={open}
      aria-controls={panelId}
      className={`text-left w-full rounded-sm border ${ts.border} bg-gradient-to-b ${ts.fromBg} to-[#1c150c] p-3 ${ts.glow} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 transition-all`}
    >
      <div className="text-2xl text-center">{card.icon}</div>
      <div className="text-sm font-bold text-[#f5d09d] text-center mt-1 leading-tight">{card.name}</div>
      <div className={`mt-1.5 text-[9px] font-semibold text-center uppercase tracking-wide rounded-full px-2 py-0.5 border ${ts.badge}`}>{card.type}</div>
      <div id={panelId} aria-hidden={!open} className={`game-guide-collapse ${open ? "is-open" : ""}`}>
        <div className="min-h-0 overflow-hidden">
          <div className="mt-2 pt-2 border-t border-amber-900/40 space-y-1">
            <p className="text-xs text-[#d4b996]/75">{card.effect}</p>
            {card.example && <p className="text-[11px] text-[#e8c07e]/70 italic">{card.example}</p>}
          </div>
        </div>
      </div>
      {!open && <div className="text-[10px] text-amber-800/50 text-center mt-1.5">nhấn để xem</div>}
    </button>
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
      </div>
    </div>
  );
}
