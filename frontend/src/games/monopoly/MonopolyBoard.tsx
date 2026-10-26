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
  const prevDiceKey = useRef<string>("");
  const prevCard = useRef<string>("");

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

  const [cashDeltas, setCashDeltas] = useState<{ id: number; player: number; amount: number }[]>([]);
  const [flashTiles, setFlashTiles] = useState<Set<number>>(new Set());
  const prevCashRef = useRef<Record<number, number>>({});
  const prevOwnerRef = useRef<Record<number, number>>({});
  const deltaIdRef = useRef(0);
  const logRef = useRef<HTMLOListElement>(null);
  const prevLogLenRef = useRef<number>(0);
  const [logNewStart, setLogNewStart] = useState<number>(Number.MAX_SAFE_INTEGER);

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

  return <section className="space-y-4 text-amber-100">
    {!replayRoom && <><ConnectionBanner connectionState={connectionState} />
    <RoomErrorBanner error={error} />
    <DisconnectBadge seats={room.seats} />
    <RoomStatusBanner room={room} mySide={mySide} /></>}
    <header className="flex flex-wrap items-center justify-between gap-2">
      <div><h1 className="text-2xl font-bold">🏦 CỜ TỈ PHÚ</h1><p className="text-xs text-amber-300/70">{map.edition} · 40 ô · Ngân hàng: {state.houses} nhà, {state.hotels} khách sạn</p></div>
      <p>{replayRoom ? "Bản ghi chỉ đọc" : seat < 0 ? "Bạn đang xem ván đấu" : `${TOKENS[seat]} Bạn: ${player?.name ?? "Đang chờ"}`}</p>
    </header>
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="overflow-x-auto rounded-xl border border-emerald-800 bg-emerald-950/50 p-2">
        <div className="grid min-w-[660px] grid-cols-11 grid-rows-11 gap-0.5 aspect-square" aria-label="Bàn cờ 40 ô">
          {map.tiles.map(t => {
            const p = state.properties[t.index];
            const occupants = state.players.map((who,i) => !who.bankrupt && who.position === t.index ? i : -1).filter(i => i >= 0);
            return <button type="button" key={t.index} data-monopoly-tile="1" data-group={t.group} style={boardPosition(t.index)} onClick={() => setSelected(t.index)}
              aria-pressed={selected === t.index} aria-label={`Ô ${t.index}: ${t.name}${p.owner !== null ? `, chủ ${state.players[p.owner]?.name}` : ""}`}
              className={`relative flex min-h-0 flex-col overflow-hidden border text-[9px] leading-tight text-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white transition-[box-shadow,transform] duration-150 ${selected === t.index ? "border-amber-200 bg-amber-900" : "border-emerald-800/70 bg-stone-900/80"} ${flashTiles.has(t.index) ? "monopoly-tile-just-purchased" : ""}`}>
              <span aria-hidden="true" className={`h-2 w-full shrink-0 ${GROUP_COLORS[t.group] ?? "bg-stone-700"}`} />
              <span className="p-0.5">{t.name}</span>
              {t.price > 0 && <span>{t.price}</span>}
              {p.owner !== null && <span title={state.players[p.owner]?.name}>{TOKENS[p.owner]}{p.mortgaged ? " 🔒" : p.buildings === 5 ? " 🏨" : p.buildings > 0 ? ` 🏠${p.buildings}` : ""}</span>}
              <span className="mt-auto text-xs" aria-hidden="true">{occupants.map(i => <span key={i} className="monopoly-token-land">{TOKENS[i]}</span>)}</span>
            </button>;
          })}
          <div className="col-start-2 col-end-11 row-start-2 row-end-11 flex flex-col items-center justify-center gap-5 overflow-auto p-5 text-center">
            <div className="text-5xl" aria-hidden="true">🏦</div>
            <h2 className="text-3xl font-black tracking-widest">CỜ TỈ PHÚ</h2>
            <p className="max-w-sm text-sm text-emerald-100/75">Mua đất. Xây dựng. Thương lượng.<br />Quản lý tiền mặt để ở lại đến cuối cùng.</p>
            {state.started && <div role="status" aria-live="polite" className="space-y-3">
              {state.winner ? (
                <p className="monopoly-winner-banner text-2xl font-black text-amber-300">🏆 {state.players[Number(state.winner.slice(1))]?.name} chiến thắng!</p>
              ) : (
                <p className="text-lg">{TOKENS[currentActor]} {state.players[currentActor]?.name}: {PHASES[state.phase] ?? state.phase}</p>
              )}
              <div className="flex justify-center gap-3" aria-label={`Xúc xắc ${state.dice.join(" và ")}`} role="img">
                {state.dice.map((n, i) => (
                  <div key={i} className={`monopoly-die${diceRolling ? " monopoly-die-rolling" : ""}`} style={diceRolling ? { animationDelay: `${i * 70}ms` } : {}}>
                    <span className="text-3xl" aria-hidden="true">{n > 0 ? ["⚀","⚁","⚂","⚃","⚄","⚅"][n-1] : "◇"}</span>
                  </div>
                ))}
              </div>
              {state.utilityDice && <p className="text-sm text-amber-200">Xúc xắc tính thuê dịch vụ: {state.utilityDice.join(" + ")} = {state.utilityDice.reduce((sum,n)=>sum+n,0)}</p>}
              {state.lastCard && !cardOverlay && <p className="max-w-sm rounded border border-amber-700 bg-stone-950/70 p-3 text-sm">{state.lastCard}</p>}
              {state.extraRoll && <p className="text-sm text-amber-300">Đổ đôi — được đi thêm sau khi xử lý ô này.</p>}
            </div>}
          </div>
        </div>
      </div>
      <aside className="space-y-4">
        {state.started && room.status === "Playing" && <div className="space-y-3 rounded-xl border border-amber-800 p-4">
          <h2 className="font-semibold">{PHASES[state.phase]}</h2>
          {!deciding && <p className="text-sm text-amber-200/70">Chờ {state.players[currentActor]?.name} quyết định.</p>}
          <div className="flex flex-wrap gap-2">
            {state.phase === "Roll" && <>{action("🎲 Đổ xúc xắc", "ROLL", false, deciding ? "monopoly-roll-btn-ready" : "")}{player?.inJail && <>{action("Nộp 50 ra tù", "PAY_JAIL", player.cash < 50)}{action("Dùng thẻ ra tù", "JAIL_CARD", player.jailCards.length === 0)}</>}</>}
            {state.phase === "Buy" && <>{action(`Mua với giá ${map.tiles[state.players[state.turn].position].price}`, "BUY")}{action("Đưa ra đấu giá", "DECLINE")}</>}
            {state.phase === "End" && action(state.extraRoll ? "Tiếp tục lượt đổ đôi" : "Kết thúc lượt", "END")}
            {state.phase === "Debt" && <><p className="w-full text-sm">Nợ {state.payments[0]?.amount} cho {state.payments[0]?.to === null ? "ngân hàng" : state.players[state.payments[0]?.to ?? -1]?.name}. Bán nhà hoặc thế chấp để thanh toán.</p>{action("Thanh toán", "SETTLE")}{action("Tuyên bố phá sản", "BANKRUPT")}</>}
            {state.phase === "Inheritance" && inheritedTile && <>
              <p className="w-full text-sm">Thừa kế {inheritedTile.name}: trả {inheritanceInterest} lãi để giữ thế chấp, hoặc {inheritedTile.price / 2 + inheritanceInterest} để giải chấp ngay.</p>
              {action(`Giữ thế chấp · ${inheritanceInterest}`, "KEEP_INHERITED")}
              {action(`Giải chấp ngay · ${inheritedTile.price / 2 + inheritanceInterest}`, "REDEEM_INHERITED", !player || player.cash < inheritedTile.price / 2 + inheritanceInterest)}
            </>}
          </div>
          {state.phase === "BuildingDemand" && state.buildingDemand && <div className="space-y-2 text-sm">
            <p>Ngân hàng còn {state.buildingDemand.kind === "Hotel" ? `${state.hotels} khách sạn` : `${state.houses} nhà`}. Mỗi người xác nhận mua một đơn vị.</p>
            <p>Đủ cung: mua theo giá trên giấy đất. Cầu vượt cung: đấu giá; người không muốn mua không tham gia.</p>
            <p>Nếu bạn chỉ đủ tiền đấu giá mà chưa đủ giá niêm yết, xác nhận nhu cầu sẽ không tự mua khi không có đấu giá.</p>
            {demandTiles.length > 0 && <label className="block">Đất muốn xây <select aria-label="Đất muốn xây" className="w-full rounded bg-stone-900 p-2" value={requestedTile}
              onChange={e => setSelected(Number(e.target.value))}>{demandTiles.map(index => <option key={index} value={index}>{map.tiles[index].name} · {map.tiles[index].houseCost}</option>)}</select></label>}
            <button className={buttonClass} disabled={!deciding} onClick={() => send({type:"REQUEST_BUILD",tile:requestedTile})}>Tôi muốn mua</button> {action("Không mua đợt này", "SKIP_BUILD")}
          </div>}
          {state.auction && <div className="space-y-2">
            <p>{state.auction.kind === "House" ? "Nhà của ngân hàng" : state.auction.kind === "Hotel" ? "Khách sạn của ngân hàng" : map.tiles[state.auction.tile].name} · Giá hiện tại: {state.auction.bid}</p>
            <p className="text-sm">Người dẫn: {state.auction.leader === null ? "Chưa có" : state.players[state.auction.leader].name}</p>
            {buildAuctionTiles.length > 0 && <label className="block text-sm">Đất xây sau đấu giá <select aria-label="Đất xây sau đấu giá" className="w-full rounded bg-stone-900 p-2" value={biddingTile}
              onChange={e => setSelected(Number(e.target.value))}>{buildAuctionTiles.map(index => <option key={index} value={index}>{map.tiles[index].name}</option>)}</select></label>}
            <label className="block text-sm">Giá đấu <input aria-label="Giá đấu" className="w-28 rounded bg-stone-900 p-2" type="number" min={minimumBid} max={player?.cash ?? 0} value={Math.max(bid,minimumBid)} onChange={e => setBid(Number(e.target.value))} /></label>
            <button className={buttonClass} disabled={!deciding} onClick={() => send({type:"BID",amount:Math.max(bid,minimumBid),...(biddingTile !== undefined ? {tile:biddingTile} : {})})}>Trả giá</button> {action("Bỏ đấu giá", "PASS")}
          </div>}
          {state.trade && <div className="space-y-2 text-sm">
            <p>{state.players[state.trade.from].name} đưa: {names(state.trade.offered)} + {state.trade.cashOffered}.</p>
            <p>Đổi lấy: {names(state.trade.requested)} + {state.trade.cashRequested}.</p>
            {(state.trade.offeredCards?.length > 0 || state.trade.requestedCards?.length > 0) && <p>Thẻ ra tù: đưa {state.trade.offeredCards.length}, nhận {state.trade.requestedCards.length}.</p>}
            {action("Chấp nhận", "ACCEPT")} {action("Từ chối", "REJECT")}
            {state.trade.offered.some(i => state.properties[i].mortgaged) && <><p>Nhận đất thế chấp: chấp nhận thường sẽ giữ thế chấp và trả 10% lãi.</p><button className={buttonClass} disabled={!deciding}
              onClick={() => send({type:"ACCEPT",redeemReceived:true})}>Chấp nhận và giải chấp ngay</button></>}
          </div>}
        </div>}
        <div className="rounded-xl border border-amber-900 p-4">
          <h2 className="font-bold">{tile.name}</h2>
          <p className="text-sm text-amber-200/70">Ô {selected} · {tile.group || tile.kind}</p>
          {tile.price > 0 && <p className="mt-2 text-sm">Giá {tile.price}{["Street","Railroad","Utility"].includes(tile.kind) && ` · Thế chấp ${tile.price/2}`}</p>}
          {tile.rents && <table className="my-2 w-full text-sm"><caption className="text-left">Tiền thuê · Xây mỗi cấp {tile.houseCost}</caption><tbody>{tile.rents.map((rent,i) => <tr key={i}><td>{i === 0 ? "Đất trống" : i === 5 ? "Khách sạn" : `${i} nhà`}</td><td className="text-right">{rent}</td></tr>)}</tbody></table>}
          {tile.kind === "Railroad" && <p className="text-sm">1/2/3/4 ga: thuê 25/50/100/200.</p>}
          {tile.kind === "Utility" && <p className="text-sm">1/2 công ty: thuê 4/10 lần tổng xúc xắc.</p>}
          <p className="my-2 text-sm">{property.owner === null ? "Chưa có chủ" : `Chủ: ${state.players[property.owner]?.name}${property.mortgaged ? " · Đang thế chấp" : ""}`}</p>
          {property.owner === seat && canManage && <div className="flex flex-wrap gap-2">{["BUILD","SELL","SELL_GROUP","MORTGAGE","UNMORTGAGE"].map((type,i) => <button key={type} className={buttonClass}
            disabled={["Debt","Inheritance"].includes(state.phase) && ["BUILD","UNMORTGAGE"].includes(type)} onClick={() => send({type,tile:selected})}>{["Xây nhà","Bán nhà","Bán nhà cả nhóm","Thế chấp","Giải chấp"][i]}</button>)}</div>}
        </div>
        {canManage && state.phase !== "Inheritance" && player && <TradeForm key={`${room.id}-${seat}`} map={map} state={state} seat={seat} send={send} />}
        {!replayRoom && <>{room.status === "Finished" && <RematchButton onRematch={onRematch} loading={rematching} />}
        <LeaveRoomButton onLeave={onLeave} /></>}
      </aside>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{state.players.map((p,i) => <div key={i}
      className={`relative rounded-lg border p-3 ${p.bankrupt ? "border-stone-800 opacity-50" : i === currentActor ? "border-amber-400 bg-amber-950/50 monopoly-player-active" : "border-amber-900"}`}>
      {cashDeltas.filter(d => d.player === i).map(delta => (
        <span key={delta.id} className={`monopoly-cash-delta ${delta.amount > 0 ? "monopoly-cash-delta-gain" : "monopoly-cash-delta-loss"}`}>
          {delta.amount > 0 ? `+${delta.amount.toLocaleString("vi-VN")}` : delta.amount.toLocaleString("vi-VN")}
        </span>
      ))}
      <h2 className="font-bold"><span className={i === currentActor ? "monopoly-token-bounce" : ""}>{TOKENS[i]}</span> {p.name}{i === seat ? " (Bạn)" : ""}</h2>
      <p>{p.bankrupt ? "Đã phá sản" : `${p.cash.toLocaleString("vi-VN")} · ${map.tiles[p.position].name}`}</p>
      {p.inJail && <p className="text-sm">Trong tù · Đã thử {p.jailAttempts}/3</p>}
      {p.jailCards.length > 0 && <p className="text-sm">Thẻ ra tù: {p.jailCards.length}</p>}
      <div className="mt-2 flex flex-wrap gap-1">{map.tiles.filter(t => state.properties[t.index].owner === i).map(t => <button className={`rounded border border-stone-600 px-1 text-xs ${GROUP_COLORS[t.group] ?? "bg-stone-700"}`} key={t.index} onClick={() => setSelected(t.index)} title={t.name} aria-label={`Xem ${t.name}`}>{t.index}{state.properties[t.index].mortgaged ? "🔒" : ""}</button>)}</div>
    </div>)}</div>
    <details open className="rounded-xl border border-amber-900 p-4"><summary className="cursor-pointer font-semibold">Nhật ký ván đấu</summary>
      <ol ref={logRef} className="mt-3 max-h-52 overflow-y-auto space-y-1 text-sm text-amber-200/80">{state.log.map((line,i) => <li key={i} className={i >= logNewStart ? "monopoly-log-entry" : ""}>{line}</li>)}</ol>
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
  </section>;
}
