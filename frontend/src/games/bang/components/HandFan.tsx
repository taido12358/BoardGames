import type { Card } from "../types";
import { CARD_DISPLAY } from "../types";
import type { DragEvent } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { CARD_EFFECT } from "./CardView";
import CardView from "./CardView";
import { useCardDrawFlashState } from "../useCardDrawFlash";
import { useNewHandCards } from "../useNewHandCards";
import { changeFlashClass } from "../../useChangeFlash";
import { useReducedMotionPreference } from "../../../hooks/useReducedMotionPreference";
import { useResizeRevision } from "../../../hooks/useResizeRevision";

const HAND_CARD_STAGGER_MS = 55;
const MAX_HAND_CARD_STAGGER_INDEX = 9;

interface Props {
  hand: Card[];
  selectedId?: string | null;
  pendingId?: string | null;
  rejectedId?: string | null;
  rejectedSequence?: number;
  selectedIds?: string[];
  playable: boolean;
  responseMode?: boolean;
  canPlay?: (card: Card) => boolean;
  getDisabledReason?: (card: Card) => string | undefined;
  onSelect: (card: Card) => void;
  dealAnimation?: boolean;
  roomId?: string;
  incomingSourcePlayerId?: string | null;
  deckReshuffleSequence?: number;
  boardLayoutRevision?: number;
  draggingCardId?: string | null;
  onCardDragStart?: (card: Card, event: DragEvent<HTMLButtonElement>) => void;
  onCardDragEnd?: (event: DragEvent<HTMLButtonElement>) => void;
}

/** Bài trên tay của CHÍNH người chơi — fan layout, hover nâng bài lên. */
export default function HandFan({ hand, selectedId, selectedIds, pendingId, rejectedId, rejectedSequence, playable, responseMode = false, canPlay, getDisabledReason, onSelect, dealAnimation = false, roomId, incomingSourcePlayerId, deckReshuffleSequence = 0, boardLayoutRevision = 0, draggingCardId = null, onCardDragStart, onCardDragEnd }: Props) {
  const prefersReducedMotion = useReducedMotionPreference();
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const hoveredCard = hand.find((c) => c.id === hoveredCardId) ?? null;
  const justDrew = useCardDrawFlashState(hand.length, roomId);
  const newCardIds = useNewHandCards(hand, roomId, MAX_HAND_CARD_STAGGER_INDEX * HAND_CARD_STAGGER_MS + 520 + 120);
  const handRef = useRef<HTMLDivElement>(null);
  const handResizeRevision = useResizeRevision(handRef, hand.length > 0);
  const cardRefs = useRef(new Map<string, HTMLDivElement>());
  const previousRects = useRef(new Map<string, { left: number; top: number }>());
  const layoutAnimations = useRef(new Map<string, Animation>());
  const arrivalAnimations = useRef(new Map<string, Animation>());
  const previousIds = useRef(new Set(hand.map((card) => card.id)));
  const animatedArrivalIds = useRef(new Set<string>());
  const previousRoomId = useRef(roomId);
  const previousDeckReshuffleSequence = useRef(deckReshuffleSequence);

  useLayoutEffect(() => {
    if (roomId !== previousRoomId.current) {
      previousRoomId.current = roomId;
      previousDeckReshuffleSequence.current = deckReshuffleSequence;
      for (const animation of layoutAnimations.current.values()) animation.cancel();
      layoutAnimations.current.clear();
      for (const node of cardRefs.current.values()) node.getAnimations().forEach((animation) => animation.cancel());
      arrivalAnimations.current.clear();
      previousRects.current.clear();
      previousIds.current = new Set(hand.map((card) => card.id));
      animatedArrivalIds.current.clear();
      return;
    }
    if (prefersReducedMotion) {
      for (const node of cardRefs.current.values()) {
        node.getAnimations().forEach((animation) => animation.cancel());
      }
      layoutAnimations.current.clear();
      arrivalAnimations.current.clear();
      previousRects.current.clear();
      previousIds.current = new Set(hand.map((card) => card.id));
      return;
    }
    const reshuffleJustConfirmed = deckReshuffleSequence > previousDeckReshuffleSequence.current;
    previousDeckReshuffleSequence.current = deckReshuffleSequence;
    const container = handRef.current;
    if (!container) {
      for (const animation of layoutAnimations.current.values()) animation.cancel();
      layoutAnimations.current.clear();
      arrivalAnimations.current.clear();
      previousRects.current.clear();
      previousIds.current = new Set();
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const board = container.closest<HTMLElement>("[data-bang-board]");
    const deck = board?.querySelector<HTMLElement>("[data-bang-deck]");
    const deckRect = deck?.getBoundingClientRect();
    const incomingSource = incomingSourcePlayerId
      ? [...(board?.querySelectorAll<HTMLElement>("[data-player-id]") ?? [])]
        .find((node) => node.dataset.playerId === incomingSourcePlayerId)
      : null;
    const sourceRect = incomingSource?.getBoundingClientRect() ?? deckRect;
    const currentRects = new Map<string, { left: number; top: number }>();
    const currentIds = new Set(hand.map((card) => card.id));
    const arrivalOrder = new Map<string, number>();
    if (dealAnimation) {
      hand.forEach((card, index) => arrivalOrder.set(card.id, index));
    } else {
      let nextArrivalIndex = 0;
      for (const card of hand) {
        if (!previousIds.current.has(card.id) && newCardIds.has(card.id)) {
          arrivalOrder.set(card.id, nextArrivalIndex);
          nextArrivalIndex += 1;
        }
      }
    }
    for (const id of animatedArrivalIds.current) if (!currentIds.has(id)) animatedArrivalIds.current.delete(id);

    for (const [i, card] of hand.entries()) {
      const node = cardRefs.current.get(card.id);
      if (!node) continue;
      const activeLayoutAnimation = layoutAnimations.current.get(card.id);
      const visualRect = activeLayoutAnimation ? node.getBoundingClientRect() : null;
      if (activeLayoutAnimation) {
        layoutAnimations.current.delete(card.id);
        activeLayoutAnimation.cancel();
      }
      const rect = node.getBoundingClientRect();
      const position = {
        left: rect.left - containerRect.left + container.scrollLeft,
        top: rect.top - containerRect.top + container.scrollTop,
      };
      const previousPosition = visualRect
        ? {
          left: visualRect.left - containerRect.left + container.scrollLeft,
          top: visualRect.top - containerRect.top + container.scrollTop,
        }
        : previousRects.current.get(card.id);
      const isNewCard = !previousIds.current.has(card.id) || newCardIds.has(card.id) || dealAnimation;
      const arrivalAnimation = arrivalAnimations.current.get(card.id);
      const isArriving = arrivalAnimation?.playState === "running" || arrivalAnimation?.pending === true;

      if (isNewCard && sourceRect && !prefersReducedMotion && typeof node.animate === "function" && !animatedArrivalIds.current.has(card.id)) {
        const dx = sourceRect.left + sourceRect.width / 2 - (rect.left + rect.width / 2);
        const dy = sourceRect.top + sourceRect.height / 2 - (rect.top + rect.height / 2);
        const hoverY = node.matches(":hover") ? -7 : 0;
        node.getAnimations().forEach((animation) => animation.cancel());
        layoutAnimations.current.delete(card.id);
        const animation = node.animate(
          [
            { opacity: 0, transform: `translate3d(${dx}px, ${dy}px, 0) scale(0.72) rotate(9deg)` },
            { offset: 0.62, opacity: 1, transform: `translate3d(${dx * 0.34}px, ${dy * 0.34}px, 0) scale(1.05) rotate(-3deg)` },
            { opacity: 1, transform: `translate3d(0, ${hoverY}px, 0) scale(1) rotate(0)` },
          ],
          {
            duration: 520,
            delay: (reshuffleJustConfirmed ? 420 : 0) + Math.min(arrivalOrder.get(card.id) ?? i, MAX_HAND_CARD_STAGGER_INDEX) * HAND_CARD_STAGGER_MS,
            easing: "cubic-bezier(0.2, 0.75, 0.25, 1)",
            fill: "backwards",
          },
        );
        arrivalAnimations.current.set(card.id, animation);
        animation.onfinish = animation.oncancel = () => {
          if (arrivalAnimations.current.get(card.id) === animation) arrivalAnimations.current.delete(card.id);
        };
        animatedArrivalIds.current.add(card.id);
      } else if (previousPosition && !isNewCard && !isArriving && !prefersReducedMotion && typeof node.animate === "function") {
        const dx = previousPosition.left - position.left;
        const dy = previousPosition.top - position.top;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          const tilt = Math.sign(dx || dy) * Math.min(2.5, Math.abs(dx) / 24);
          const animation = node.animate(
            [
              { transform: `translate3d(${dx}px, ${dy}px, 0) rotate(${tilt}deg) scale(0.985)` },
              { transform: "translate3d(0, 0, 0) rotate(0deg) scale(1)" },
            ],
            { duration: 300, easing: "cubic-bezier(0.2, 0.75, 0.25, 1)" },
          );
          layoutAnimations.current.set(card.id, animation);
          animation.onfinish = animation.oncancel = () => {
            if (layoutAnimations.current.get(card.id) === animation) layoutAnimations.current.delete(card.id);
          };
        }
      }
      currentRects.set(card.id, position);
    }

    previousRects.current = currentRects;
    previousIds.current = currentIds;
  }, [hand, newCardIds, dealAnimation, roomId, incomingSourcePlayerId, deckReshuffleSequence, prefersReducedMotion, handResizeRevision, boardLayoutRevision]);

  if (hand.length === 0) {
    return (
      <div className="animate-game-action-enter flex items-center justify-center text-amber-900/50 text-sm py-5 text-center rounded-sm border border-amber-950/60 bg-[#0d0805]/60 italic shadow-[inset_0_2px_6px_rgba(0,0,0,0.8)]">
        Bạn không có lá bài nào.
      </div>
    );
  }

  return (
    <div>
      {hoveredCard && (
        <div className="animate-game-action-enter rounded-sm border border-amber-700/40 bg-[#1e1408] px-3 py-2 text-xs mb-1 flex items-start gap-2">
          <span className="text-xl shrink-0 leading-none">{CARD_DISPLAY[hoveredCard.kind].icon}</span>
          <div className="min-w-0">
            <div className="font-bold text-amber-200">{CARD_DISPLAY[hoveredCard.kind].name}</div>
            <div className="text-amber-400/80 mt-0.5">{CARD_EFFECT[hoveredCard.kind]}</div>
            <div className="text-amber-900/50 text-[10px] mt-0.5 font-mono">{hoveredCard.suit} {hoveredCard.rank}</div>
          </div>
        </div>
      )}
      <div
        ref={handRef}
        className={[
          "flex gap-2 overflow-x-auto pb-3 pt-4 px-3 -mx-1 rounded-sm",
          "bg-gradient-to-b from-[#1a1208] to-[#130e06]",
          "border border-amber-900/40 shadow-inner shadow-black/50",
          changeFlashClass(justDrew, "animate-card-draw"),
        ].join(" ")}
      >
        {hand.map((card, index) => (
        <div
          key={card.id}
          ref={(node) => {
            if (node) cardRefs.current.set(card.id, node);
            else {
              cardRefs.current.delete(card.id);
              const animation = layoutAnimations.current.get(card.id);
              if (animation) {
                layoutAnimations.current.delete(card.id);
                animation.cancel();
              }
              const arrivalAnimation = arrivalAnimations.current.get(card.id);
              if (arrivalAnimation) {
                arrivalAnimations.current.delete(card.id);
                arrivalAnimation.cancel();
              }
            }
          }}
          className={`bang-hand-card shrink-0 relative ${newCardIds.has(card.id) || dealAnimation ? "bang-hand-card-arrival" : ""} ${draggingCardId === card.id ? "bang-hand-card-dragging" : ""}`}
          onMouseEnter={() => setHoveredCardId(card.id)}
          onMouseLeave={() => setHoveredCardId(null)}
        >
          <CardView
            card={card}
            selected={selectedId === card.id || !!selectedIds?.includes(card.id)}
            pending={pendingId === card.id}
            rejected={rejectedId === card.id}
            rejectedSequence={rejectedSequence}
            onDragStart={onCardDragStart ? (event) => onCardDragStart(card, event) : undefined}
            onDragEnd={onCardDragEnd}
            selectionMode={selectedIds !== undefined}
            disabled={!playable || (canPlay && !canPlay(card))}
            disabledReason={getDisabledReason?.(card)}
            responseReady={responseMode && (!canPlay || canPlay(card))}
            responseReadyDelayMs={Math.min(index, 5) * 42}
            onClick={playable ? () => onSelect(card) : undefined}
          />
        </div>
        ))}
      </div>
      {playable && hand.some((card) => !canPlay || canPlay(card)) && (
        <p className="bang-hand-drag-hint">
          <span className="font-semibold text-amber-300">
            {hand.filter((card) => !canPlay || canPlay(card)).length} lá có thể dùng
          </span>
          <span aria-hidden="true" className="opacity-50">{"\u00b7"}</span>
          <span className="bang-hand-drag-hint-icon">{"\u2197"}</span>
          <span className="hidden sm:inline">{"K\u00e9o l\u00e1 b\u00e0i l\u00ean b\u00e0n \u0111\u1ec3 d\u00f9ng \u00b7 k\u00e9o l\u00ean gh\u1ebf \u0111\u1ec3 ch\u1ecdn m\u1ee5c ti\u00eau"}</span>
          <span className="sm:hidden">{"Ch\u1ea1m b\u00e0i \u0111\u1ec3 ch\u1ecdn \u00b7 ch\u1ecdn m\u1ee5c ti\u00eau tr\u00ean gh\u1ebf"}</span>
        </p>
      )}
    </div>
  );
}
