import { useState } from "react";
import { useGameStore } from "../../platform/gameStore";
import PlayerSeat from "./components/PlayerSeat";
import LocalPlayerPanel from "./components/LocalPlayerPanel";
import HandFan from "./components/HandFan";
import ActionBar from "./components/ActionBar";
import GameLogPanel from "./components/GameLogPanel";
import VictoryScreen from "./components/VictoryScreen";
import CardView from "./components/CardView";
import {
  awaitingMyResponse, isMyTurn, myPlayer,
  type BangMove, type BangPublicPlayer, type BangViewerState, type Card, type CardKind,
} from "./types";

interface Props {
  makeMove: (roomId: string, move: unknown) => void;
  onLeave: () => void;
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

export default function BangBoard({ makeMove, onLeave }: Props) {
  const { room, error } = useGameStore();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  if (!room) return null;
  const state = room.state as BangViewerState;

  if (state.phase === "waitingForPlayers" || room.status === "Waiting") {
    return (
      <div className="flex flex-col gap-3 w-full max-w-md mx-auto">
        <div className="bg-slate-800 rounded-2xl p-5 text-center space-y-3">
          <div className="text-3xl">🤠</div>
          <h2 className="font-bold text-lg text-amber-300">BANG! — ĐANG CHỜ</h2>
          <p className="text-slate-400 text-sm">
            {room.seats.filter(Boolean).length}/{room.seatCount} người chơi đã vào phòng.
          </p>
          <ul className="text-sm text-slate-300 space-y-1">
            {room.seats.map((name, i) => (
              <li key={i} className={name ? "" : "text-slate-600"}>
                {name ? `👤 ${name}` : `— (trống)`}
              </li>
            ))}
          </ul>
        </div>
        {error && <div className="rounded-xl p-2 text-center bg-red-900/40 text-red-300 text-sm">{error}</div>}
        <button onClick={onLeave}
          className="w-full rounded-xl bg-slate-700 hover:bg-slate-600 active:bg-slate-500 px-4 py-3 font-medium text-base transition-colors">
          ← Rời phòng
        </button>
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

  const send = (move: BangMove) => makeMove(room.id, move);

  function handleCardClick(card: Card) {
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

  function handleSeatClick(target: BangPublicPlayer) {
    if (!selectedCard) return;
    send({ type: "PLAY_CARD", cardId: selectedCard.id, targetPlayerId: target.id });
    setSelectedCardId(null);
  }

  const opponents = state.players.filter((p) => p.id !== me?.id);

  return (
    <div className="flex flex-col gap-3 w-full max-w-2xl mx-auto">
      {state.phase === "finished" && <VictoryScreen state={state} onLeave={onLeave} />}

      {/* Top bar */}
      <div className="bg-gradient-to-r from-[#241a10] to-[#2b2013] rounded-2xl px-4 py-2.5 shadow-lg flex items-center justify-between">
        <div>
          <div className="font-bold text-amber-200 text-sm">🤠 BANG!</div>
          <div className="text-[11px] text-amber-300/60 font-mono">Phòng {room.id.slice(0, 8)}</div>
        </div>
        <div className="text-center">
          <div className="text-[11px] text-amber-300/70 uppercase">Lượt {state.turnNumber}</div>
          <div className="font-semibold text-amber-100 text-sm">
            {state.currentPlayerId === me?.id ? "ĐẾN LƯỢT BẠN" : `${state.players.find((p) => p.id === state.currentPlayerId)?.name ?? "…"} đang đi`}
          </div>
        </div>
        <button onClick={onLeave} className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-700/80 hover:bg-slate-600 text-slate-200">
          Thoát
        </button>
      </div>

      {isSpectator && (
        <div className="rounded-xl p-2 text-center bg-amber-900/30 text-amber-300 text-sm">
          👁 Bạn đang xem — không thể chơi bài.
        </div>
      )}

      {/* Bàn tròn — đối thủ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-[#1c150c] rounded-2xl p-3 border border-amber-900/40">
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
      <div className="flex items-center justify-center gap-4 bg-[#1c150c] rounded-2xl p-3 border border-amber-900/40">
        <div className="text-center">
          <div className="text-2xl">🂠</div>
          <div className="text-[11px] text-amber-300/70">Nọc bài: {state.deckCount}</div>
        </div>
        {state.discardPile.length > 0 && (
          <div className="flex flex-col items-center">
            <CardView card={state.discardPile[state.discardPile.length - 1]} small />
            <div className="text-[11px] text-amber-300/70 mt-0.5">Chồng bài bỏ</div>
          </div>
        )}
        {state.pendingResponse && (
          <div className="text-center text-xs text-red-300 bg-red-950/50 rounded-lg px-2 py-1">
            ⏳ Đang chờ{" "}
            {state.pendingResponse.targetIds
              .map((id) => state.players.find((p) => p.id === id)?.name ?? id)
              .join(", ")}{" "}
            phản hồi
          </div>
        )}
      </div>

      {/* Local player + action bar + hand */}
      {me && you && (
        <>
          <LocalPlayerPanel me={me} you={you} />
          <ActionBar
            myTurn={myTurn}
            awaitingResponse={awaitingResp}
            selectingTarget={selectingTarget}
            canEndTurn={myTurn}
            onEndTurn={() => send({ type: "END_TURN" })}
            onRespondPass={() => send({ type: "RESPOND" })}
            onCancelTarget={() => setSelectedCardId(null)}
          />
          <HandFan
            hand={you.hand}
            selectedId={selectedCardId}
            playable={myTurn || awaitingResp}
            onSelect={handleCardClick}
          />
        </>
      )}

      <GameLogPanel log={state.gameLog} />

      {error && <div className="rounded-xl p-2 text-center bg-red-900/40 text-red-300 text-sm">{error}</div>}
    </div>
  );
}
