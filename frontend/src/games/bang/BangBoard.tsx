import { useEffect, useState } from "react";
import { useGameStore } from "../../platform/gameStore";
import { ConnectionBanner, DisconnectBadge, LeaveRoomButton, RoomErrorBanner } from "../../platform/RoomShell";
import PlayerSeat from "./components/PlayerSeat";
import LocalPlayerPanel from "./components/LocalPlayerPanel";
import HandFan from "./components/HandFan";
import ActionBar from "./components/ActionBar";
import GameLogPanel from "./components/GameLogPanel";
import VictoryScreen from "./components/VictoryScreen";
import CardView from "./components/CardView";
import BangDebugPanel from "./components/BangDebugPanel";
import { useMuzzleFlash } from "./useMuzzleFlash";
import {
  awaitingMyResponse, isMyTurn, myPlayer,
  type BangMove, type BangPublicPlayer, type BangViewerState, type Card, type CardKind,
} from "./types";

interface Props {
  makeMove: (roomId: string, move: unknown) => void;
  onLeave: () => void;
  onRematch: () => void;
  rematching: boolean;
}

/** Bài nào cần chọn mục tiêu khi đánh (Calamity dùng Trượt! như Bang! nên cũng cần). */
function needsTarget(kind: CardKind, isCalamity: boolean): boolean {
  if (kind === "bang" || kind === "duel" || kind === "panic" || kind === "catBalou") return true;
  return kind === "missed" && isCalamity;
}

function playableInActionPhase(kind: CardKind, isCalamity: boolean): boolean {
  return kind === "missed" ? isCalamity : true;
}

function allowedResponseKinds(pendingKind: string, isCalamity: boolean): CardKind[] {
  switch (pendingKind) {
    case "bang":
    case "gatling":
      return isCalamity ? ["missed", "bang"] : ["missed"];
    case "indians":
      return ["bang"];
    case "duel":
      return isCalamity ? ["bang", "missed"] : ["bang"];
    default:
      return [];
  }
}

/** Chỉ là GỢI Ý hiển thị (tô sáng mục tiêu) — server luôn validate lại, xem BangRules. */
function isValidTarget(kind: CardKind, p: BangPublicPlayer, isMe: boolean): boolean {
  if (isMe || !p.alive) return false;
  if (kind === "bang" || kind === "missed") return p.inRange === true;
  if (kind === "panic") return p.distance !== null && p.distance <= 1;
  if (kind === "duel" || kind === "catBalou") return true;
  return false;
}

export default function BangBoard({ makeMove, onLeave, onRematch, rematching }: Props) {
  const { room, error, connectionState } = useGameStore();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [discardIds, setDiscardIds] = useState<string[]>([]);
  const [discarding, setDiscarding] = useState(false);
  // Hook phải gọi KHÔNG điều kiện (Rules of Hooks, xem bug ESLint 2026-09-11 ở VayBatBoard.tsx)
  // — tính state dạng optional TRƯỚC nhánh return sớm bên dưới thay vì gọi hook sau đó. Khai báo
  // lại `state` KHÔNG optional NGAY SAU nhánh return (thay vì dùng thẳng biến optional này) vì
  // TypeScript không lan truyền narrowing của "state" optional vào các closure khai báo bên dưới
  // (vd handleCardClick dùng state.pendingResponse).
  const stateOrUndefined = room?.state as BangViewerState | undefined;
  const muzzleFlash = useMuzzleFlash(stateOrUndefined?.gameLog ?? []);

  // Lựa chọn chỉ có hiệu lực trong đúng lượt/giai đoạn hiện tại, kể cả khi server
  // tự chuyển lượt vì mất kết nối hoặc người chơi chuyển sang phòng chơi lại.
  useEffect(() => {
    setSelectedCardId(null);
    setDiscardIds([]);
    setDiscarding(false);
  }, [room?.id, stateOrUndefined?.turnNumber, stateOrUndefined?.phase, stateOrUndefined?.currentPlayerId]);

  if (!room || !stateOrUndefined) return null;
  const state = room.state as BangViewerState;

  if (state.phase === "waitingForPlayers" || room.status === "Waiting") {
    const joined = room.seats.filter((s) => s.displayName !== null).length;
    return (
      <div className="flex flex-col gap-3 w-full max-w-md mx-auto">
        <ConnectionBanner connectionState={connectionState} />
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-stone-900/80 p-1 shadow-2xl">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
          <div className="rounded-xl border border-amber-500/30 bg-gradient-to-b from-[#2b2013] to-[#1a1208] p-6 text-center">
            <div className="text-4xl mb-2">🤠</div>
            <h2 className="font-western text-2xl text-amber-300 tracking-wide mb-1 [text-shadow:0_1px_0_rgba(255,255,255,0.15),0_2px_6px_rgba(0,0,0,0.9)]">BANG!</h2>
            <p className="text-amber-500/60 text-xs uppercase tracking-widest mb-4">Phòng chờ · {room.id.slice(0, 8)}</p>

            <div className="flex items-center justify-center gap-2 mb-4">
              {Array.from({ length: room.seatCount }, (_, i) => (
                <div
                  key={i}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    i < joined
                      ? "border-t border-amber-300/60 bg-gradient-to-b from-amber-600 to-amber-800 text-amber-100 shadow-[0_2px_0_0_#451a03,0_0_8px_rgba(245,158,11,0.3)]"
                      : "border border-dashed border-amber-900/60 bg-amber-950/20 text-amber-900/40 shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)]"
                  }`}
                >
                  {i < joined ? "★" : "○"}
                </div>
              ))}
            </div>

            <p className="text-amber-200/80 text-sm mb-3">
              <span className="font-bold text-amber-300">{joined}</span>
              <span className="text-amber-400/50">/{room.seatCount}</span>
              {" "}người chơi
            </p>

            <ul className="text-sm space-y-1.5 text-left mb-2">
              {room.seats.map((seat, i) => (
                <li key={i} className={`relative overflow-hidden flex items-center gap-2 rounded-lg px-2.5 py-1.5 ${
                  seat.displayName
                    ? "bg-amber-900/30 text-amber-200 border border-amber-800/30"
                    : "text-amber-900/40 border border-amber-950/60 bg-[#140e0b]/50 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]"
                }`}>
                  {seat.displayName && <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/20 to-transparent" />}
                  <span>{seat.displayName ? "🤠" : "…"}</span>
                  <span>{seat.displayName ?? "(trống)"}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <DisconnectBadge seats={room.seats} />
        <RoomErrorBanner error={error} />
        <LeaveRoomButton onLeave={onLeave} label="← Rời phòng" />
      </div>
    );
  }

  const me = myPlayer(state);
  const you = state.you;
  const myTurn = isMyTurn(state);
  const awaitingResp = awaitingMyResponse(state);
  const isCalamity = me?.character === "Calamity";
  const isSpectator = me === null;

  const selectedCard = you?.hand.find((c) => c.id === selectedCardId) ?? null;
  const selectingTarget = !!selectedCard && myTurn && needsTarget(selectedCard.kind, isCalamity);
  const discardOverflow = me && you ? Math.max(0, you.hand.length - me.hp) : 0;

  const send = (move: BangMove) => makeMove(room.id, move);

  function canPlayCard(card: Card): boolean {
    if (!me?.alive || connectionState !== "connected") return false;
    if (discarding) return true;
    if (awaitingResp && state.pendingResponse)
      return allowedResponseKinds(state.pendingResponse.kind, isCalamity).includes(card.kind);
    if (!myTurn || !playableInActionPhase(card.kind, isCalamity)) return false;
    if (you?.canFire === false && (card.kind === "bang" || card.kind === "gatling" || (card.kind === "missed" && isCalamity))) return false;
    if (card.kind === "beer" && me.hp >= me.maxHp) return false;
    if (needsTarget(card.kind, isCalamity))
      return state.players.some((p) => isValidTarget(card.kind, p, p.id === me.id));
    return true;
  }

  function handleCardClick(card: Card) {
    if (!canPlayCard(card)) return;
    if (discarding) {
      setDiscardIds((ids) => {
        if (ids.includes(card.id)) return ids.filter((id) => id !== card.id);
        if (ids.length >= discardOverflow) return ids;
        return [...ids, card.id];
      });
      return;
    }
    if (myTurn) {
      if (!playableInActionPhase(card.kind, isCalamity)) return;
      if (needsTarget(card.kind, isCalamity)) {
        setSelectedCardId((id) => (id === card.id ? null : card.id));
      } else {
        send({ type: "PLAY_CARD", cardId: card.id });
        setSelectedCardId(null);
      }
      return;
    }
    if (awaitingResp) {
      const allowed = allowedResponseKinds(state.pendingResponse!.kind, isCalamity);
      if (!allowed.includes(card.kind)) return;
      send({ type: "RESPOND", cardId: card.id });
    }
  }

  function handleEndTurnClick() {
    if (discardOverflow > 0) {
      setDiscardIds([]);
      setDiscarding(true);
      return;
    }
    send({ type: "END_TURN" });
  }

  function handleConfirmDiscard() {
    if (!myTurn || discardIds.length !== discardOverflow || !discardIds.every((id) => you?.hand.some((c) => c.id === id))) return;
    send({ type: "END_TURN", discardCardIds: discardIds });
    setDiscarding(false);
    setDiscardIds([]);
  }

  function handleCancelDiscard() {
    setDiscarding(false);
    setDiscardIds([]);
  }

  function handleSeatClick(target: BangPublicPlayer) {
    if (!selectedCard || !myTurn || !isValidTarget(selectedCard.kind, target, target.id === me?.id)) return;
    send({ type: "PLAY_CARD", cardId: selectedCard.id, targetPlayerId: target.id });
    setSelectedCardId(null);
  }

  const opponents = state.players.filter((p) => p.id !== me?.id);

  return (
    <div className="relative flex flex-col gap-3 w-full max-w-2xl mx-auto">
      {muzzleFlash && (
        <div
          aria-hidden="true"
          data-testid="muzzle-flash"
          className="animate-muzzle-flash pointer-events-none absolute inset-0 z-40 flex items-center justify-center text-6xl"
        >
          💥
        </div>
      )}

      {state.phase === "finished" && (
        <VictoryScreen
          state={state}
          onLeave={onLeave}
          onRematch={me ? onRematch : undefined}
          rematching={rematching}
        />
      )}

      {/* Top bar */}
      <div className="bg-gradient-to-r from-[#1a1008] via-[#241a10] to-[#1a1008] rounded-2xl px-4 py-3 shadow-lg border border-amber-900/30 flex items-center justify-between">
        <div>
          <div className="font-western text-amber-300 text-base tracking-wide [text-shadow:0_1px_0_rgba(255,255,255,0.15),0_2px_4px_rgba(0,0,0,0.9)]">🤠 BANG!</div>
          <div className="text-[10px] text-amber-400/50 font-mono">#{room.id.slice(0, 8)}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-amber-400/60 uppercase tracking-widest">Lượt {state.turnNumber}</div>
          <div className={`font-bold text-sm ${state.currentPlayerId === me?.id ? "text-amber-300" : "text-amber-100"}`}>
            {state.currentPlayerId === me?.id
              ? "⚡ ĐẾN LƯỢT BẠN"
              : `${state.players.find((p) => p.id === state.currentPlayerId)?.name ?? "…"} đang đi`}
          </div>
        </div>
        <button
          onClick={onLeave}
          className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 hover:text-white transition-colors"
        >
          Thoát
        </button>
      </div>

      <ConnectionBanner connectionState={connectionState} />
      <DisconnectBadge seats={room.seats} />
      <RoomErrorBanner error={error} />

      {me && !me.alive && state.phase !== "finished" && (
        <div role="status" className="rounded-xl border border-slate-600 bg-slate-900/70 p-3 text-sm text-slate-200">
          Bạn đã bị loại. Bạn có thể tiếp tục theo dõi ván đấu và chờ kết quả.
        </div>
      )}

      {isSpectator && (
        <div className="rounded-xl p-2 text-center bg-amber-900/30 text-amber-300 text-sm">
          👁 Bạn đang xem — không thể chơi bài.
        </div>
      )}

      {/* Bàn tròn — đối thủ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-gradient-to-b from-[#1c150c] to-[#160f08] rounded-2xl p-3 border border-amber-900/30 shadow-inner">
        {opponents.map((p) => (
          <PlayerSeat
            key={p.id}
            player={p}
            isCurrentTurn={state.currentPlayerId === p.id}
            isMe={false}
            targeting={selectingTarget}
            targetable={selectingTarget && !!selectedCard && isValidTarget(selectedCard.kind, p, false)}
            onClick={() => handleSeatClick(p)}
          />
        ))}
      </div>

      {/* Giữa bàn: nọc bài / chồng bài bỏ / hiệu ứng đang treo */}
      <div className="flex items-center justify-center gap-6 bg-gradient-to-b from-[#1c150c] to-[#160f08] rounded-2xl px-5 py-3 border border-amber-900/30 shadow-inner">
        {/* Nọc bài */}
        <div className="flex flex-col items-center gap-1">
          <div
            className="w-16 h-24 rounded-lg border-2 border-amber-900/60 bg-gradient-to-b from-[#2b2013] to-[#1c150c] flex items-center justify-center shadow-lg"
            aria-label="Nọc bài"
          >
            <span className="text-3xl">🂠</span>
          </div>
          <div className="text-[10px] text-amber-400/60 font-mono">{state.deckCount} lá</div>
        </div>

        {/* Divider */}
        <div className="w-px h-16 bg-amber-900/30" />

        {/* Chồng bài bỏ */}
        <div className="flex flex-col items-center gap-1">
          {state.discardPile.length > 0 ? (
            <CardView card={state.discardPile[state.discardPile.length - 1]} small />
          ) : (
            <div className="w-16 h-24 rounded-lg border-2 border-dashed border-amber-900/60 bg-amber-950/20 flex items-center justify-center shadow-inner">
              <span className="text-amber-900/40 text-2xl">∅</span>
            </div>
          )}
          <div className="text-[10px] text-amber-400/60">bỏ bài</div>
        </div>

        {/* Pending response */}
        {state.pendingResponse && (
          <>
            <div className="w-px h-16 bg-amber-900/30" />
            <div className="text-center text-xs text-red-300 bg-red-950/60 rounded-lg px-3 py-2 border border-red-800/40 max-w-[150px]">
              <div className="font-bold mb-0.5">
                {state.pendingResponse.kind === "bang" || state.pendingResponse.kind === "gatling" ? "🔫" :
                 state.pendingResponse.kind === "duel" ? "⚔️" :
                 state.pendingResponse.kind === "indians" ? "🏹" : "⏳"}{" "}
                {state.pendingResponse.kind === "bang" ? "Bang!" :
                 state.pendingResponse.kind === "gatling" ? "Gatling!" :
                 state.pendingResponse.kind === "duel" ? "Đấu súng" :
                 state.pendingResponse.kind === "indians" ? "Người da đỏ!" : "Đang chờ"}
              </div>
              <div className="text-red-400/80 text-[10px]">
                → {state.pendingResponse.targetIds
                  .map((id) => state.players.find((p) => p.id === id)?.name ?? id)
                  .join(", ")}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Local player + action bar + hand */}
      {me && you && (
        <fieldset disabled={connectionState !== "connected" || !me.alive} className="flex min-w-0 flex-col gap-3">
          <LocalPlayerPanel me={me} you={you} />
          <ActionBar
            myTurn={myTurn}
            awaitingResponse={awaitingResp}
            selectingTarget={selectingTarget}
            canEndTurn={myTurn && connectionState === "connected" && me.alive}
            onEndTurn={handleEndTurnClick}
            onRespondPass={() => send({ type: "RESPOND" })}
            onCancelTarget={() => setSelectedCardId(null)}
            hasBarrel={(state.pendingResponse?.kind === "bang" || state.pendingResponse?.kind === "gatling") && me.equipment.includes("Thùng rượu")}
            responseKind={state.pendingResponse?.kind}
            isCalamity={isCalamity}
            waitingFor={state.pendingResponse
              ? state.pendingResponse.targetIds.map((id) => state.players.find((p) => p.id === id)?.name ?? "người chơi").join(", ")
              : state.players.find((p) => p.id === state.currentPlayerId)?.name}
            discarding={discarding}
            discardOverflow={discardOverflow}
            discardSelectedCount={discardIds.length}
            onConfirmDiscard={handleConfirmDiscard}
            onCancelDiscard={handleCancelDiscard}
          />
          <HandFan
            hand={you.hand}
            selectedId={selectedCardId}
            selectedIds={discarding ? discardIds : undefined}
            playable={discarding || myTurn || awaitingResp}
            canPlay={canPlayCard}
            onSelect={handleCardClick}
          />
          <p className="text-xs text-amber-200/70 px-2">Máu tự cập nhật theo hiệu ứng lá bài. Lá mờ chưa thể dùng ở bước này.</p>
          {myTurn && you.canFire === false && <p role="status" className="px-2 text-xs text-amber-200">Bạn đã dùng lượt bắn. Hãy dùng lá khác hoặc kết thúc lượt; Volcanic cho phép bắn thêm.</p>}
        </fieldset>
      )}

      <GameLogPanel log={state.gameLog} />

      <BangDebugPanel roomId={room.id} players={state.players} />
    </div>
  );
}
