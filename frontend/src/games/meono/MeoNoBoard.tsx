import { useState, useMemo } from "react";
import { useGameStore } from "../../platform/gameStore";
import { ConnectionBanner, LeaveRoomButton, RematchButton, RoomErrorBanner } from "../../platform/RoomShell";
import type { Card, CardKind, MeoNoMove, MeoNoViewerState, PublicPlayer } from "./types";

// ─── Card display config ──────────────────────────────────────────────────────

const CARD_IMG_BASE = "/assets/games/meono/cards";

// Number of art variants per card type
const CARD_VARIANTS: Record<string, number> = {
  exploding_kitten: 4,
  defuse: 6,
  skip: 4,
  attack: 4,
  see_the_future: 5,
  shuffle: 4,
  favor: 4,
  nope: 5,
};

// Cat cards each have a fixed index in cat_card/
const CAT_IMG_INDEX: Record<string, number> = {
  tacocat: 0,
  beardCat: 1,
  hairyPotatoCat: 2,
  rainbowRalphingCat: 3,
  cattermelon: 4,
};

// Map CardKind → image folder name
const KIND_FOLDER: Record<string, string> = {
  explodingKitten: "exploding_kitten",
  defuse: "defuse",
  skip: "skip",
  attack: "attack",
  seeFuture: "see_the_future",
  shuffle: "shuffle",
  favor: "favor",
  nope: "nope",
  tacocat: "cat_card",
  beardCat: "cat_card",
  hairyPotatoCat: "cat_card",
  rainbowRalphingCat: "cat_card",
  cattermelon: "cat_card",
};

function cardImageUrl(kind: CardKind, cardId: string): string {
  const folder = KIND_FOLDER[kind] ?? "back";
  if (kind in CAT_IMG_INDEX) {
    return `${CARD_IMG_BASE}/${folder}/${CAT_IMG_INDEX[kind]}.png`;
  }
  const variants = CARD_VARIANTS[folder] ?? 1;
  // Use numeric part of id (e.g. "c007" → 7) to deterministically pick variant
  const num = parseInt(cardId.replace(/\D/g, ""), 10) || 0;
  return `${CARD_IMG_BASE}/${folder}/${num % variants}.png`;
}

const CARD_INFO: Record<CardKind, { emoji: string; name: string; color: string; bg: string }> = {
  explodingKitten: { emoji: "💣", name: "Mèo Nổ",      color: "text-red-200",    bg: "bg-red-950/80 border-red-500/60" },
  defuse:          { emoji: "🧨", name: "Khuếch Tán",  color: "text-green-200",  bg: "bg-green-950/80 border-green-500/60" },
  skip:            { emoji: "⏭️",  name: "Bỏ Lượt",    color: "text-blue-200",   bg: "bg-blue-950/80 border-blue-500/50" },
  attack:          { emoji: "⚔️",  name: "Tấn Công",   color: "text-orange-200", bg: "bg-orange-950/80 border-orange-500/50" },
  seeFuture:       { emoji: "🔮", name: "Tiên Tri",    color: "text-purple-200", bg: "bg-purple-950/80 border-purple-500/50" },
  shuffle:         { emoji: "🔀", name: "Trộn Bài",    color: "text-cyan-200",   bg: "bg-cyan-950/80 border-cyan-500/50" },
  favor:           { emoji: "🤝", name: "Nhờ Vả",      color: "text-yellow-200", bg: "bg-yellow-950/80 border-yellow-500/50" },
  nope:            { emoji: "🚫", name: "Dừng Lại",    color: "text-pink-200",   bg: "bg-pink-950/80 border-pink-500/50" },
  tacocat:         { emoji: "🌮", name: "Mèo Taco",    color: "text-lime-200",   bg: "bg-lime-950/80 border-lime-500/40" },
  beardCat:        { emoji: "🧔", name: "Mèo Râu",     color: "text-teal-200",   bg: "bg-teal-950/80 border-teal-500/40" },
  hairyPotatoCat:  { emoji: "🥔", name: "Mèo Khoai",   color: "text-amber-200",  bg: "bg-amber-950/80 border-amber-500/40" },
  rainbowRalphingCat: { emoji: "🌈", name: "Mèo Cầu Vồng", color: "text-sky-200", bg: "bg-sky-950/80 border-sky-500/40" },
  cattermelon:     { emoji: "🍉", name: "Mèo Dưa Hấu", color: "text-rose-200",  bg: "bg-rose-950/80 border-rose-500/40" },
};

const CAT_CARDS: CardKind[] = ["tacocat", "beardCat", "hairyPotatoCat", "rainbowRalphingCat", "cattermelon"];
const NEEDS_TARGET: CardKind[] = ["attack", "favor", ...CAT_CARDS];

interface Props {
  makeMove: (roomId: string, move: unknown) => void;
  onLeave: () => void;
  onRematch: () => void;
  rematching: boolean;
}

export default function MeoNoBoard({ makeMove, onLeave, onRematch, rematching }: Props) {
  const { room, mySide, error, connectionState } = useGameStore();
  const gs = room?.state as MeoNoViewerState | undefined;

  // ── Selection state ────────────────────────────────────────────────────────
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [targetPlayerId, setTargetPlayerId] = useState<string | null>(null);
  const [requestedKind, setRequestedKind] = useState<string>("");
  const [defusePos, setDefusePos] = useState<number>(0);

  const send = (move: MeoNoMove) => {
    if (!room) return;
    makeMove(room.id, move);
    setSelectedCardIds([]);
    setTargetPlayerId(null);
    setRequestedKind("");
  };

  const myPlayerId = mySide ?? "";
  const me = gs?.players.find((p) => p.id === myPlayerId);
  const isMyTurn = gs?.currentPlayerId === myPlayerId && gs.phase === "action";
  const isAwaitingNope = gs?.phase === "awaitingNope" && gs.pendingAction?.nopePendingReplies.includes(myPlayerId);
  const isGiver = gs?.phase === "awaitingFavor" && gs.pendingAction?.targetPlayerId === myPlayerId;
  const isDefusing = gs?.phase === "awaitingDefuse" && gs.pendingAction?.actingPlayerId === myPlayerId;

  const otherPlayers = useMemo(() => gs?.players.filter((p) => p.id !== myPlayerId) ?? [], [gs, myPlayerId]);

  // ── Card selection logic ───────────────────────────────────────────────────
  const toggleCard = (id: string) => {
    setSelectedCardIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectedCards = useMemo(
    () => gs?.yourHand.filter((c) => selectedCardIds.includes(c.id)) ?? [],
    [gs, selectedCardIds]
  );

  const canPlaySelected = useMemo(() => {
    if (!isMyTurn) return false;
    if (selectedCards.length === 1) {
      const kind = selectedCards[0].kind;
      return kind !== "explodingKitten" && kind !== "defuse";
    }
    if (selectedCards.length >= 2) {
      const kinds = selectedCards.map((c) => c.kind);
      return kinds.every((k) => CAT_CARDS.includes(k));
    }
    return false;
  }, [isMyTurn, selectedCards]);

  const needsTarget_ = useMemo(() => {
    if (selectedCards.length === 1) return NEEDS_TARGET.includes(selectedCards[0].kind);
    if (selectedCards.length >= 2) return true; // combo always needs target (except 5-card)
    return false;
  }, [selectedCards]);

  const isCombo5 = selectedCards.length === 5 && selectedCards.map((c) => c.kind).every((k) => CAT_CARDS.includes(k));

  const playReady = canPlaySelected && (!needsTarget_ || isCombo5 || targetPlayerId);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handlePlayCard = () => {
    if (!canPlaySelected) return;
    if (selectedCards.length === 1) {
      send({ type: "PLAY_CARD", cardId: selectedCards[0].id, targetPlayerId: targetPlayerId ?? undefined });
    } else {
      send({
        type: "PLAY_COMBO",
        comboCardIds: selectedCardIds,
        targetPlayerId: targetPlayerId ?? undefined,
        requestedKind: requestedKind || undefined,
      });
    }
  };

  const handleDraw = () => send({ type: "DRAW" });
  const handleNope = () => send({ type: "NOPE" });
  const handlePass = () => send({ type: "PASS_NOPE" });

  const handleGiveCard = (cardId: string) => send({ type: "GIVE_CARD", cardId });

  const handleDefuse = () => {
    send({ type: "DEFUSE", insertPosition: defusePos });
  };

  // ── Derive top of discard ──────────────────────────────────────────────────
  const topDiscard = gs?.discardPile.length ? gs.discardPile[gs.discardPile.length - 1] : undefined;

  if (!room || !gs) return null;

  // ── Waiting ────────────────────────────────────────────────────────────────
  if (gs.phase === "waitingForPlayers") {
    return (
      <div className="rounded-2xl border border-pink-900/40 bg-black/40 p-6 text-center space-y-3">
        <div className="text-4xl">💣</div>
        <p className="text-pink-200/70 text-sm">Đang chờ đủ người chơi…</p>
        <LeaveRoomButton onLeave={onLeave} />
      </div>
    );
  }

  // ── Finished ──────────────────────────────────────────────────────────────
  if (gs.phase === "finished") {
    const winnerPlayer = gs.players.find((p) => p.id === gs.winner);
    const iWon = gs.winner === myPlayerId;
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-pink-900/40 bg-black/60 p-8 text-center space-y-4">
          <div className="text-5xl">{iWon ? "🏆" : "💀"}</div>
          <p className="text-xl font-bold text-pink-200">
            {iWon ? "Bạn thắng!" : `${winnerPlayer?.name ?? "Ai đó"} thắng!`}
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            <RematchButton onRematch={onRematch} loading={rematching} />
            <LeaveRoomButton onLeave={onLeave} />
          </div>
        </div>
        <GameLog log={gs.gameLog} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ConnectionBanner connectionState={connectionState} />
      <RoomErrorBanner error={error} />

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💣</span>
          <span className="text-pink-200 font-bold text-sm uppercase tracking-widest">Mèo Nổ</span>
        </div>
        <LeaveRoomButton onLeave={onLeave} />
      </div>

      {/* ── Other players ── */}
      <div className="grid grid-cols-2 gap-2">
        {otherPlayers.map((p) => (
          <PlayerCard
            key={p.id}
            player={p}
            isSelected={targetPlayerId === p.id}
            selectable={!!(needsTarget_ && isMyTurn && !isCombo5)}
            onClick={() => setTargetPlayerId((prev) => (prev === p.id ? null : p.id))}
            pendingAction={gs.pendingAction}
          />
        ))}
      </div>

      {/* ── Deck + Discard ── */}
      <div className="flex items-center gap-4 justify-center py-1">
        <div className="flex flex-col items-center gap-1">
          <div className="relative w-14 h-20 rounded-lg border-2 border-pink-900/60 overflow-hidden shadow-lg">
            <img
              src={`${CARD_IMG_BASE}/back/0.jpg`}
              alt="Mặt sau bài"
              className="w-full h-full object-cover"
              onError={(e) => {
                const t = e.target as HTMLImageElement;
                t.style.display = "none";
                t.parentElement!.classList.add("bg-gradient-to-b", "from-pink-950/80", "to-black/80", "flex", "items-center", "justify-center");
                t.parentElement!.innerHTML = '<span class="text-2xl">🂠</span>';
              }}
            />
          </div>
          <span className="text-xs text-pink-300/60">{gs.deckCount} lá</span>
        </div>
        <div className="text-pink-800/40 text-2xl">⇄</div>
        <div className="flex flex-col items-center gap-1">
          {topDiscard ? (
            <MiniCard card={topDiscard} />
          ) : (
            <div className="w-14 h-20 rounded-lg border-2 border-dashed border-pink-900/30 bg-black/20 flex items-center justify-center">
              <span className="text-pink-800/30 text-xs">—</span>
            </div>
          )}
          <span className="text-xs text-pink-300/60">Đã bỏ</span>
        </div>
      </div>

      {/* ── SeeFuture reveal ── */}
      {gs.seeFutureTop3 && gs.seeFutureTop3.length > 0 && (
        <div className="rounded-xl border border-purple-700/50 bg-purple-950/50 p-3 space-y-2">
          <p className="text-xs text-purple-300/80 font-bold uppercase tracking-widest text-center">🔮 Tiên Tri — 3 lá trên cùng</p>
          <div className="flex justify-center gap-2">
            {gs.seeFutureTop3.map((c, i) => (
              <div key={c.id} className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-purple-400/50">{i + 1}</span>
                <MiniCard card={c} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── AwaitingNope banner ── */}
      {gs.phase === "awaitingNope" && gs.pendingAction && (
        <div className="rounded-xl border border-yellow-700/50 bg-yellow-950/40 p-3 space-y-2 text-center">
          <p className="text-yellow-200 text-sm font-bold">
            {gs.pendingAction.noped ? "🚫 Hiệu ứng đang BỊ HỦY" : "⏳ Đang chờ phản ứng"}
          </p>
          <p className="text-yellow-300/70 text-xs">
            {CARD_INFO[gs.pendingAction.actionKindName.toLowerCase() as CardKind]?.emoji ?? "🃏"}{" "}
            {gs.players.find((p) => p.id === gs.pendingAction!.actingPlayerId)?.name ?? "?"} đánh bài
            {gs.pendingAction.noped ? " — bị Nope" : ""}
          </p>
          {gs.pendingAction.nopePendingReplies.length > 0 && (
            <p className="text-yellow-400/50 text-xs">
              Chờ: {gs.pendingAction.nopePendingReplies
                .map((id) => gs.players.find((p) => p.id === id)?.name ?? id)
                .join(", ")}
            </p>
          )}
          {isAwaitingNope && (
            <div className="flex justify-center gap-2 mt-2">
              <button
                onClick={handleNope}
                className="rounded-lg bg-pink-700 hover:bg-pink-600 px-4 py-2 text-sm font-bold text-white transition-colors"
              >
                🚫 NOPE
              </button>
              <button
                onClick={handlePass}
                className="rounded-lg border border-pink-900/60 bg-black/40 hover:bg-pink-950/60 px-4 py-2 text-sm font-medium text-pink-300/70 hover:text-pink-200 transition-colors"
              >
                Bỏ qua
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── AwaitingFavor banner ── */}
      {gs.phase === "awaitingFavor" && gs.pendingAction && (
        <div className="rounded-xl border border-yellow-700/50 bg-yellow-950/40 p-3 text-center space-y-1">
          <p className="text-yellow-200 text-sm font-bold">
            🤝 {gs.players.find((p) => p.id === gs.pendingAction!.actingPlayerId)?.name ?? "?"} yêu cầu 1 lá bài từ bạn
          </p>
          {isGiver && <p className="text-yellow-300/60 text-xs">Chọn 1 lá để trao bên dưới</p>}
        </div>
      )}

      {/* ── AwaitingDefuse banner ── */}
      {isDefusing && (
        <div className="rounded-xl border border-red-600/70 bg-red-950/60 p-4 space-y-3">
          <p className="text-red-200 font-bold text-center">💣 Bạn rút trúng Mèo Nổ!</p>
          <p className="text-red-300/70 text-sm text-center">Chọn vị trí chèn Mèo Nổ vào bộ bài ({gs.deckCount} lá)</p>
          <input
            type="range"
            min={0}
            max={gs.deckCount}
            value={defusePos}
            onChange={(e) => setDefusePos(Number(e.target.value))}
            className="w-full accent-red-500"
          />
          <p className="text-center text-xs text-red-300/60">
            Vị trí {defusePos} ({defusePos === 0 ? "trên cùng" : defusePos === gs.deckCount ? "dưới cùng" : `thứ ${defusePos + 1} từ trên`})
          </p>
          <button
            onClick={handleDefuse}
            className="w-full rounded-lg bg-green-700 hover:bg-green-600 py-2 font-bold text-white text-sm transition-colors"
          >
            🧨 Khuếch Tán
          </button>
        </div>
      )}

      {/* ── My hand ── */}
      <div className="rounded-xl border border-pink-900/40 bg-black/30 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-pink-300/60 uppercase tracking-widest font-bold">Tay bài của bạn ({gs.yourHand.length})</span>
          {me && !me.alive && <span className="text-xs text-red-400">💀 Đã bị loại</span>}
        </div>
        {gs.yourHand.length === 0 ? (
          <p className="text-pink-900/50 text-xs italic text-center py-2">Không còn bài</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {gs.yourHand.map((card) => {
              const info = CARD_INFO[card.kind];
              const imgUrl = cardImageUrl(card.kind, card.id);
              const selected = selectedCardIds.includes(card.id);
              const clickable = (isMyTurn && card.kind !== "explodingKitten") || isGiver;
              return (
                <button
                  key={card.id}
                  onClick={() => {
                    if (isGiver) { handleGiveCard(card.id); return; }
                    if (clickable) toggleCard(card.id);
                  }}
                  disabled={!clickable}
                  title={info.name}
                  className={`rounded-lg border-2 flex flex-col items-center text-center transition-all w-[52px] ${info.bg} overflow-hidden ${
                    selected ? "ring-2 ring-pink-400 scale-105 shadow-lg" : "hover:scale-105 hover:brightness-110"
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <img
                    src={imgUrl}
                    alt={info.name}
                    className="w-full h-[60px] object-cover object-top"
                    onError={(e) => {
                      const t = e.target as HTMLImageElement;
                      t.style.display = "none";
                      t.nextElementSibling?.classList.remove("hidden");
                    }}
                  />
                  <span className="hidden text-xl leading-none py-1">{info.emoji}</span>
                  <span className={`text-[8px] font-bold uppercase tracking-tight leading-tight py-0.5 px-0.5 bg-black/60 w-full text-center ${info.color}`}>
                    {info.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Combo kind request (3-card combo) */}
        {selectedCards.length === 3 && selectedCards.every((c) => CAT_CARDS.includes(c.kind)) && (
          <div className="mt-2 space-y-1">
            <p className="text-xs text-pink-300/60">Yêu cầu loại bài (combo 3 lá):</p>
            <select
              value={requestedKind}
              onChange={(e) => setRequestedKind(e.target.value)}
              className="w-full rounded border border-pink-900/50 bg-black/60 text-pink-200 text-xs py-1 px-2"
            >
              <option value="">— chọn loại bài —</option>
              {(Object.keys(CARD_INFO) as CardKind[])
                .filter((k) => k !== "explodingKitten")
                .map((k) => (
                  <option key={k} value={k}>{CARD_INFO[k].emoji} {CARD_INFO[k].name}</option>
                ))}
            </select>
          </div>
        )}

        {/* 5-card combo kind request */}
        {isCombo5 && (
          <div className="mt-2 space-y-1">
            <p className="text-xs text-pink-300/60">Lấy loại bài từ discard (combo 5 lá):</p>
            <select
              value={requestedKind}
              onChange={(e) => setRequestedKind(e.target.value)}
              className="w-full rounded border border-pink-900/50 bg-black/60 text-pink-200 text-xs py-1 px-2"
            >
              <option value="">— chọn loại bài —</option>
              {(Object.keys(CARD_INFO) as CardKind[])
                .filter((k) => k !== "explodingKitten")
                .map((k) => (
                  <option key={k} value={k}>{CARD_INFO[k].emoji} {CARD_INFO[k].name}</option>
                ))}
            </select>
          </div>
        )}
      </div>

      {/* ── Action bar ── */}
      {isMyTurn && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handlePlayCard}
            disabled={!playReady}
            className="flex-1 min-w-[100px] rounded-lg bg-pink-700 hover:bg-pink-600 disabled:bg-pink-900/40 disabled:text-pink-700 py-2.5 font-bold text-white text-sm transition-colors"
          >
            {selectedCards.length >= 2 ? "🃏 Combo" : selectedCards.length === 1 ? `${CARD_INFO[selectedCards[0].kind]?.emoji} Đánh bài` : "Chọn bài"}
          </button>
          <button
            onClick={handleDraw}
            disabled={gs.deckCount === 0}
            className="flex-1 min-w-[100px] rounded-lg bg-black/60 border border-pink-700/60 hover:bg-pink-950/60 disabled:opacity-40 py-2.5 font-bold text-pink-200 text-sm transition-colors"
          >
            🂠 Rút bài
          </button>
        </div>
      )}

      {!isMyTurn && !isAwaitingNope && !isGiver && !isDefusing && gs.phase === "action" && (
        <div className="text-center text-pink-300/50 text-sm py-2 animate-pulse">
          Lượt của {gs.players.find((p) => p.id === gs.currentPlayerId)?.name ?? "?"}…
        </div>
      )}

      {/* ── Turn/TurnsLeft indicator ── */}
      {isMyTurn && gs.turnsLeft > 1 && (
        <p className="text-center text-orange-300/70 text-xs">
          ⚔️ Bị Attack — còn {gs.turnsLeft} lượt rút
        </p>
      )}

      <GameLog log={gs.gameLog} />
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function MiniCard({ card }: { card: Card }) {
  const info = CARD_INFO[card.kind];
  const imgUrl = cardImageUrl(card.kind, card.id);
  return (
    <div className={`w-14 h-20 rounded-lg border-2 ${info.bg} overflow-hidden flex flex-col shadow`}>
      <img
        src={imgUrl}
        alt={info.name}
        className="w-full flex-1 object-cover object-top"
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
      <span className={`text-[8px] font-bold text-center leading-tight px-1 py-0.5 ${info.color} bg-black/60 shrink-0`}>{info.name}</span>
    </div>
  );
}

function PlayerCard({
  player,
  isSelected,
  selectable,
  onClick,
  pendingAction,
}: {
  player: PublicPlayer;
  isSelected: boolean;
  selectable: boolean;
  onClick: () => void;
  pendingAction: MeoNoViewerState["pendingAction"];
}) {
  const isActor = pendingAction?.actingPlayerId === player.id;
  const isWaiting = pendingAction?.nopePendingReplies.includes(player.id);

  return (
    <button
      onClick={selectable ? onClick : undefined}
      disabled={!selectable || !player.alive}
      className={`rounded-xl border p-3 text-left transition-all ${
        !player.alive
          ? "border-gray-800/50 bg-black/20 opacity-40"
          : isSelected
          ? "border-pink-400 bg-pink-950/60 ring-2 ring-pink-500/50"
          : selectable
          ? "border-pink-800/60 bg-black/40 hover:border-pink-600/60 hover:bg-pink-950/40 cursor-pointer"
          : "border-pink-900/30 bg-black/30 cursor-default"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`font-bold text-sm truncate ${player.isCurrentPlayer ? "text-pink-200" : "text-pink-300/70"}`}>
          {player.isCurrentPlayer && <span className="text-yellow-400 mr-1">▶</span>}
          {player.alive ? "" : "💀 "}{player.name}
        </span>
        {isActor && <span className="text-[10px] bg-yellow-900/60 text-yellow-300 px-1.5 py-0.5 rounded-full shrink-0">Đang đánh</span>}
        {isWaiting && <span className="text-[10px] bg-pink-900/60 text-pink-300 px-1.5 py-0.5 rounded-full shrink-0 animate-pulse">Chờ…</span>}
      </div>
      <div className="mt-1.5 flex items-center gap-0.5">
        {Array.from({ length: Math.min(player.cardCount, 8) }).map((_, i) => (
          <div key={i} className="w-3 h-4 rounded-sm overflow-hidden border border-pink-800/40">
            <img src={`${CARD_IMG_BASE}/back/0.jpg`} alt="" className="w-full h-full object-cover" />
          </div>
        ))}
        {player.cardCount > 8 && <span className="text-pink-400/50 text-[10px]">+{player.cardCount - 8}</span>}
        {player.cardCount === 0 && <span className="text-pink-800/40 text-xs italic">Không có bài</span>}
      </div>
    </button>
  );
}

function GameLog({ log }: { log: string[] }) {
  const recent = log.slice(-8).reverse();
  if (recent.length === 0) return null;
  return (
    <div className="rounded-xl border border-pink-900/30 bg-black/20 p-3 space-y-1 max-h-36 overflow-y-auto">
      <p className="text-[10px] text-pink-300/40 uppercase tracking-widest font-bold mb-1">Nhật ký</p>
      {recent.map((entry, i) => (
        <p key={i} className={`text-xs ${i === 0 ? "text-pink-200/80" : "text-pink-300/40"}`}>{entry}</p>
      ))}
    </div>
  );
}
