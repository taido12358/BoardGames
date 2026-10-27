import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { BangPublicPlayer, Card, PendingResponseView } from "./types";
import { useReducedMotionPreference } from "../../hooks/useReducedMotionPreference";
import { resolveLogPlayer, resolveLogTarget } from "./resolveLogPlayer";

// Match the longest single-card play beat (980ms flight plus its landing ring)
// so React does not remove the overlay before the choreography finishes.
const PLAY_ANIMATION_MS = 1100;
// Covers the last staggered projectile (420 + 6*65 + 330ms) and impact (300ms).
const WIDE_ATTACK_ANIMATION_MS = 1500;
const PLAY_CARD_STAGGER_MS = 45;
const MAX_PLAY_CARD_STAGGER = 4;

function actionActorName(message: string): string | null {
  return message.match(/^(.+?)(?= (?:s\u1eed d\u1ee5ng|th\u00e1ch|\u0111\u00e1p tr\u1ea3 b\u1eb1ng|u\u1ed1ng Bia|d\u00f9ng Ho\u1ea3ng lo\u1ea1n!|d\u00f9ng Cat Balou|r\u00fat th\u00eam|b\u1eafn nh\u1ea7m|trang b\u1ecb|b\u1ecf Bang! \u0111\u1ec3 n\u00e9 Ng\u01b0\u1eddi da \u0111\u1ecf!|ki\u1ec3m tra Th\u00f9ng r\u01b0\u1ee3u|b\u1ecf \\d+ l\u00e1))/)?.[1] ?? null;
}

function actionTargetName(message: string): string | null {
  return message.match(/Ho\u1ea3ng lo\u1ea1n! l\u1ea5y 1 l\u00e1 t\u1eeb (.+)\.$/)?.[1]
    ?? message.match(/Cat Balou bu\u1ed9c (.+?) b\u1ecf 1 l\u00e1\.$/)?.[1]
    ?? null;
}

interface PlayedCardEffect {
  card: Card | null;
  cards: Card[];
  discardedCards: Card[];
  message: string;
  key: number;
  durationMs: number;
  actorId: string | null;
  targetId: string | null;
  shotActorId: string | null;
  shotTargetIds: string[];
  shotKind: "bullet" | "arrow" | "aim" | null;
}

function shotMetadata(
  message: string,
  players: BangPublicPlayer[],
  pendingResponse: PendingResponseView | null,
  previousCardCounts: ReadonlyMap<string, number>,
  previousHitPoints: ReadonlyMap<string, number>,
) {
  const bang = message.match(/^(.+?) sử dụng Bang! lên (.+?)\.$/);
  const gatling = message.match(/^(.+?) sử dụng Súng Gatling/);
  const indians = message.match(/^(.+?) sử dụng Người da đỏ!/);
  const duel = message.match(/^(.+?) thách (.+?) đấu súng\.$/);
  const duelBang = message.match(/^(.+?) đáp trả bằng Bang! trong đấu súng\.$/);
  const actorName = bang?.[1] ?? gatling?.[1] ?? indians?.[1] ?? duel?.[1] ?? duelBang?.[1] ?? actionActorName(message);
  const expectedResponseKind = bang ? "bang" : gatling ? "gatling" : indians ? "indians" : duel ? "duel" : null;
  const responseMatchesAction = expectedResponseKind !== null && pendingResponse?.kind === expectedResponseKind;
  const loggedActor = actorName ? resolveLogPlayer(actorName, players, previousCardCounts) : null;
  const actor = responseMatchesAction
    ? players.find((player) => player.id === pendingResponse.fromPlayerId) ?? loggedActor
    : loggedActor;
  const targetName = actionTargetName(message);
  const target = targetName ? resolveLogTarget(targetName, players, previousCardCounts, previousHitPoints) : null;
  const responseTargets = responseMatchesAction ? [...pendingResponse.targetIds] : null;
  let targetIds: string[] = [];
  let kind: PlayedCardEffect["shotKind"] = null;
  if (bang) {
    targetIds = responseTargets ?? [resolveLogTarget(bang[2], players, previousCardCounts, previousHitPoints)?.id].filter((id): id is string => !!id);
    kind = "bullet";
  } else if (gatling || indians) {
    targetIds = responseTargets ?? players.filter((player) => player.alive && player.id !== actor?.id).map(({ id }) => id);
    kind = gatling ? "bullet" : "arrow";
  } else if (duel) {
    targetIds = responseTargets ?? [resolveLogTarget(duel[2], players, previousCardCounts, previousHitPoints)?.id].filter((id): id is string => !!id);
    kind = "aim";
  } else if (duelBang && pendingResponse?.kind === "duel") {
    targetIds = [...pendingResponse.targetIds];
    kind = "bullet";
  }
  return { actorId: actor?.id ?? null, targetId: target?.id ?? null, shotActorId: actor?.id ?? null, shotTargetIds: targetIds, shotKind: kind };
}

/** Animate confirmed card actions, including equipment that moves straight into a play zone. */
export function usePlayedCardAnimation(
  gameLog: string[],
  discardPile: Card[],
  hand: Card[],
  roomId?: string,
  players: BangPublicPlayer[] = [],
  pendingResponse: PendingResponseView | null = null,
): PlayedCardEffect | null {
  const reducedMotion = useReducedMotionPreference();
  const previous = useRef({
    logLength: gameLog.length,
    discardIds: new Set(discardPile.map((card) => card.id)),
    handCards: [...hand],
    playerCardCounts: new Map(players.map((player) => [player.id, player.cardCount])),
    playerHitPoints: new Map(players.map((player) => [player.id, player.hp])),
  });
  const [effect, setEffect] = useState<PlayedCardEffect | null>(null);
  const sequence = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const activeEffect = useRef<PlayedCardEffect | null>(null);
  const queuedEffects = useRef<PlayedCardEffect[]>([]);
  const previousRoomId = useRef(roomId);

  const activate = useRef<(next: PlayedCardEffect) => void>(() => undefined);
  activate.current = (next) => {
    const visibleEffect = reducedMotion && next.durationMs > 180
      ? { ...next, durationMs: 180 }
      : next;
    activeEffect.current = visibleEffect;
    setEffect(visibleEffect);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (activeEffect.current?.key !== visibleEffect.key) return;
      activeEffect.current = null;
      const queued = queuedEffects.current.shift();
      if (queued) activate.current(queued);
      else setEffect(null);
    }, visibleEffect.durationMs);
  };

  useLayoutEffect(() => {
    if (previousRoomId.current !== roomId) {
      previousRoomId.current = roomId;
      previous.current = {
        logLength: gameLog.length,
        discardIds: new Set(discardPile.map((card) => card.id)),
        handCards: [...hand],
        playerCardCounts: new Map(players.map((player) => [player.id, player.cardCount])),
        playerHitPoints: new Map(players.map((player) => [player.id, player.hp])),
      };
      window.clearTimeout(timer.current);
      activeEffect.current = null;
      queuedEffects.current = [];
      setEffect(null);
      return;
    }
    const old = previous.current;
    const newEntries = gameLog.slice(old.logLength);
    const newDiscards = discardPile.filter((card) => !old.discardIds.has(card.id));
    const currentHandIds = new Set(hand.map((card) => card.id));
    const removedFromHand = old.handCards.filter((card) => !currentHandIds.has(card.id));
    previous.current = {
      logLength: gameLog.length,
      discardIds: new Set(discardPile.map((card) => card.id)),
      handCards: [...hand],
      playerCardCounts: new Map(players.map((player) => [player.id, player.cardCount])),
      playerHitPoints: new Map(players.map((player) => [player.id, player.hp])),
    };

    const cardAction = /(sử dụng|dùng|uống|trang bị|rút thêm|đáp trả bằng|thách .+ đấu súng|bỏ Bang! để né Người da đỏ!|kiểm tra Thùng rượu)/i;
    const discardAction = /(bỏ \d+ lá do vượt giới hạn|bỏ hết bài trên tay|buộc .+ bỏ 1 lá)/i;
    const bulkDiscardAction = /(bỏ \d+ lá do vượt giới hạn|bỏ hết bài trên tay)/i;
    const forcedDeputyDiscardAction = /b\u1eafn nh\u1ea7m Ph\u00f3 c\u1ea3nh s\u00e1t/i;
    const actionMessage = [...newEntries].reverse().find((entry) => cardAction.test(entry) || discardAction.test(entry) || forcedDeputyDiscardAction.test(entry));
    const equipmentAction = actionMessage?.toLowerCase().includes("trang bị") === true;
    if (!actionMessage || (!newDiscards.length && !removedFromHand.length && !equipmentAction)) return;

    // Cat Balou discards its own action card first, then the target's card.
    const catBalouAction = / dùng Cat Balou buộc .+ bỏ 1 lá\.$/.test(actionMessage);
    let cards: Card[];
    let discardedCards: Card[] = [];
    if (catBalouAction) {
      const actorCard = removedFromHand[0] ?? newDiscards[0];
      const targetCard = newDiscards.find((candidate) => candidate.id !== actorCard?.id);
      cards = [actorCard, targetCard].filter((card): card is Card => !!card);
    } else {
      if (equipmentAction) discardedCards = newDiscards;
      cards = removedFromHand.length ? removedFromHand : (equipmentAction
        ? []
        : bulkDiscardAction.test(actionMessage) || forcedDeputyDiscardAction.test(actionMessage)
          ? newDiscards
          : [newDiscards[newDiscards.length - 1]].filter((card): card is Card => !!card));
    }
    const card = cards[0] ?? null;

    const key = ++sequence.current;
    const wideAttack = /sử dụng (?:Súng Gatling|Người da đỏ!)/.test(actionMessage);
    const panicTransfer = actionMessage.includes("Hoảng loạn! lấy 1 lá từ");
    const actionDuration = reducedMotion
      ? 180
      : wideAttack ? WIDE_ATTACK_ANIMATION_MS : panicTransfer ? 1100 : PLAY_ANIMATION_MS;
    const staggerDuration = reducedMotion
      ? 0
      : Math.min(Math.max(0, cards.length - 1), MAX_PLAY_CARD_STAGGER) * PLAY_CARD_STAGGER_MS;
    const durationMs = actionDuration + staggerDuration;
    const nextEffect = {
      card, cards, discardedCards, message: actionMessage, key, durationMs,
      ...shotMetadata(actionMessage, players, pendingResponse, old.playerCardCounts, old.playerHitPoints),
    };
    if (activeEffect.current) queuedEffects.current.push(nextEffect);
    else activate.current(nextEffect);
  }, [gameLog, discardPile, hand, roomId, players, pendingResponse, reducedMotion]);

  useEffect(() => () => {
    window.clearTimeout(timer.current);
    activeEffect.current = null;
    queuedEffects.current = [];
  }, []);

  useEffect(() => {
    if (!reducedMotion || !activeEffect.current) return;
    activate.current(activeEffect.current);
  }, [reducedMotion]);

  return effect;
}
