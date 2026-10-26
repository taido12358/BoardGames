import { useState } from "react";
import type { MonopolyMap, MonopolyState, MonopolyMove } from "./types";

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
  const properties = (owner: number, selected: number[], change: (ids: number[]) => void) => map.tiles
    .filter(t => state.properties[t.index].owner === owner)
    .map(t => <label key={t.index} className="flex gap-2 py-1 text-sm"><input type="checkbox" checked={selected.includes(t.index)}
      onChange={e => change(e.target.checked ? [...selected, t.index] : selected.filter(i => i !== t.index))} />
      {t.name}{state.properties[t.index].mortgaged ? " (thế chấp)" : ""}</label>);
  const cards = (owner: number, selected: string[], change: (ids: string[]) => void) => state.players[owner]?.jailCards
    .map(card => <label key={card} className="flex gap-2 py-1 text-sm"><input type="checkbox" checked={selected.includes(card)}
      onChange={e => change(e.target.checked ? [...selected, card] : selected.filter(c => c !== card))} />
      Thẻ ra tù ({card === "Chance" ? "Cơ hội" : "Quỹ cộng đồng"})</label>);
  return <details className="rounded border border-amber-900 p-3">
    <summary className="cursor-pointer text-amber-200">Đề nghị giao dịch</summary>
    <form className="mt-3 space-y-3" onSubmit={e => { e.preventDefault(); send({ type: "TRADE", target, offered, requested, cashOffered, cashRequested, offeredCards, requestedCards, redeemRequested }); }}>
      <label className="block">Giao dịch với <select aria-label="Người giao dịch" className="ml-2 rounded bg-stone-900 p-2" value={target}
        onChange={e => { setTarget(Number(e.target.value)); setRequested([]); setRequestedCards([]); }}>
        {state.players.map((p,i) => i !== seat && !p.bankrupt ? <option value={i} key={i}>{p.name}</option> : null)}
      </select></label>
      <fieldset><legend>Bạn đưa</legend>{properties(seat, offered, setOffered)}{cards(seat, offeredCards, setOfferedCards)}
        <label>Tiền đưa <input aria-label="Tiền đưa" className="w-28 rounded bg-stone-900 p-2" type="number" min={0} max={state.players[seat].cash}
          value={cashOffered} onChange={e => setCashOffered(Number(e.target.value))} /></label>
      </fieldset>
      <fieldset><legend>Bạn nhận</legend>{properties(target, requested, setRequested)}{cards(target, requestedCards, setRequestedCards)}
        <label>Tiền nhận <input aria-label="Tiền nhận" className="w-28 rounded bg-stone-900 p-2" type="number" min={0} max={state.players[target]?.cash ?? 0}
          value={cashRequested} onChange={e => setCashRequested(Number(e.target.value))} /></label>
      </fieldset>
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={redeemRequested} onChange={e => setRedeemRequested(e.target.checked)} />Giải chấp ngay các đất bạn nhận (gốc + 10% lãi)</label>
      <p className="text-xs text-amber-300/70">Nếu giữ thế chấp, người nhận trả 10% lãi ngay. Lần giải chấp sau vẫn trả gốc + 10%.</p>
      <button className="rounded bg-amber-800 px-3 py-2 text-white">Gửi đề nghị</button>
    </form>
  </details>;
}
