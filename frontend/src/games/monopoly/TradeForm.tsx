import { useState } from "react";
import type { MonopolyMap, MonopolyState, MonopolyMove } from "./types";
import { GROUP_COLORS } from "./types";

const TOKENS = ["🚗", "🚢", "🎩", "🐕", "🐈", "👢", "🦆", "🛒"];
const btnClass = "rounded border border-amber-700 bg-amber-950 px-3 py-1.5 text-sm text-amber-100 hover:bg-amber-800 disabled:opacity-40 disabled:cursor-not-allowed";

interface TradeFormProps {
  map: MonopolyMap; state: MonopolyState; seat: number;
  send: (move: MonopolyMove) => void;
}

export default function TradeForm({ map, state, seat, send }: TradeFormProps) {
  const [target, setTarget] = useState(state.players.findIndex((p, i) => i !== seat && !p.bankrupt));
  const [offered, setOffered] = useState<number[]>([]);
  const [requested, setRequested] = useState<number[]>([]);
  const [cashOffered, setCashOffered] = useState(0);
  const [cashRequested, setCashRequested] = useState(0);
  const [offeredCards, setOfferedCards] = useState<string[]>([]);
  const [requestedCards, setRequestedCards] = useState<string[]>([]);
  const [redeemRequested, setRedeemRequested] = useState(false);

  const toggle = (id: number, list: number[], set: (l: number[]) => void) =>
    set(list.includes(id) ? list.filter(i => i !== id) : [...list, id]);
  const toggleCard = (card: string, list: string[], set: (l: string[]) => void) =>
    set(list.includes(card) ? list.filter(c => c !== card) : [...list, card]);

  const PropertyChips = ({ owner, selected, onChange }: { owner: number; selected: number[]; onChange: (ids: number[]) => void }) => {
    const tiles = map.tiles.filter(t => state.properties[t.index].owner === owner);
    if (!tiles.length) return <span className="text-[10px] text-stone-500 italic">Không có đất</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {tiles.map(t => {
          const checked = selected.includes(t.index);
          const mortgaged = state.properties[t.index].mortgaged;
          return (
            <button key={t.index} type="button"
              onClick={() => toggle(t.index, selected, onChange)}
              title={`${t.name}${mortgaged ? " (TC)" : ""}`}
              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] border transition-all ${
                checked
                  ? `${GROUP_COLORS[t.group] ?? "bg-stone-600"} border-white/30 text-stone-900 font-bold ring-1 ring-white/40`
                  : `bg-stone-900/60 border-stone-700/40 text-stone-400 opacity-60 hover:opacity-100`
              } ${mortgaged ? "line-through" : ""}`}>
              {t.name}
            </button>
          );
        })}
      </div>
    );
  };

  const CardChips = ({ owner, selected, onChange }: { owner: number; selected: string[]; onChange: (l: string[]) => void }) => {
    const cards = state.players[owner]?.jailCards ?? [];
    if (!cards.length) return null;
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {cards.map(card => {
          const checked = selected.includes(card);
          return (
            <button key={card} type="button"
              onClick={() => toggleCard(card, selected, onChange)}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] border transition-all ${
                checked ? "bg-amber-700/70 border-amber-500/50 text-amber-100 font-bold ring-1 ring-amber-400/30" : "bg-stone-900/60 border-stone-700/40 text-stone-400 opacity-60 hover:opacity-100"
              }`}>
              🎫 {card === "Chance" ? "Cơ hội" : "Cộng đồng"}
            </button>
          );
        })}
      </div>
    );
  };

  const canSend = (offered.length > 0 || cashOffered > 0 || offeredCards.length > 0 || requested.length > 0 || cashRequested > 0 || requestedCards.length > 0);

  return (
    <details className="rounded-xl border border-sky-900/50 bg-sky-950/10">
      <summary className="cursor-pointer px-4 py-3 font-semibold text-sky-300/80 flex items-center gap-2 select-none">
        <span>🤝 Đề nghị giao dịch</span>
      </summary>
      <form className="p-4 space-y-4"
        onSubmit={e => { e.preventDefault(); send({ type: "TRADE", target, offered, requested, cashOffered, cashRequested, offeredCards, requestedCards, redeemRequested }); }}>
        {/* Target player */}
        <label className="block">
          <span className="text-xs text-sky-400/70 uppercase tracking-wider">Giao dịch với</span>
          <select aria-label="Người giao dịch" className="w-full rounded bg-stone-900 border border-stone-700 p-2 mt-1"
            value={target} onChange={e => { setTarget(Number(e.target.value)); setRequested([]); setRequestedCards([]); }}>
            {state.players.map((p, i) => i !== seat && !p.bankrupt ? <option value={i} key={i}>{TOKENS[i]} {p.name}</option> : null)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          {/* You give */}
          <div className="space-y-2 rounded-lg bg-stone-900/40 border border-stone-700/30 p-2.5">
            <div className="text-[10px] text-amber-400/60 uppercase tracking-wider flex items-center gap-1">
              <span>{TOKENS[seat]}</span><span>Bạn đưa</span>
            </div>
            <PropertyChips owner={seat} selected={offered} onChange={setOffered} />
            <CardChips owner={seat} selected={offeredCards} onChange={setOfferedCards} />
            <label className="flex items-center gap-1.5 text-xs">
              <span className="text-stone-400 shrink-0">$</span>
              <input aria-label="Tiền đưa" className="w-full rounded bg-stone-800 border border-stone-700 p-1 text-sm" type="number" min={0}
                max={state.players[seat].cash} value={cashOffered} onChange={e => setCashOffered(Number(e.target.value))} />
            </label>
          </div>
          {/* You receive */}
          <div className="space-y-2 rounded-lg bg-stone-900/40 border border-stone-700/30 p-2.5">
            <div className="text-[10px] text-amber-400/60 uppercase tracking-wider flex items-center gap-1">
              <span>{TOKENS[target]}</span><span>Bạn nhận</span>
            </div>
            <PropertyChips owner={target} selected={requested} onChange={setRequested} />
            <CardChips owner={target} selected={requestedCards} onChange={setRequestedCards} />
            <label className="flex items-center gap-1.5 text-xs">
              <span className="text-stone-400 shrink-0">$</span>
              <input aria-label="Tiền nhận" className="w-full rounded bg-stone-800 border border-stone-700 p-1 text-sm" type="number" min={0}
                max={state.players[target]?.cash ?? 0} value={cashRequested} onChange={e => setCashRequested(Number(e.target.value))} />
            </label>
          </div>
        </div>
        {/* Monopoly completion warnings */}
        {(() => {
          const warnings: string[] = [];
          // Check if "offered" (tiles you give away) would complete a monopoly for target
          const targetAfter = [...map.tiles.filter(t => state.properties[t.index].owner === target && !requested.includes(t.index)), ...map.tiles.filter(t => offered.includes(t.index))];
          const groups = [...new Set(targetAfter.map(t => t.group).filter(Boolean))];
          groups.forEach(g => {
            const allInGroup = map.tiles.filter(t => t.group === g && t.kind === "Street");
            if (allInGroup.length > 0 && allInGroup.every(t => targetAfter.some(t2 => t2.index === t.index))) {
              warnings.push(`⚠️ ${TOKENS[target]} ${state.players[target]?.name} sẽ độc quyền nhóm ${g}!`);
            }
          });
          // Check if "requested" (tiles you receive) would complete a monopoly for seat
          const seatAfter = [...map.tiles.filter(t => state.properties[t.index].owner === seat && !offered.includes(t.index)), ...map.tiles.filter(t => requested.includes(t.index))];
          const seatGroups = [...new Set(seatAfter.map(t => t.group).filter(Boolean))];
          seatGroups.forEach(g => {
            const allInGroup = map.tiles.filter(t => t.group === g && t.kind === "Street");
            if (allInGroup.length > 0 && allInGroup.every(t => seatAfter.some(t2 => t2.index === t.index))) {
              warnings.push(`✅ Bạn sẽ độc quyền nhóm ${g}!`);
            }
          });
          return warnings.length > 0 ? (
            <div className="space-y-1">
              {warnings.map((w, wi) => (
                <div key={wi} className={`text-xs rounded px-2 py-1 border ${w.startsWith("✅") ? "bg-emerald-950/40 border-emerald-800/40 text-emerald-300/80" : "bg-red-950/30 border-red-800/40 text-red-300/80"}`}>{w}</div>
              ))}
            </div>
          ) : null;
        })()}
        <label className="flex items-start gap-2 text-xs text-amber-200/60 cursor-pointer">
          <input type="checkbox" className="mt-0.5" checked={redeemRequested} onChange={e => setRedeemRequested(e.target.checked)} />
          Giải chấp ngay đất nhận (gốc + 10% lãi)
        </label>
        <button type="submit" disabled={!canSend} className={`${btnClass} w-full`}>
          📤 Gửi đề nghị giao dịch
        </button>
      </form>
    </details>
  );
}
