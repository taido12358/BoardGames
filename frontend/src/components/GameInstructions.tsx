import { useState } from "react";
import type { CardGuideEntry, InstructionSection } from "../platform/gameLibraryTypes";

interface Props {
  sections: InstructionSection[];
}

function TextSection({ paragraphs, bullets }: { paragraphs: string[]; bullets?: string[] }) {
  return (
    <div className="space-y-3">
      {paragraphs.map((p, i) => <p key={i} className="text-sm text-slate-300 leading-relaxed">{p}</p>)}
      {bullets && bullets.length > 0 && (
        <ul className="list-disc list-inside space-y-1.5 text-sm text-slate-300">
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
          <div className="rounded-xl border border-amber-700/50 bg-amber-950/30 px-4 py-2 text-sm font-semibold text-amber-200 text-center">
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
      <p className="text-xs text-amber-300/70 bg-amber-950/30 border border-amber-800/40 rounded-lg px-3 py-2">
        ⚠ Trong ván thật, chỉ Cảnh sát trưởng công khai — các vai trò khác được GIỮ BÍ MẬT cho tới khi lộ hoặc bị loại.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {roles.map((r) => (
          <div key={r.name} className="rounded-xl border border-slate-700 bg-slate-800/60 p-3.5">
            <div className="flex items-center justify-between">
              <div className="font-bold text-amber-100 flex items-center gap-1.5">
                <span>{r.icon}</span> {r.name}
              </div>
              {r.hidden ? (
                <span className="text-[10px] rounded-full bg-slate-900 border border-slate-600 px-2 py-0.5 text-slate-400">VAI TRÒ ẨN</span>
              ) : (
                <span className="text-[10px] rounded-full bg-amber-900/60 border border-amber-600 px-2 py-0.5 text-amber-300">CÔNG KHAI</span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1.5"><span className="text-slate-300 font-medium">Mục tiêu:</span> {r.goal}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CardEntry({ card }: { card: CardGuideEntry }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      aria-expanded={open}
      className="text-left rounded-xl border border-[#7a5c2e]/60 bg-gradient-to-b from-[#2b2013] to-[#1c150c] p-3 hover:border-amber-500/60 transition-colors"
    >
      <div className="text-2xl text-center">{card.icon}</div>
      <div className="text-sm font-bold text-amber-100 text-center mt-1">{card.name}</div>
      <div className="text-[10px] text-amber-300/60 text-center uppercase tracking-wide">{card.type}</div>
      {open && (
        <div className="mt-2 pt-2 border-t border-amber-900/40 space-y-1">
          <p className="text-xs text-slate-300">{card.effect}</p>
          {card.example && <p className="text-[11px] text-amber-300/70 italic">{card.example}</p>}
        </div>
      )}
      {!open && <div className="text-[10px] text-slate-500 text-center mt-1">nhấn để xem chi tiết</div>}
    </button>
  );
}

function CardsSection({ cards }: { cards: CardGuideEntry[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
      {cards.map((c) => <CardEntry key={c.name} card={c} />)}
    </div>
  );
}

function CharactersSection({ characters }: { characters: Extract<InstructionSection, { kind: "characters" }>["characters"] }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">Thông tin nhân vật LUÔN công khai — vai trò ẩn là chuyện khác, xem tab VAI TRÒ.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {characters.map((c) => (
          <div key={c.name} className="rounded-xl border border-slate-700 bg-slate-800/60 p-3.5 flex gap-3">
            <div className="shrink-0 w-12 h-12 rounded-full bg-gradient-to-b from-amber-800 to-amber-950 border border-amber-600/50 flex items-center justify-center text-lg font-black text-amber-200">
              {c.name[0]}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-amber-100">{c.name}</div>
              <div className="text-xs text-red-400">{"❤️".repeat(c.hp)} {c.hp} HP</div>
              <div className="text-xs text-amber-300 font-semibold mt-1">{c.abilityName}</div>
              <p className="text-xs text-slate-400 leading-snug">{c.ability}</p>
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
        <div className="rounded-xl border border-emerald-700/50 bg-emerald-950/20 p-4 text-center space-y-2">
          <div className="text-xs text-slate-400">BẠN — Tầm bắn: 1</div>
          <div className="text-2xl">🤠 → 🎯</div>
          <div className="text-xs text-slate-300">Khoảng cách: 1</div>
          <div className="text-sm font-bold text-emerald-400">✓ CÓ THỂ BẮN</div>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4 text-center space-y-2">
          <div className="text-xs text-slate-400">BẠN — Tầm bắn: 1</div>
          <div className="text-2xl">🤠 → · → 🎯</div>
          <div className="text-xs text-slate-300">Khoảng cách: 2</div>
          <div className="text-sm font-bold text-slate-500">✕ NGOÀI TẦM</div>
        </div>
      </div>
    </div>
  );
}

/** Bộ tab hướng dẫn theo game — kind của từng section quyết định cách vẽ, không hard-code theo gameKey. */
export default function GameInstructions({ sections }: Props) {
  const [active, setActive] = useState(sections[0]?.id ?? "");
  if (sections.length === 0) {
    return <p className="text-slate-500 text-sm">Trò chơi này chưa có hướng dẫn chi tiết.</p>;
  }
  const section = sections.find((s) => s.id === active) ?? sections[0];

  return (
    <div>
      <div role="tablist" aria-label="Mục hướng dẫn" className="flex flex-wrap gap-1.5 border-b border-slate-800 pb-3 mb-4">
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={s.id === section.id}
            onClick={() => setActive(s.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
              s.id === section.id ? "bg-amber-700 text-white" : "bg-slate-800/70 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
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
