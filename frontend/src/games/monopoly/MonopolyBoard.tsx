import { useState, useRef, useEffect } from "react";
import { useGameStore } from "../../platform/gameStore";
import { ConnectionBanner, DisconnectBadge, LeaveRoomButton, RematchButton, RoomErrorBanner, RoomStatusBanner } from "../../platform/RoomShell";
import { actor, boardPosition, GROUP_COLORS } from "./types";
import type { MonopolyMap, MonopolyState, MonopolyMove } from "./types";
import TradeForm from "./TradeForm";
import type { RoomDto } from "../../platform/types";

interface MonopolyBoardProps {
  makeMove: (roomId: string, move: unknown) => void;
  onLeave: () => void; onRematch: () => void; rematching: boolean;
  replayRoom?: RoomDto<MonopolyMap, MonopolyState>;
}
const TOKENS = ["🚗", "🚢", "🎩", "🐕", "🐈", "👢", "🦆", "🛒"];
const PHASES: Record<string, string> = { Roll: "Đổ xúc xắc", Buy: "Mua tài sản", End: "Kết thúc lượt", Auction: "Đấu giá", BuildingDemand: "Xác nhận nhu cầu xây", Debt: "Thanh toán nợ", Trade: "Giao dịch", Inheritance: "Nhận tài sản thế chấp", Finished: "Đã kết thúc" };
const buttonClass = "rounded border border-amber-700 bg-amber-950 px-3 py-2 text-sm text-amber-100 hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200";

export default function MonopolyBoard({ makeMove, onLeave, onRematch, rematching, replayRoom }: MonopolyBoardProps) {
  const live = useGameStore();
  const room = replayRoom ?? live.room;
  const mySide = replayRoom ? null : live.mySide;
  const error = replayRoom ? null : live.error;
  const connectionState = replayRoom ? "connected" : live.connectionState;
  const [selected, setSelected] = useState(0);
  const [bid, setBid] = useState(10);
  const [diceRolling, setDiceRolling] = useState(false);
  const [cardOverlay, setCardOverlay] = useState<{ text: string; kind: "chance" | "community" | "other" } | null>(null);
  const [paymentOverlay, setPaymentOverlay] = useState<{ payer: number; payee: number | null; amount: number } | null>(null);
  const prevDiceKey = useRef<string>("");
  const prevCard = useRef<string>("");
  const prevPaymentRef = useRef<string>("");

  const gameState = (room?.state ?? null) as MonopolyState | null;
  const diceKey = gameState?.dice?.some(n => n > 0) ? (gameState.dice ?? []).join(",") : "";
  const lastCardText = gameState?.lastCard ?? "";

  useEffect(() => {
    if (!diceKey || diceKey === prevDiceKey.current) return;
    prevDiceKey.current = diceKey;
    setDiceRolling(true);
    const t = setTimeout(() => setDiceRolling(false), 920);
    return () => clearTimeout(t);
  }, [diceKey]);

  useEffect(() => {
    if (!lastCardText || lastCardText === prevCard.current) return;
    prevCard.current = lastCardText;
    const lower = lastCardText.toLowerCase();
    const kind = lower.includes("cộng đồng") ? "community" : lower.includes("may mắn") ? "chance" : "other";
    setCardOverlay({ text: lastCardText, kind });
    const t = setTimeout(() => setCardOverlay(null), 3500);
    return () => clearTimeout(t);
  }, [lastCardText]);

  const paymentKey = (gameState?.payments ?? []).map(p => `${p.from}:${p.to ?? "bank"}:${p.amount}`).join("|");
  useEffect(() => {
    if (!paymentKey || paymentKey === prevPaymentRef.current) return;
    prevPaymentRef.current = paymentKey;
    const payments = gameState?.payments ?? [];
    const big = payments.find(p => p.amount >= 100);
    if (!big) return;
    setPaymentOverlay({ payer: big.from, payee: big.to, amount: big.amount });
    const t = setTimeout(() => setPaymentOverlay(null), 2800);
    return () => clearTimeout(t);
  }, [paymentKey, gameState?.payments]);

  const [cashDeltas, setCashDeltas] = useState<{ id: number; player: number; amount: number }[]>([]);
  const [flashTiles, setFlashTiles] = useState<Set<number>>(new Set());
  const [nwHistory, setNwHistory] = useState<number[][]>([]);
  const prevNwRef = useRef<number[]>([]);
  const prevCashRef = useRef<Record<number, number>>({});
  const prevOwnerRef = useRef<Record<number, number>>({});
  const deltaIdRef = useRef(0);
  const logRef = useRef<HTMLOListElement>(null);
  const prevLogLenRef = useRef<number>(0);
  const [logNewStart, setLogNewStart] = useState<number>(Number.MAX_SAFE_INTEGER);
  const prevBankruptRef = useRef<Record<number, boolean>>({});
  const [newBankrupts, setNewBankrupts] = useState<Set<number>>(new Set());
  const prevPositionRef = useRef<Record<number, number>>({});
  const [movedTiles, setMovedTiles] = useState<Set<number>>(new Set());

  const cashKey = (gameState?.players ?? []).map(p => p.cash).join(",");
  const ownerKey = (gameState?.properties ?? []).map(p => p.owner ?? -1).join(",");

  useEffect(() => {
    const parts = cashKey ? cashKey.split(",").map(Number) : [];
    if (!parts.length) return;
    const newDeltas: { id: number; player: number; amount: number }[] = [];
    parts.forEach((cash, i) => {
      const prev = prevCashRef.current[i];
      if (prev !== undefined && prev !== cash) {
        newDeltas.push({ id: deltaIdRef.current++, player: i, amount: cash - prev });
      }
      prevCashRef.current[i] = cash;
    });
    if (!newDeltas.length) return;
    setCashDeltas(d => [...d, ...newDeltas]);
    const ids = new Set(newDeltas.map(d => d.id));
    const t = setTimeout(() => setCashDeltas(d => d.filter(x => !ids.has(x.id))), 1700);
    return () => clearTimeout(t);
  }, [cashKey]);

  useEffect(() => {
    const parts = ownerKey ? ownerKey.split(",").map(Number) : [];
    if (!parts.length) return;
    const newFlash = new Set<number>();
    parts.forEach((owner, i) => {
      const prev = prevOwnerRef.current[i];
      if (owner !== -1 && prev !== undefined && prev !== owner) newFlash.add(i);
      prevOwnerRef.current[i] = owner;
    });
    if (!newFlash.size) return;
    setFlashTiles(newFlash);
    const t = setTimeout(() => setFlashTiles(new Set()), 1300);
    return () => clearTimeout(t);
  }, [ownerKey]);

  const logLen = gameState?.log?.length ?? 0;
  useEffect(() => {
    const prev = prevLogLenRef.current;
    prevLogLenRef.current = logLen;
    if (logLen <= prev) return;
    setLogNewStart(prev);
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    const t = setTimeout(() => setLogNewStart(Number.MAX_SAFE_INTEGER), 600);
    return () => clearTimeout(t);
  }, [logLen]);

  const cashSnapshotKey = (gameState?.players ?? []).map(p => p.cash).join(",");
  useEffect(() => {
    const parts = cashSnapshotKey.split(",").map(Number);
    if (!parts.length || cashSnapshotKey === "" || parts.every((v, i) => v === (prevNwRef.current[i] ?? -1))) return;
    prevNwRef.current = parts;
    setNwHistory(h => [...h.slice(-14), parts]);
  }, [cashSnapshotKey]);

  const bankruptKey = (gameState?.players ?? []).map(p => p.bankrupt ? 1 : 0).join(",");
  useEffect(() => {
    const parts = bankruptKey ? bankruptKey.split(",").map(Number) : [];
    if (!parts.length) return;
    const newly = new Set<number>();
    parts.forEach((v, i) => {
      if (v === 1 && !prevBankruptRef.current[i]) newly.add(i);
      prevBankruptRef.current[i] = v === 1;
    });
    if (!newly.size) return;
    setNewBankrupts(newly);
    const t = setTimeout(() => setNewBankrupts(new Set()), 2000);
    return () => clearTimeout(t);
  }, [bankruptKey]);

  const positionKey = (gameState?.players ?? []).map(p => p.position).join(",");
  useEffect(() => {
    const parts = positionKey ? positionKey.split(",").map(Number) : [];
    if (!parts.length) return;
    const moved = new Set<number>();
    parts.forEach((pos, i) => {
      const prev = prevPositionRef.current[i];
      if (prev !== undefined && prev !== pos) moved.add(pos);
      prevPositionRef.current[i] = pos;
    });
    if (!moved.size) return;
    setMovedTiles(moved);
    const t = setTimeout(() => setMovedTiles(new Set()), 900);
    return () => clearTimeout(t);
  }, [positionKey]);

  if (!room) return null;
  const map = room.map as MonopolyMap | null;
  const state = room.state as MonopolyState | null;
  if (!map || !Array.isArray(map.tiles) || map.tiles.length !== 40 || !state || !Array.isArray(state.players)
    || !Array.isArray(state.properties) || state.properties.length !== 40 || !Array.isArray(state.log)) {
    return <div role="alert">Không đọc được bàn cờ. Hãy tải lại phòng.</div>;
  }
  const seat = mySide && /^P[0-7]$/.test(mySide) ? Number(mySide.slice(1)) : -1;
  const currentActor = actor(state);
  const deciding = seat === currentActor && room.status === "Playing" && connectionState === "connected";
  const player = state.players[seat];
  const tile = map.tiles[selected];
  const property = state.properties[selected];
  const minimumBid = Math.max(map.auctionMinimumBid ?? 10, (state.auction?.bid ?? 0) + 1);
  const inheritedTile = state.inheritedMortgages?.[0] ? map.tiles[state.inheritedMortgages[0].tile] : null;
  const inheritanceInterest = inheritedTile ? Math.ceil(inheritedTile.price / 20) : 0;
  const buildAuctionTiles = state.auction?.eligibleTiles?.[seat] ?? [];
  const biddingTile = buildAuctionTiles.includes(selected) ? selected : buildAuctionTiles[0];
  const demandTiles = state.buildingDemand?.eligibleTiles[seat] ?? [];
  const requestedTile = demandTiles.includes(selected) ? selected : demandTiles[0];
  const canManage = !!player && !player.bankrupt && room.status === "Playing" && connectionState === "connected"
    && !["Auction", "BuildingDemand", "Trade"].includes(state.phase) && (!["Debt", "Inheritance"].includes(state.phase) || seat === currentActor);
  const send = (move: MonopolyMove) => makeMove(room.id, move);
  const action = (label: string, type: string, disabled = false, extraClass = "") => <button key={type} className={`${buttonClass}${extraClass ? ` ${extraClass}` : ""}`}
    disabled={!deciding || disabled} onClick={() => send({ type })}>{label}</button>;
  const names = (ids: number[]) => ids.map(i => map.tiles[i]?.name ?? "?").join(", ") || "Không có đất";

  // ── Net worth = cash + estimated property equity ─────────────────────────
  const playerNetWorth = state.players.map((p, i) => {
    if (p.bankrupt) return 0;
    const propEq = map.tiles.reduce((s, t) => {
      const pr = state.properties[t.index];
      if (pr.owner !== i) return s;
      const base = pr.mortgaged ? Math.floor(t.price / 4) : Math.floor(t.price / 2);
      const houses = t.houseCost ? pr.buildings * Math.floor(t.houseCost / 2) : 0;
      return s + base + houses;
    }, 0);
    return p.cash + propEq;
  });
  const maxNetWorth = Math.max(...playerNetWorth.filter((_, i) => !state.players[i].bankrupt), 1);

  // Monopoly detection
  const groupTiles = map.tiles.reduce<Record<string, number[]>>((acc, t) => {
    if (t.group && t.kind === "Street") { if (!acc[t.group]) acc[t.group] = []; acc[t.group].push(t.index); }
    return acc;
  }, {});
  const playerMonopolies = state.players.map((_, i) =>
    Object.keys(groupTiles).filter(g => groupTiles[g].every(idx => state.properties[idx].owner === i))
  );
  const monopolyTileSet = new Set(
    Object.values(groupTiles).filter(idxs => {
      const owner = state.properties[idxs[0]].owner;
      return owner !== null && idxs.every(idx => state.properties[idx].owner === owner);
    }).flat()
  );

  const logIcon = (line: string) => {
    const l = line.toLowerCase();
    if (l.includes("phá sản")) return "💀";
    if (l.includes("đổ") || l.includes("xúc xắc")) return "🎲";
    if (l.includes("mua")) return "🏠";
    if (l.includes("đấu giá") || l.includes("trả giá")) return "🔨";
    if (l.includes("xây") || l.includes("khách sạn")) return "🏗";
    if (l.includes("tù")) return "⛓";
    if (l.includes("thế chấp") || l.includes("cầm")) return "🔒";
    if (l.includes("giải chấp")) return "✓";
    if (l.includes("may mắn")) return "🍀";
    if (l.includes("cộng đồng")) return "📦";
    if (l.includes("tiền") || l.includes("trả") || l.includes("thuê")) return "💸";
    return "▸";
  };

  return <section className="space-y-4 text-amber-100">
    {!replayRoom && <><ConnectionBanner connectionState={connectionState} />
    <RoomErrorBanner error={error} />
    <DisconnectBadge seats={room.seats} />
    <RoomStatusBanner room={room} mySide={mySide} /></>}
    <header className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-900/40 bg-stone-950/60 px-4 py-3">
      <div>
        <h1 className="text-xl font-black tracking-wide text-amber-300">🏦 CỜ TỈ PHÚ</h1>
        <p className="text-xs text-amber-300/50 mt-0.5">{map.edition}</p>
      </div>
      {/* Bank stock + phase chips */}
      {state.started && (
        <div className="hidden sm:flex items-center gap-2 text-[10px]">
          <span className="rounded bg-stone-900/60 border border-stone-700/40 px-2 py-1 text-stone-300">🏠 {state.houses}</span>
          <span className="rounded bg-stone-900/60 border border-stone-700/40 px-2 py-1 text-stone-300">🏨 {state.hotels}</span>
          {!state.winner && <span className="rounded bg-amber-900/40 border border-amber-700/40 px-2 py-1 text-amber-300 font-semibold">{PHASES[state.phase] ?? state.phase}</span>}
          {state.doubles > 0 && <span className="rounded bg-amber-900/30 border border-amber-800/30 px-2 py-1 text-amber-400/80">🎲×{state.doubles}</span>}
          {state.players.some(p => p.inJail && !p.bankrupt) && <span className="rounded bg-red-900/30 border border-red-800/30 px-2 py-1 text-red-400/80">⛓×{state.players.filter(p => p.inJail && !p.bankrupt).length}</span>}
          <span className="rounded bg-stone-900/40 border border-stone-700/30 px-2 py-1 text-stone-400">#{state.log.length}</span>
        </div>
      )}
      <div className="flex items-center gap-2">
        {seat >= 0 && player && !player.bankrupt && state.started && (
          <div className="text-right text-[10px] text-amber-200/60 hidden md:block">
            <div>{map.tiles[player.position]?.name ?? "—"}</div>
            <div className="font-bold text-amber-300">${player.cash.toLocaleString("vi-VN")}</div>
          </div>
        )}
        <div className="text-sm text-amber-200/70 font-semibold">
          {replayRoom ? "📼 Bản ghi" : seat < 0 ? "👁 Xem" : `${TOKENS[seat]} ${player?.name ?? "—"}`}
        </div>
      </div>
    </header>
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="overflow-x-auto rounded-xl border border-emerald-700/60 bg-emerald-950 p-2 shadow-inner shadow-emerald-900/40 monopoly-board-felt">
        <div className="grid min-w-[660px] grid-cols-11 grid-rows-11 gap-0.5 aspect-square" aria-label="Bàn cờ 40 ô">
          {map.tiles.map(t => {
            const p = state.properties[t.index];
            const occupants = state.players.map((who,i) => !who.bankrupt && who.position === t.index ? i : -1).filter(i => i >= 0);
            return <button type="button" key={t.index} data-monopoly-tile="1" data-group={t.group} style={boardPosition(t.index)} onClick={() => setSelected(t.index)}
              aria-pressed={selected === t.index} aria-label={`Ô ${t.index}: ${t.name}${p.owner !== null ? `, chủ ${state.players[p.owner]?.name}` : ""}`}
              className={`relative flex min-h-0 flex-col overflow-hidden border text-[9px] leading-tight text-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white transition-[box-shadow,transform] duration-150 active:scale-95 hover:brightness-125 ${selected === t.index ? "border-amber-200 bg-amber-900" : "border-emerald-800/70 bg-stone-900/80"} ${flashTiles.has(t.index) ? "monopoly-tile-just-purchased" : ""} ${monopolyTileSet.has(t.index) ? "ring-1 ring-inset ring-amber-300/50" : ""} ${movedTiles.has(t.index) ? "monopoly-tile-player-land" : ""} ${p.buildings > 0 ? "monopoly-tile-built" : ""}`}>
              <span aria-hidden="true" className={`h-2 w-full shrink-0 ${GROUP_COLORS[t.group] ?? "bg-stone-700"}`} />
              {/* Special tile icon overlay */}
              {!t.group && ({"Go":"🏁","Jail":"⛓","FreeParking":"🅿","GoToJail":"🚔","Chance":"🎲","CommunityChest":"📦","IncomeTax":"💸","LuxuryTax":"💎","Railroad":"🚂","Utility":"⚡"} as Record<string,string>)[t.kind] && (
                <span className="text-sm leading-none mx-auto">{({"Go":"🏁","Jail":"⛓","FreeParking":"🅿","GoToJail":"🚔","Chance":"🎲","CommunityChest":"📦","IncomeTax":"💸","LuxuryTax":"💎","Railroad":"🚂","Utility":"⚡"} as Record<string,string>)[t.kind]}</span>
              )}
              {t.kind === "Go" && <span className="text-[6px] text-emerald-400 font-bold leading-none">+$200</span>}
              <span className="p-0.5">{t.name}</span>
              {t.price > 0 && <span>{t.price}</span>}
              {p.owner !== null && (
                <span title={state.players[p.owner]?.name} className="flex flex-col items-center gap-0">
                  <span>{TOKENS[p.owner]}{p.mortgaged ? "🔒" : ""}</span>
                  {p.buildings > 0 && (
                    <span className={`text-[6px] leading-none tracking-tight ${p.buildings === 5 ? "text-red-400" : "text-emerald-400"}`}>
                      {"●".repeat(p.buildings === 5 ? 1 : p.buildings)}{p.buildings === 5 ? "H" : ""}
                    </span>
                  )}
                </span>
              )}
              {/* Jail badge on tile 10 */}
              {t.index === 10 && state.players.some(pl => pl.inJail && !pl.bankrupt) && (
                <span className="absolute top-0.5 right-0.5 text-[8px] bg-red-950/80 border border-red-800/60 rounded px-0.5 leading-tight">⛓</span>
              )}
              <span className="mt-auto text-xs" aria-hidden="true">{occupants.map(i => <span key={i} className="monopoly-token-land">{TOKENS[i]}</span>)}</span>
            </button>;
          })}
          <div className="col-start-2 col-end-11 row-start-2 row-end-11 flex flex-col items-center justify-center gap-3 overflow-auto p-4 text-center relative">
            {!state.started ? (
              <div className="w-full space-y-4 text-left">
                <div className="text-center">
                  <div className="text-4xl mb-1 animate-pulse" aria-hidden="true">🏦</div>
                  <h2 className="text-xl font-black tracking-widest text-amber-300">CỜ TỈ PHÚ</h2>
                  <p className="text-[10px] text-emerald-100/30 mt-0.5">{map.edition}</p>
                </div>
                <div className="space-y-1">
                  {state.players.map((pl, pi) => {
                    const connected = room.seats?.[pi]?.connected ?? false;
                    return (
                      <div key={pi} className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm border ${pi === seat ? "bg-amber-900/40 border-amber-700/40" : "bg-stone-900/40 border-stone-800/30"}`}>
                        <span className="text-base">{TOKENS[pi]}</span>
                        <span className="font-medium flex-1 truncate">{pl.name}</span>
                        <span className={`w-2 h-2 rounded-full shrink-0 ${connected ? "bg-emerald-400" : "bg-stone-600"}`} title={connected ? "Online" : "Offline"} />
                        {pi === seat && <span className="text-[9px] text-amber-400/60">(Bạn)</span>}
                      </div>
                    );
                  })}
                </div>
                <div className="text-center space-y-1">
                  <p className="text-[10px] text-emerald-100/30">⏳ Chờ chủ phòng bắt đầu…</p>
                  <p className="text-[10px] text-emerald-100/20">Mua đất · Xây nhà · Phá sản đối thủ</p>
                </div>
              </div>
            ) : state.winner ? (
              <div className="w-full space-y-3">
                <div className="space-y-1">
                  <p className="monopoly-winner-banner text-2xl font-black text-amber-300">🏆 {state.players[Number(state.winner.slice(1))]?.name}</p>
                  <p className="text-xs text-amber-400/60">Chiến thắng!</p>
                </div>
                <div className="w-full space-y-0.5">
                  {[...state.players.map((pl, idx) => ({ pl, idx, nw: playerNetWorth[idx] }))]
                    .sort((a, b) => b.nw - a.nw)
                    .map(({ pl, idx, nw }, rank) => {
                      const equity = nw - pl.cash;
                      return (
                        <div key={idx} className={`rounded border px-2 py-1.5 text-[10px] ${rank === 0 ? "bg-amber-900/50 border-amber-700/40" : pl.bankrupt ? "opacity-40 border-transparent bg-stone-900/20" : "bg-stone-900/40 border-stone-800/20"}`}>
                          <div className="flex items-center gap-1.5">
                            <span className={`font-bold w-4 shrink-0 ${rank === 0 ? "text-amber-400" : "text-stone-500"}`}>{rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : `${rank+1}.`}</span>
                            <span className="shrink-0">{TOKENS[idx]}</span>
                            <span className="truncate flex-1 text-left text-amber-200/80">{pl.name}</span>
                            <span className={`font-mono font-bold tabular-nums shrink-0 ${pl.bankrupt ? "text-stone-500" : "text-amber-100"}`}>{pl.bankrupt ? "💀" : `$${nw.toLocaleString("vi-VN")}`}</span>
                          </div>
                          {!pl.bankrupt && (
                            <div className="flex gap-2 ml-5 mt-0.5 text-[9px] text-stone-500">
                              <span className="text-yellow-400/60">${pl.cash.toLocaleString("vi-VN")} tiền</span>
                              {equity > 0 && <span className="text-amber-600/60">+${equity.toLocaleString("vi-VN")} tài sản</span>}
                            </div>
                          )}
                        </div>
                      );
                    })
                  }
                </div>
              </div>
            ) : (
              <div role="status" aria-live="polite" className="w-full space-y-3">
                {/* Current player */}
                <div className={`rounded-lg border px-3 py-2 ${state.extraRoll ? "bg-amber-900/30 border-amber-600/50" : "bg-stone-900/60 border-amber-800/30"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-amber-200/50">Lượt hiện tại</p>
                    {state.extraRoll && <span className="text-[10px] bg-amber-800/60 text-amber-300 rounded px-1.5 py-0.5 font-bold animate-pulse">🎲 Đôi! +lượt</span>}
                  </div>
                  <p className="font-bold text-sm">{TOKENS[currentActor]} {state.players[currentActor]?.name}</p>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-amber-300/70">{PHASES[state.phase] ?? state.phase}</p>
                    {state.players[currentActor] && <p className="text-[10px] text-amber-200/60 font-mono">${state.players[currentActor].cash.toLocaleString("vi-VN")}</p>}
                  </div>
                  {state.players[currentActor] && <button type="button" onClick={() => setSelected(state.players[currentActor].position)} className="text-[10px] text-amber-200/40 hover:text-amber-300/70 truncate text-left mt-0.5 w-full">{map.tiles[state.players[currentActor].position]?.name ?? ""}</button>}
                  {state.doubles >= 3 && <p className="text-[10px] text-red-400/80 mt-0.5">⚠️ 3 đôi liên tiếp → vào tù!</p>}
                </div>
                {/* Next player preview */}
                {(() => {
                  const activePlayers = state.players.map((pl, idx) => ({ pl, idx })).filter(x => !x.pl.bankrupt);
                  const curPos = activePlayers.findIndex(x => x.idx === state.turn);
                  const next = activePlayers[(curPos + 1) % activePlayers.length];
                  return next && next.idx !== state.turn ? (
                    <div className="flex items-center gap-1.5 text-[10px] text-stone-500 px-1">
                      <span>Tiếp:</span>
                      <span>{TOKENS[next.idx]}</span>
                      <span className="text-stone-400">{next.pl.name}</span>
                    </div>
                  ) : null;
                })()}
                {/* Dice */}
                <div className="flex justify-center gap-2" aria-label={`Xúc xắc ${state.dice.join(" và ")}`} role="img">
                  {state.dice.map((n, i) => (
                    <div key={i} className={`monopoly-die${diceRolling ? " monopoly-die-rolling" : ""}`} style={diceRolling ? { animationDelay: `${i * 70}ms` } : {}}>
                      <span className="text-2xl" aria-hidden="true">{n > 0 ? ["⚀","⚁","⚂","⚃","⚄","⚅"][n-1] : "◇"}</span>
                    </div>
                  ))}
                </div>
                {state.dice.some(n => n > 0) && (() => {
                  const sum = state.dice.reduce((s,n) => s+n, 0);
                  const isDouble = state.dice[0] === state.dice[1];
                  const actorTile = map.tiles[state.players[currentActor]?.position];
                  return (
                    <div className="space-y-1 text-xs text-amber-200/60">
                      <p>= {sum}{isDouble ? " 🎲 Đôi!" : ""}</p>
                      {actorTile && <button type="button" onClick={() => setSelected(state.players[currentActor]?.position)}
                        className="text-[10px] rounded border border-amber-800/30 bg-stone-900/50 px-2 py-0.5 hover:bg-amber-900/30 transition-colors">
                        {({"Go":"🏁","Jail":"⛓","FreeParking":"🅿","GoToJail":"🚔","Chance":"🎲","CommunityChest":"📦","IncomeTax":"💸","LuxuryTax":"💎"} as Record<string,string>)[actorTile.kind] ?? "📍"} {actorTile.name}
                      </button>}
                    </div>
                  );
                })()}
                {state.utilityDice && <p className="text-[10px] text-amber-200/60">Dịch vụ: {state.utilityDice.join("+")}={state.utilityDice.reduce((s,n)=>s+n,0)}</p>}
                {state.lastCard && !cardOverlay && <p className="max-w-[180px] rounded border border-amber-700/40 bg-stone-950/60 px-2 py-1 text-[10px] text-amber-100/80 leading-snug">{state.lastCard}</p>}
                {/* Mini leaderboard */}
                {(() => {
                  const leaderList = [...state.players.map((pl, idx) => ({ pl, idx, nw: playerNetWorth[idx] }))]
                    .filter(x => !x.pl.bankrupt)
                    .sort((a, b) => b.nw - a.nw);
                  const topNW = leaderList[0]?.nw || 1;
                  return (
                    <div className="space-y-0.5 w-full">
                      {leaderList.map(({ pl, idx, nw }, rank) => (
                        <div key={idx} className={`relative rounded overflow-hidden ${idx === currentActor ? "bg-amber-900/40" : "bg-stone-900/30"}`}>
                          <div className="absolute inset-0 left-0 top-0 h-full bg-amber-700/10 transition-all duration-700" style={{ width: `${Math.round((nw/topNW)*100)}%` }} />
                          <div className="relative flex items-center gap-1 px-1.5 py-0.5 text-[9px]">
                            <span className="text-amber-400/60 w-3 shrink-0">{rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : `${rank+1}.`}</span>
                            <span className="shrink-0">{TOKENS[idx]}</span>
                            <span className="truncate flex-1 text-left text-amber-200/70">{pl.name}</span>
                            <span className="font-mono font-bold text-amber-100/90 tabular-nums shrink-0">${nw.toLocaleString("vi-VN")}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
        {/* Color group legend */}
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 px-1">
          {Object.entries(GROUP_COLORS).map(([group, cls]) => {
            const tiles = groupTiles[group] ?? [];
            if (!tiles.length) return null;
            const firstOwner = state.properties[tiles[0]]?.owner;
            const isMonopoly = firstOwner !== null && tiles.every(idx => state.properties[idx].owner === firstOwner);
            const ownedCount = tiles.filter(idx => state.properties[idx].owner !== null).length;
            return (
              <button key={group} type="button" onClick={() => tiles[0] !== undefined && setSelected(tiles[0])}
                className="flex items-center gap-1 text-[10px] text-amber-200/60 hover:text-amber-200/90 transition-colors">
                <span className={`w-3 h-3 rounded-sm inline-block ${cls} ${isMonopoly ? "ring-1 ring-amber-300/60" : ""}`} />
                <span>{group}</span>
                {isMonopoly && <span>{TOKENS[firstOwner!]}👑</span>}
                {!isMonopoly && ownedCount > 0 && <span className="text-stone-600">{ownedCount}/{tiles.length}</span>}
              </button>
            );
          })}
        </div>
      </div>
      <aside className="space-y-4">
        {state.started && room.status === "Playing" && (() => {
          const phaseColors: Record<string, string> = {
            Roll: "border-amber-500/60 bg-amber-950/30",
            Buy: "border-emerald-500/60 bg-emerald-950/30",
            Auction: "border-violet-500/60 bg-violet-950/30",
            Debt: "border-red-500/60 bg-red-950/30",
            Trade: "border-sky-500/60 bg-sky-950/30",
            BuildingDemand: "border-orange-500/60 bg-orange-950/20",
            Inheritance: "border-teal-500/60 bg-teal-950/20",
            End: "border-stone-600/60 bg-stone-900/30",
          };
          const phaseIcons: Record<string, string> = {
            Roll: "🎲", Buy: "🏠", Auction: "🔨", Debt: "💸", Trade: "🤝",
            BuildingDemand: "🏗", Inheritance: "📜", End: "✓",
          };
          return <div key={state.phase} className={`animate-game-action-enter space-y-3 rounded-xl border p-4 ${phaseColors[state.phase] ?? "border-amber-800"} ${deciding ? "monopoly-my-turn" : ""}`}>
          <h2 className="font-semibold flex items-center gap-2">
            <span>{phaseIcons[state.phase] ?? "▶"}</span>
            <span>{PHASES[state.phase]}</span>
            {deciding && <span className="ml-auto text-[10px] text-amber-400/70 monopoly-actor-badge font-bold">Lượt bạn</span>}
          </h2>
          {!deciding && <p className="text-sm text-amber-200/60">⏳ Chờ {state.players[currentActor]?.name}…</p>}
          <div className="flex flex-wrap gap-2">
            {state.phase === "Roll" && <>{action("🎲 Đổ xúc xắc", "ROLL", false, deciding ? "monopoly-roll-btn-ready" : "")}{player?.inJail && <>{action("Nộp 50 ra tù", "PAY_JAIL", player.cash < 50)}{action("Dùng thẻ ra tù", "JAIL_CARD", player.jailCards.length === 0)}</>}</>}
            {state.phase === "Buy" && (() => {
              const buyTile = map.tiles[state.players[state.turn].position];
              const buyProp = state.properties[state.players[state.turn].position];
              return <>
                {buyTile.group && <div className={`w-full rounded-lg border border-black/20 overflow-hidden ${GROUP_COLORS[buyTile.group] ?? "bg-stone-700"}`}>
                  <div className="flex items-start gap-2 p-2">
                    <div className="text-stone-900 flex-1 min-w-0">
                      <div className="font-bold text-sm leading-tight">{buyTile.name}</div>
                      <div className="text-[10px] opacity-70">{buyTile.group} · {buyProp.owner === null ? "Chưa ai mua" : state.players[buyProp.owner]?.name}</div>
                    </div>
                    <span className="text-stone-900 font-black text-lg shrink-0">${buyTile.price}</span>
                  </div>
                  {player && (
                    <div className="px-2 pb-1.5 flex items-center justify-between text-[10px] text-stone-900/70">
                      <span>Còn: ${(player.cash - buyTile.price).toLocaleString("vi-VN")}</span>
                      {(() => {
                        const groupAll = groupTiles[buyTile.group] ?? [];
                        const ownedAfter = groupAll.filter(idx => state.properties[idx].owner === seat || idx === buyTile.index);
                        return ownedAfter.length === groupAll.length && groupAll.length > 0 ? <span className="font-bold">👑 Độc quyền!</span> : <span>{ownedAfter.length}/{groupAll.length} nhóm</span>;
                      })()}
                    </div>
                  )}
                </div>}
                {action(`🏠 Mua · $${buyTile.price}`, "BUY", false, deciding ? "monopoly-action-pulse" : "")}
                {action("🔨 Đưa ra đấu giá", "DECLINE")}
              </>;
            })()}
            {state.phase === "End" && action(state.extraRoll ? "↩ Tiếp tục lượt đổ đôi" : "✓ Kết thúc lượt", "END", false, deciding ? "monopoly-action-pulse" : "")}
            {state.phase === "Debt" && state.payments[0] && (() => {
              const debt = state.payments[0];
              const creditor = debt.to === null ? null : state.players[debt.to];
              const canPay = player && player.cash >= debt.amount;
              return <>
                <div className="w-full rounded-lg border border-red-800/50 bg-red-950/40 overflow-hidden">
                  <div className="p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-red-400/70 uppercase tracking-wider">Khoản nợ</span>
                      <span className="text-xl font-black text-red-300 tabular-nums">${debt.amount.toLocaleString("vi-VN")}</span>
                    </div>
                    <div className="text-sm text-red-200/80">→ {creditor ? `${TOKENS[debt.to!]} ${creditor.name}` : "🏦 Ngân hàng"}</div>
                    {player && (
                      <div className="flex items-center justify-between text-[10px] text-red-300/60">
                        <span>Tiền mặt: ${player.cash.toLocaleString("vi-VN")}</span>
                        <span>{canPay ? "✓ Đủ" : `Thiếu $${(debt.amount - player.cash).toLocaleString("vi-VN")}`}</span>
                      </div>
                    )}
                  </div>
                  {player && (
                    <div className="h-1 w-full bg-red-900/60">
                      <div className={`h-full transition-all ${canPay ? "bg-emerald-500/70" : "bg-red-500/70"}`} style={{ width: `${Math.min(100, Math.round((player.cash / debt.amount) * 100))}%` }} />
                    </div>
                  )}
                  {!canPay && <div className="px-3 pb-2 text-[10px] text-red-400/60">Tiền mặt không đủ — bán nhà hoặc thế chấp đất.</div>}
                </div>
                {action("💸 Thanh toán", "SETTLE", false, deciding ? "monopoly-action-pulse" : "")}
                {action("💀 Tuyên bố phá sản", "BANKRUPT")}
              </>;
            })()}
            {state.phase === "Inheritance" && inheritedTile && (() => {
              const redeemTotal = inheritedTile.price / 2 + inheritanceInterest;
              const canRedeem = player && player.cash >= redeemTotal;
              return <>
                <div className="w-full rounded-lg border border-teal-800/50 bg-teal-950/30 p-3 space-y-1.5">
                  <div className="text-xs text-teal-400/70 uppercase tracking-wider">📜 Thừa kế đất thế chấp</div>
                  <div className="font-bold text-teal-100">{inheritedTile.name}</div>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div className="rounded bg-stone-900/50 p-2 text-center">
                      <div className="text-[10px] text-teal-400/60">Giữ TC · trả lãi</div>
                      <div className="font-bold text-teal-200">${inheritanceInterest}</div>
                    </div>
                    <div className="rounded bg-stone-900/50 p-2 text-center">
                      <div className="text-[10px] text-teal-400/60">Giải chấp ngay</div>
                      <div className="font-bold text-teal-200">${redeemTotal}</div>
                    </div>
                  </div>
                </div>
                {action(`✓ Giữ TC · $${inheritanceInterest}`, "KEEP_INHERITED", false, deciding ? "monopoly-action-pulse" : "")}
                {action(`🔓 Giải chấp · $${redeemTotal}`, "REDEEM_INHERITED", !canRedeem)}
              </>;
            })()}
          </div>
          {state.phase === "BuildingDemand" && state.buildingDemand && (() => {
            const bd = state.buildingDemand;
            const isHotel = bd.kind === "Hotel";
            const stockLeft = isHotel ? state.hotels : state.houses;
            const responded = bd.responded ?? [];
            return <div className="space-y-2.5 rounded-lg border border-orange-800/50 bg-orange-950/20 p-3 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-orange-400/70 uppercase tracking-wider">Xác nhận nhu cầu xây</div>
                  <div className="font-bold text-orange-200">{isHotel ? "🏨 Khách sạn" : "🏠 Nhà"}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-orange-400/60">Kho ngân hàng</div>
                  <div className="font-bold text-orange-300">{stockLeft} còn</div>
                </div>
              </div>
              <p className="text-xs text-orange-200/60">Đủ cung → mua theo giá niêm yết. Cầu vượt cung → đấu giá.</p>
              {/* Who responded */}
              {state.players.length > 1 && (
                <div className="flex flex-wrap gap-1">
                  {state.players.map((pl, pi) => !pl.bankrupt && (
                    <span key={pi} className={`text-[9px] rounded-full px-1.5 py-0.5 border ${responded.includes(pi) ? "bg-emerald-900/50 border-emerald-700/50 text-emerald-300" : "bg-stone-900/50 border-stone-700/40 text-stone-400"}`}>
                      {TOKENS[pi]} {pl.name}{responded.includes(pi) ? " ✓" : ""}
                    </span>
                  ))}
                </div>
              )}
              {demandTiles.length > 0 && <label className="block">
                <span className="text-xs text-orange-200/70">Đất muốn xây</span>
                <select aria-label="Đất muốn xây" className="w-full rounded bg-stone-900 border border-stone-700 p-1.5 mt-0.5 text-sm" value={requestedTile}
                  onChange={e => setSelected(Number(e.target.value))}>
                  {demandTiles.map(index => <option key={index} value={index}>{map.tiles[index].name} · ${map.tiles[index].houseCost}</option>)}
                </select>
              </label>}
              <div className="flex gap-2">
                <button className={`${buttonClass} flex-1`} disabled={!deciding} onClick={() => send({type:"REQUEST_BUILD",tile:requestedTile})}>🏗 Tôi muốn mua</button>
                {action("Bỏ qua", "SKIP_BUILD")}
              </div>
            </div>;
          })()}
          {state.auction && (() => {
            const auc = state.auction;
            const auctionName = auc.kind === "House" ? "🏠 Nhà" : auc.kind === "Hotel" ? "🏨 Khách sạn" : map.tiles[auc.tile]?.name ?? "?";
            const leader = auc.leader !== null ? state.players[auc.leader] : null;
            const passed = auc.passed ?? [];
            return <div className="space-y-3 rounded-lg border border-violet-800/50 bg-violet-950/30 p-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-violet-400/70 uppercase tracking-wider">Đấu giá</div>
                  <div className="font-bold text-violet-100">{auctionName}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-violet-400/60">Giá hiện tại</div>
                  <div className="text-xl font-black text-violet-300 tabular-nums">${auc.bid.toLocaleString("vi-VN")}</div>
                </div>
              </div>
              {/* Leader + passed status */}
              <div className="flex flex-wrap gap-1.5">
                {leader ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-900/60 border border-violet-700/50 px-2 py-0.5 text-[10px] text-violet-200">
                    👑 {TOKENS[auc.leader!]} {leader.name}
                  </span>
                ) : (
                  <span className="text-[10px] text-violet-400/50 italic">Chưa có người dẫn</span>
                )}
                {passed.map(pi => (
                  <span key={pi} className="inline-flex items-center gap-1 rounded-full bg-stone-900/60 border border-stone-700/40 px-2 py-0.5 text-[10px] text-stone-400 line-through">
                    {TOKENS[pi]} {state.players[pi]?.name}
                  </span>
                ))}
              </div>
              {buildAuctionTiles.length > 0 && <label className="block text-sm text-violet-200/70">Đất xây <select aria-label="Đất xây sau đấu giá" className="w-full rounded bg-stone-900 p-1.5 mt-0.5" value={biddingTile}
                onChange={e => setSelected(Number(e.target.value))}>{buildAuctionTiles.map(index => <option key={index} value={index}>{map.tiles[index].name}</option>)}</select></label>}
              <div className="flex items-center gap-2">
                <label className="text-sm text-violet-200/70 shrink-0">Giá đấu</label>
                <input aria-label="Giá đấu" className="w-28 rounded bg-stone-900 border border-stone-700 p-1.5 text-sm" type="number" min={minimumBid} max={player?.cash ?? 0} value={Math.max(bid,minimumBid)} onChange={e => setBid(Number(e.target.value))} />
              </div>
              <div className="flex gap-2">
                <button className={`${buttonClass} flex-1`} disabled={!deciding} onClick={() => send({type:"BID",amount:Math.max(bid,minimumBid),...(biddingTile !== undefined ? {tile:biddingTile} : {})})}>🔨 Trả giá</button>
                {action("Bỏ qua", "PASS")}
              </div>
            </div>;
          })()}
          {state.trade && (() => {
            const tr = state.trade;
            const TradeParty = ({ label, playerIdx, tiles, cash, cards }: { label: string; playerIdx: number; tiles: number[]; cash: number; cards: number }) => (
              <div className="rounded-lg bg-stone-900/50 border border-stone-700/40 p-2.5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-amber-200/60">
                  <span>{TOKENS[playerIdx]}</span>
                  <span className="font-semibold text-amber-200/90">{state.players[playerIdx]?.name}</span>
                  <span className="ml-auto text-amber-400/50">{label}</span>
                </div>
                {cash > 0 && <div className="text-sm font-bold text-emerald-300">${cash.toLocaleString("vi-VN")}</div>}
                {cards > 0 && <div className="text-xs text-amber-300/70">🎫 ×{cards} thẻ ra tù</div>}
                {tiles.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tiles.map(ti => {
                      const t2 = map.tiles[ti];
                      return <button key={ti} onClick={() => setSelected(ti)} title={t2.name}
                        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] border border-black/20 ${GROUP_COLORS[t2.group] ?? "bg-stone-600"} text-stone-900 font-medium ${state.properties[ti].mortgaged ? "opacity-50 line-through" : ""}`}>
                        {t2.name}
                      </button>;
                    })}
                  </div>
                )}
                {tiles.length === 0 && cash === 0 && cards === 0 && <span className="text-[10px] text-stone-500 italic">Không đưa gì</span>}
              </div>
            );
            return <div className="space-y-2 rounded-lg border border-sky-800/50 bg-sky-950/20 p-3">
              <div className="text-xs text-sky-400/70 uppercase tracking-wider font-semibold">🤝 Giao dịch</div>
              <TradeParty label="đưa" playerIdx={tr.from} tiles={tr.offered} cash={tr.cashOffered} cards={tr.offeredCards?.length ?? 0} />
              <div className="text-center text-lg text-sky-400/50">⇄</div>
              <TradeParty label="nhận" playerIdx={tr.to} tiles={tr.requested} cash={tr.cashRequested} cards={tr.requestedCards?.length ?? 0} />
              <div className="flex gap-2 pt-1">
                {action("✓ Chấp nhận", "ACCEPT", false, deciding ? "monopoly-action-pulse" : "")}
                {action("✗ Từ chối", "REJECT")}
              </div>
              {tr.offered.some(ti => state.properties[ti].mortgaged) && (
                <div className="rounded bg-amber-950/50 border border-amber-800/40 p-2 text-xs text-amber-200/70">
                  Nhận đất thế chấp — chấp nhận sẽ giữ TC + trả 10% lãi.
                  <button className={`${buttonClass} w-full mt-1.5 text-xs py-1`} disabled={!deciding}
                    onClick={() => send({type:"ACCEPT",redeemReceived:true})}>Chấp nhận + giải chấp ngay</button>
                </div>
              )}
            </div>;
          })()}
        </div>; })()}
        <div key={selected} className="animate-game-action-enter rounded-xl border border-amber-900 overflow-hidden">
          {/* Color group header strip */}
          {GROUP_COLORS[tile.group] && <div className={`h-2.5 w-full ${GROUP_COLORS[tile.group]} ${property.mortgaged ? "opacity-30" : ""}`} />}
          {property.mortgaged && <div className="bg-red-950/60 border-b border-red-800/50 px-3 py-1 flex items-center gap-1.5 text-[10px] text-red-400/90"><span>🔒</span><span>Đất đang thế chấp — không thu được thuê</span></div>}
          {/* Special tile header for corner/special tiles */}
          {!tile.group && tile.kind !== "Street" && tile.kind !== "Railroad" && tile.kind !== "Utility" && (() => {
            const SPECIAL: Record<string, { icon: string; color: string; desc: string }> = {
              Go: { icon: "🏁", color: "bg-emerald-900/50 border-emerald-700/40", desc: "Khi qua ô này: nhận $200 từ ngân hàng." },
              Jail: { icon: "⛓", color: "bg-stone-800/70 border-stone-600/50", desc: "Chỉ thăm tù. Người bị tù đứng đây nhưng KHÔNG được qua." },
              FreeParking: { icon: "🅿️", color: "bg-sky-900/40 border-sky-700/30", desc: "Ô trung lập — không có hiệu ứng gì." },
              GoToJail: { icon: "🚔", color: "bg-red-900/50 border-red-700/40", desc: "Di chuyển thẳng đến tù, không qua ô Xuất Phát." },
              Chance: { icon: "🎲", color: "bg-amber-900/40 border-amber-700/30", desc: "Rút một thẻ May Mắn và thực hiện theo chỉ dẫn." },
              CommunityChest: { icon: "📦", color: "bg-indigo-900/40 border-indigo-700/30", desc: "Rút một thẻ Quỹ Cộng Đồng và thực hiện theo chỉ dẫn." },
              IncomeTax: { icon: "💸", color: "bg-red-900/40 border-red-700/30", desc: `Nộp thuế thu nhập $${tile.price} cho ngân hàng.` },
              LuxuryTax: { icon: "💎", color: "bg-purple-900/40 border-purple-700/30", desc: `Nộp thuế xa xỉ $${tile.price} cho ngân hàng.` },
            };
            const s = SPECIAL[tile.kind];
            if (!s) return null;
            return <div className={`p-3 border-b ${s.color}`}>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{s.icon}</span>
                <div>
                  <div className="font-bold text-sm">{tile.name}</div>
                  <div className="text-[10px] text-amber-200/50">Ô {selected}</div>
                </div>
              </div>
              <p className="mt-2 text-xs text-amber-200/70">{s.desc}</p>
            </div>;
          })()}
          <div className="p-4 space-y-3">
            {(tile.group || tile.kind === "Street" || tile.kind === "Railroad" || tile.kind === "Utility") && <div>
              <h2 className="font-bold text-amber-100 flex items-center gap-1.5">
                {tile.kind === "Railroad" && <span>🚂</span>}
                {tile.kind === "Utility" && <span>⚡</span>}
                {tile.name}
              </h2>
              <p className="text-xs text-amber-200/50">Ô {selected} · {tile.group || tile.kind}</p>
            </div>}
            {tile.price > 0 && (
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-lg bg-stone-900/60 px-2 py-1.5 text-center">
                  <div className="text-[10px] text-amber-200/50">Mua</div>
                  <div className="font-bold tabular-nums">${tile.price}</div>
                </div>
                {["Street","Railroad","Utility"].includes(tile.kind) && (
                  <div className="rounded-lg bg-stone-900/60 px-2 py-1.5 text-center">
                    <div className="text-[10px] text-amber-200/50">TC</div>
                    <div className="font-bold tabular-nums">${tile.price/2}</div>
                  </div>
                )}
                {tile.houseCost > 0 && (
                  <div className="rounded-lg bg-stone-900/60 px-2 py-1.5 text-center">
                    <div className="text-[10px] text-amber-200/50">Xây</div>
                    <div className="font-bold tabular-nums">${tile.houseCost}</div>
                  </div>
                )}
              </div>
            )}
            {tile.rents && (() => {
              const hasMonopoly = tile.group && monopolyTileSet.has(selected);
              const effectiveRent = property.owner !== null && !property.mortgaged && tile.rents
                ? (hasMonopoly && property.buildings === 0 ? tile.rents[0] * 2 : tile.rents[property.buildings])
                : null;
              return (
                <>
                  {effectiveRent !== null && (
                    <div className="flex items-center justify-between rounded bg-amber-900/30 border border-amber-700/40 px-2 py-1.5">
                      <span className="text-xs text-amber-400/70">Thuê hiện tại</span>
                      <span className="font-bold text-amber-300 tabular-nums">${effectiveRent}</span>
                    </div>
                  )}
                  <div className="rounded-lg overflow-hidden border border-amber-900/40 text-sm">
                    {tile.rents.map((rent, i) => {
                      const isActive = property.buildings === i;
                      const showDouble = hasMonopoly && i === 0;
                      return (
                        <div key={i} className={`flex justify-between items-center px-2 py-1 ${i > 0 ? "border-t border-amber-900/25" : ""} ${isActive ? "bg-amber-900/40" : i % 2 === 0 ? "bg-stone-900/30" : ""}`}>
                          <span className="text-amber-200/70 text-xs">
                            {i === 0 ? "Đất trống" : i === 5 ? "🏨 Khách sạn" : `${"🏠".repeat(i)}`}
                          </span>
                          <span className={`font-mono font-bold tabular-nums ${isActive ? "text-amber-300" : "text-amber-100"}`}>
                            ${showDouble ? rent * 2 : rent}{showDouble ? <span className="text-[9px] text-amber-400/60 ml-0.5">×2</span> : null}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
            {tile.kind === "Railroad" && (() => {
              const ownerRR = property.owner;
              const rrCount = ownerRR !== null ? map.tiles.filter(t => t.kind === "Railroad" && state.properties[t.index].owner === ownerRR).length : 0;
              const rrRents = [25, 50, 100, 200];
              const effectiveRR = ownerRR !== null && !property.mortgaged ? rrRents[rrCount - 1] : null;
              return (
                <div className="rounded bg-stone-900/40 px-2 py-2 text-xs text-amber-200/60 space-y-1">
                  <div className="grid grid-cols-4 gap-1 text-center">
                    {rrRents.map((r, n) => (
                      <div key={n} className={`rounded py-0.5 ${rrCount === n+1 && ownerRR !== null ? "bg-amber-800/50 text-amber-300 font-bold" : ""}`}>
                        <div className="opacity-50">{n+1}ga</div>
                        <div>${r}</div>
                      </div>
                    ))}
                  </div>
                  {effectiveRR !== null && <div className="text-center text-amber-300/80 font-semibold">Thuê hiện tại: ${effectiveRR}</div>}
                </div>
              );
            })()}
            {tile.kind === "Utility" && (() => {
              const ownerUtil = property.owner;
              const utilCount = ownerUtil !== null ? map.tiles.filter(t => t.kind === "Utility" && state.properties[t.index].owner === ownerUtil).length : 0;
              return (
                <div className="rounded bg-stone-900/40 px-2 py-2 text-xs text-amber-200/60 space-y-1">
                  <div className="grid grid-cols-2 gap-1 text-center">
                    {[["1 công ty", "4×"], ["2 công ty", "10×"]].map(([label, mult], n) => (
                      <div key={n} className={`rounded py-1 ${utilCount === n+1 && ownerUtil !== null ? "bg-amber-800/50 text-amber-300 font-bold" : ""}`}>
                        <div className="opacity-50">{label}</div>
                        <div>{mult} xúc xắc</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
            {/* Occupants on this tile */}
            {(() => {
              const here = state.players.map((pl, pi) => !pl.bankrupt && pl.position === selected ? { pl, pi } : null).filter(Boolean) as { pl: typeof state.players[0]; pi: number }[];
              return here.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {here.map(({ pl, pi }) => (
                    <span key={pi} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] border ${pi === seat ? "bg-amber-900/50 border-amber-700/50 text-amber-200" : "bg-stone-800/60 border-stone-700/40 text-stone-300"}`}>
                      {TOKENS[pi]} {pl.name}{pl.inJail && selected === 10 ? " ⛓" : ""}
                    </span>
                  ))}
                </div>
              ) : null;
            })()}
            {/* Ownership */}
            <div className="space-y-2">
              {property.owner === null ? (
                <span className="text-xs text-amber-200/40 italic">Chưa có chủ</span>
              ) : (
                <>
                  <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm border ${property.owner === seat ? "bg-amber-900/50 border-amber-700/60" : "bg-stone-900/60 border-stone-700/50"}`}>
                    <span>{TOKENS[property.owner]}</span>
                    <span className="font-medium">{state.players[property.owner]?.name}</span>
                    {property.mortgaged && <span className="text-[10px] text-red-400/80 ml-0.5">🔒TC</span>}
                    {property.buildings === 5 && <span className="ml-0.5">🏨</span>}
                    {property.buildings > 0 && property.buildings < 5 && <span className="text-xs ml-0.5">{"🏠".repeat(property.buildings)}</span>}
                  </div>
                  {/* Group ownership progress */}
                  {tile.group && groupTiles[tile.group] && (() => {
                    const groupAll = groupTiles[tile.group];
                    const owned = groupAll.filter(idx => state.properties[idx].owner === property.owner);
                    return (
                      <div className="flex items-center gap-1.5 text-[10px] text-amber-200/50">
                        <span>{tile.group}:</span>
                        <div className="flex gap-0.5">
                          {groupAll.map(idx => (
                            <span key={idx} className={`w-2.5 h-2.5 rounded-sm inline-block ${GROUP_COLORS[tile.group] ?? "bg-stone-600"} ${state.properties[idx].owner === property.owner ? "opacity-100" : "opacity-20"}`} />
                          ))}
                        </div>
                        <span>{owned.length}/{groupAll.length}{owned.length === groupAll.length ? " 👑" : ""}</span>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
            {/* Color group sibling tiles */}
            {tile.group && groupTiles[tile.group] && groupTiles[tile.group].length > 1 && (
              <div className="space-y-1">
                <div className="text-[10px] text-amber-400/50 uppercase tracking-wider">Nhóm {tile.group}</div>
                {groupTiles[tile.group].map(idx => {
                  const sibProp = state.properties[idx];
                  const sibTile = map.tiles[idx];
                  return (
                    <button key={idx} type="button" onClick={() => setSelected(idx)}
                      className={`w-full flex items-center gap-2 rounded px-2 py-1 text-[10px] text-left transition-colors ${idx === selected ? "bg-amber-900/40" : "bg-stone-900/30 hover:bg-stone-900/60"}`}>
                      <span className={`w-2 h-2 rounded-sm shrink-0 ${GROUP_COLORS[tile.group] ?? "bg-stone-600"}`} />
                      <span className="flex-1 truncate text-amber-200/70">{sibTile.name}</span>
                      {sibProp.owner !== null && <span>{TOKENS[sibProp.owner]}</span>}
                      {sibProp.mortgaged && <span className="text-red-400/70">🔒</span>}
                      {sibProp.buildings > 0 && <span className={sibProp.buildings === 5 ? "text-red-400" : "text-emerald-400"}>{"●".repeat(sibProp.buildings === 5 ? 1 : sibProp.buildings)}{sibProp.buildings === 5 ? "H" : ""}</span>}
                      {sibProp.owner === null && <span className="text-stone-500 italic">Chưa mua</span>}
                    </button>
                  );
                })}
              </div>
            )}
            {property.owner === seat && canManage && (() => {
              const inDebt = ["Debt","Inheritance"].includes(state.phase);
              const mortgageVal = Math.floor(tile.price / 2);
              const unmortgageCost = Math.ceil(mortgageVal * 1.1);
              const sellVal = tile.houseCost ? Math.floor(tile.houseCost / 2) : 0;
              return (
                <div className="grid grid-cols-2 gap-1.5">
                  {tile.houseCost > 0 && !property.mortgaged && (
                    <button className={`${buttonClass} text-xs py-1.5 col-span-1`} disabled={inDebt}
                      onClick={() => send({type:"BUILD", tile: selected})}>
                      🏠 Xây · ${tile.houseCost}
                    </button>
                  )}
                  {property.buildings > 0 && (
                    <button className={`${buttonClass} text-xs py-1.5`}
                      onClick={() => send({type:"SELL", tile: selected})}>
                      🔨 Bán nhà · +${sellVal}
                    </button>
                  )}
                  {property.buildings > 0 && (
                    <button className={`${buttonClass} text-xs py-1.5`}
                      onClick={() => send({type:"SELL_GROUP", tile: selected})}>
                      🔨 Bán nhóm
                    </button>
                  )}
                  {!property.mortgaged && property.buildings === 0 && (
                    <button className={`${buttonClass} text-xs py-1.5`}
                      onClick={() => send({type:"MORTGAGE", tile: selected})}>
                      🔒 TC · +${mortgageVal}
                    </button>
                  )}
                  {property.mortgaged && (
                    <button className={`${buttonClass} text-xs py-1.5`} disabled={inDebt}
                      onClick={() => send({type:"UNMORTGAGE", tile: selected})}>
                      🔓 Giải · -${unmortgageCost}
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
        {canManage && state.phase !== "Inheritance" && player && <TradeForm key={`${room.id}-${seat}`} map={map} state={state} seat={seat} send={send} />}
        {!replayRoom && <>{room.status === "Finished" && <RematchButton onRematch={onRematch} loading={rematching} />}
        <LeaveRoomButton onLeave={onLeave} /></>}
      </aside>
    </div>
    {state.started && (() => {
      const activePlayers = state.players.filter(p => !p.bankrupt);
      const totalCash = activePlayers.reduce((s, p) => s + p.cash, 0);
      const allNW = state.players.map((_, i) => playerNetWorth[i]).filter((_, i) => !state.players[i].bankrupt);
      const avgNW = allNW.length ? Math.round(allNW.reduce((s, n) => s + n, 0) / allNW.length) : 0;
      const richest = state.players.map((_, i) => ({ idx: i, nw: playerNetWorth[i] })).filter(x => !state.players[x.idx].bankrupt).sort((a, b) => b.nw - a.nw)[0];
      const propertiesSold = state.properties.filter(p => p.owner !== null).length;
      const totalProperties = map.tiles.filter(t => t.price > 0).length;
      return (
        <div className="flex flex-wrap gap-2 rounded-xl border border-stone-800/60 bg-stone-950/40 px-4 py-2.5 text-[10px] text-stone-400">
          <div className="flex items-center gap-1.5"><span className="text-stone-500">Tiền mặt tổng:</span><span className="font-mono font-bold text-amber-200/80">${totalCash.toLocaleString("vi-VN")}</span></div>
          <span className="text-stone-700">·</span>
          <div className="flex items-center gap-1.5"><span className="text-stone-500">TB tài sản:</span><span className="font-mono font-bold text-amber-200/80">${avgNW.toLocaleString("vi-VN")}</span></div>
          <span className="text-stone-700">·</span>
          <div className="flex items-center gap-1.5"><span className="text-stone-500">Giàu nhất:</span><span className="font-bold text-amber-300/80">{richest ? `${TOKENS[richest.idx]} ${state.players[richest.idx]?.name}` : "—"}</span></div>
          <span className="text-stone-700">·</span>
          <div className="flex items-center gap-1.5"><span className="text-stone-500">Đất đã bán:</span><span className="font-mono font-bold text-amber-200/80">{propertiesSold}/{totalProperties}</span></div>
          <span className="text-stone-700">·</span>
          <div className="flex items-center gap-1.5"><span className="text-stone-500">Còn:</span><span className="font-bold text-amber-200/80">{activePlayers.length} người</span></div>
          <span className="text-stone-700">·</span>
          <div className="flex items-center gap-1.5"><span className="text-stone-500">🏠</span><span className="font-mono font-bold text-emerald-400/80">{state.houses}</span><span className="text-stone-600 mx-0.5">/</span><span className="text-stone-500">🏨</span><span className="font-mono font-bold text-red-400/80">{state.hotels}</span><span className="text-stone-600 ml-0.5 text-[9px]">còn</span></div>
        </div>
      );
    })()}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {(() => {
        const rankOrder = [...state.players.map((_, idx) => ({ idx, nw: playerNetWorth[idx] }))].sort((a,b) => b.nw - a.nw);
        const rankMap = Object.fromEntries(rankOrder.map((x,r) => [x.idx, r+1]));
        return state.players.map((p, i) => {
        const owned = map.tiles.filter(t => state.properties[t.index].owner === i);
        const nw = playerNetWorth[i];
        const nwPct = Math.min(100, Math.round((nw / maxNetWorth) * 100));
        const isMe = i === seat;
        const isActor = i === currentActor;
        const rank = rankMap[i];
        return (
          <div key={i} className={`relative rounded-xl border overflow-hidden ${
            p.bankrupt ? "border-stone-800 opacity-40" :
            isActor ? "border-amber-400 bg-amber-950/60 monopoly-player-active" :
            isMe ? "border-amber-700/70 bg-amber-950/30" : "border-amber-900/50 bg-stone-950/40"
          } ${newBankrupts.has(i) ? "monopoly-bankrupt-enter" : ""}`}>
            {/* Net-worth progress bar: cash (gold) + equity (amber) */}
            {!p.bankrupt && (() => {
              const cashPct = Math.min(100, Math.round((p.cash / maxNetWorth) * 100));
              const eqPct = Math.min(100 - cashPct, Math.round(((nw - p.cash) / maxNetWorth) * 100));
              return (
                <div className="h-1.5 w-full bg-stone-800 flex overflow-hidden">
                  <div className="h-full bg-yellow-400/80 transition-all duration-700 ease-out" style={{ width: `${cashPct}%` }} title={`Tiền mặt: $${p.cash.toLocaleString("vi-VN")}`} />
                  <div className="h-full bg-amber-600/70 transition-all duration-700 ease-out" style={{ width: `${eqPct}%` }} title={`Tài sản: $${(nw - p.cash).toLocaleString("vi-VN")}`} />
                </div>
              );
            })()}
            <div className="p-3 space-y-2">
              {/* Cash delta floaters */}
              {cashDeltas.filter(d => d.player === i).map(delta => (
                <span key={delta.id} className={`monopoly-cash-delta ${delta.amount > 0 ? "monopoly-cash-delta-gain" : "monopoly-cash-delta-loss"}`}>
                  {delta.amount > 0 ? `+${delta.amount.toLocaleString("vi-VN")}` : delta.amount.toLocaleString("vi-VN")}
                </span>
              ))}
              {/* Header row */}
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-xl shrink-0 ${isActor ? "monopoly-token-bounce" : ""}`}>{TOKENS[i]}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm leading-tight truncate">
                    {p.name}{isMe && <span className="text-amber-500/70 text-[10px] font-normal ml-1">(Bạn)</span>}
                  </div>
                  <button type="button" className="text-[10px] text-amber-200/50 truncate hover:text-amber-300/70 text-left"
                    onClick={() => setSelected(p.position)}>{map.tiles[p.position]?.name ?? "—"}</button>
                </div>
                <div className="flex gap-1 shrink-0 items-center">
                  {p.jailCards.length > 0 && <span title="Thẻ ra tù" className="text-xs bg-stone-800 border border-stone-600 rounded px-1">🎫{p.jailCards.length > 1 ? p.jailCards.length : ""}</span>}
                  {isActor && !p.bankrupt && <span className="text-[9px] bg-amber-900/70 text-amber-300 rounded px-1 py-0.5 font-bold">▶</span>}
                {!p.bankrupt && <span className={`text-[9px] rounded px-1 py-0.5 font-bold shrink-0 ${rank === 1 ? "bg-amber-700/60 text-amber-200" : "bg-stone-800/60 text-stone-400"}`}>#{rank}</span>}
                </div>
              </div>
              {/* Jail status */}
              {p.inJail && (
                <div className="flex items-center gap-1.5 rounded bg-red-950/50 border border-red-800/40 px-2 py-1">
                  <span className="text-xs">⛓</span>
                  <span className="text-[10px] text-red-300/80">Trong tù</span>
                  <div className="ml-auto flex gap-0.5">
                    {[1,2,3].map(n => (
                      <span key={n} className={`w-2 h-2 rounded-full ${n <= p.jailAttempts ? "bg-red-500" : "bg-stone-700"}`} />
                    ))}
                  </div>
                </div>
              )}
              {/* Cash */}
              {p.bankrupt ? (
                <p className="text-sm text-stone-500 font-bold">💀 Phá sản</p>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] text-amber-200/50">Tiền mặt</span>
                    <span className={`font-bold tabular-nums ${p.cash < 50 ? "text-red-400" : p.cash < 150 ? "text-orange-300" : "text-amber-100"}`}>${p.cash.toLocaleString("vi-VN")}</span>
                  </div>
                  {nw > p.cash && (
                    <div className="text-[10px] text-amber-200/40 text-right">≈ ${nw.toLocaleString("vi-VN")} tài sản</div>
                  )}
                  {p.cash < 100 && !p.bankrupt && (
                    <div className="text-[9px] text-red-400/70 flex items-center gap-1">
                      <span>⚠️</span><span>Nguy cơ phá sản cao</span>
                    </div>
                  )}
                  {/* Cash sparkline */}
                  {nwHistory.length >= 3 && (() => {
                    const vals = nwHistory.map(snap => snap[i] ?? 0);
                    const min = Math.min(...vals);
                    const max = Math.max(...vals) || 1;
                    const W = 60, H = 18;
                    const pts = vals.map((v, idx) => `${Math.round((idx / (vals.length - 1)) * W)},${Math.round(H - ((v - min) / (max - min)) * H)}`).join(" ");
                    const lastUp = vals[vals.length - 1] >= vals[vals.length - 2];
                    return (
                      <svg width={W} height={H} className="mt-0.5" aria-hidden="true">
                        <polyline points={pts} fill="none" stroke={lastUp ? "rgba(134,239,172,0.6)" : "rgba(252,165,165,0.6)"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    );
                  })()}
                </div>
              )}
              {/* Property count + buildings summary */}
              {owned.length > 0 && (() => {
                const houses = owned.filter(t => state.properties[t.index].buildings > 0 && state.properties[t.index].buildings < 5).reduce((s,t) => s + state.properties[t.index].buildings, 0);
                const hotels = owned.filter(t => state.properties[t.index].buildings === 5).length;
                const mortgaged = owned.filter(t => state.properties[t.index].mortgaged).length;
                return (
                  <div className="flex flex-wrap gap-2 text-[10px]">
                    <span className="text-amber-200/50">{owned.length} đất</span>
                    {houses > 0 && <span className="text-emerald-400">🏠×{houses}</span>}
                    {hotels > 0 && <span className="text-red-400">🏨×{hotels}</span>}
                    {mortgaged > 0 && <span className="text-red-400/60">🔒×{mortgaged}</span>}
                  </div>
                );
              })()}
              {/* Property chips by color */}
              {owned.length > 0 && (
                <div className="flex flex-wrap gap-0.5">
                  {owned.map(t => (
                    <button key={t.index}
                      className={`w-3.5 h-3.5 rounded-sm border border-black/30 transition-transform hover:scale-150 hover:z-10 relative ${GROUP_COLORS[t.group] ?? "bg-stone-600"} ${state.properties[t.index].mortgaged ? "opacity-30" : ""} ${monopolyTileSet.has(t.index) ? "ring-1 ring-amber-300/70" : ""}`}
                      onClick={() => setSelected(t.index)}
                      title={`${t.name}${state.properties[t.index].mortgaged ? " (TC)" : ""}${state.properties[t.index].buildings > 0 ? ` 🏠×${state.properties[t.index].buildings}` : ""}`}
                      aria-label={`Xem ${t.name}`}
                    />
                  ))}
                </div>
              )}
              {/* Monopoly badges */}
              {playerMonopolies[i].length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {playerMonopolies[i].map(g => (
                    <span key={g} title={`Độc quyền ${g}`}
                      className={`inline-flex items-center gap-0.5 text-[9px] rounded-full px-1.5 py-0.5 font-bold border border-black/20 text-stone-900 ${GROUP_COLORS[g] ?? "bg-stone-500"}`}>
                      👑 {g}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      });
      })()}
    </div>
    <details open className="rounded-xl border border-amber-900/60 bg-stone-950/40 p-4">
      <summary className="cursor-pointer font-semibold text-amber-200/80 flex items-center gap-2">
        <span>📋 Nhật ký ván đấu</span>
        <span className="ml-auto text-[10px] text-amber-400/50">{state.log.length} sự kiện</span>
      </summary>
      <ol ref={logRef} className="mt-3 max-h-52 overflow-y-auto space-y-0.5 text-sm text-amber-200/80">
        {state.log.map((line, i) => (
          <li key={i} className={`flex items-start gap-1.5 rounded px-1 py-0.5 ${i >= logNewStart ? "monopoly-log-entry bg-amber-900/20" : "hover:bg-stone-900/30"}`}>
            <span className="shrink-0 text-[9px] mt-1 text-stone-600 tabular-nums w-5 text-right select-none">{i+1}</span>
            <span className="shrink-0 text-[11px] mt-0.5 opacity-70">{logIcon(line)}</span>
            <span className="text-xs leading-relaxed">{line}</span>
          </li>
        ))}
      </ol>
    </details>
    {cardOverlay && (
      <div className={`monopoly-card-overlay monopoly-card-${cardOverlay.kind}`} onClick={() => setCardOverlay(null)} role="dialog" aria-modal="true" aria-label="Rút thẻ">
        <div className="monopoly-card-reveal">
          <div className="monopoly-card-inner text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-amber-400/75">
              {cardOverlay.kind === "chance" ? "🎲 Thẻ may mắn" : cardOverlay.kind === "community" ? "📦 Thẻ cộng đồng" : "🃏 Rút thẻ"}
            </p>
            <p className="text-lg leading-relaxed text-stone-100">{cardOverlay.text}</p>
            <p className="mt-4 text-xs text-stone-500">Nhấn để đóng</p>
          </div>
        </div>
      </div>
    )}
    {paymentOverlay && (
      <div className="fixed inset-x-0 bottom-6 flex justify-center pointer-events-none z-50" aria-live="assertive">
        <div className="animate-game-action-enter rounded-xl border border-red-700/60 bg-red-950/90 backdrop-blur px-5 py-3 text-center shadow-2xl shadow-red-900/40">
          <div className="text-xs text-red-400/70 uppercase tracking-widest mb-1">💸 Thanh toán</div>
          <div className="text-2xl font-black text-red-300 tabular-nums">${paymentOverlay.amount.toLocaleString("vi-VN")}</div>
          <div className="text-xs text-red-200/60 mt-1">
            {TOKENS[paymentOverlay.payer]} {state.players[paymentOverlay.payer]?.name} → {paymentOverlay.payee === null ? "🏦 Ngân hàng" : `${TOKENS[paymentOverlay.payee]} ${state.players[paymentOverlay.payee]?.name}`}
          </div>
        </div>
      </div>
    )}
  </section>;
}
