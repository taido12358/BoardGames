import { useEffect, useState } from "react";
import type { DragEvent } from "react";
import { useRef, type CSSProperties, type MutableRefObject } from "react";
import { useLayoutEffect } from "react";
import { useGameStore } from "../../platform/gameStore";
import { ConnectionBanner, DisconnectBadge, LeaveRoomButton, RoomErrorBanner } from "../../platform/RoomShell";
import PlayerSeat from "./components/PlayerSeat";
import LocalPlayerPanel from "./components/LocalPlayerPanel";
import HandFan from "./components/HandFan";
import ActionBar from "./components/ActionBar";
import GameLogPanel from "./components/GameLogPanel";
import VictoryScreen from "./components/VictoryScreen";
import CardView from "./components/CardView";
import AnimatedNumber from "../../components/AnimatedNumber";
import BangDebugPanel from "./components/BangDebugPanel";
import DistanceRing from "./components/DistanceRing";
import { useMuzzleFlashState } from "./useMuzzleFlash";
import { useDefenseFlash } from "./useDefenseFlash";
import { useDuelLossFlash } from "./useDuelLossFlash";
import { changeFlashClass, useChangeFlash } from "../useChangeFlash";
import { changedIndexClass, useChangedIndices } from "../useChangedIndices";
import { usePlayedCardAnimation } from "./usePlayedCardAnimation";
import { resolveLogPlayer } from "./resolveLogPlayer";
import { useInitialDealFlash } from "./useInitialDealFlash";
import { useReducedMotionPreference } from "../../hooks/useReducedMotionPreference";
import { useResizeRevision } from "../../hooks/useResizeRevision";
import {
  awaitingMyResponse, isMyTurn, myPlayer, CARD_DISPLAY, ROLE_ICON,
  normalizeBangViewerState, type BangMove, type BangPublicPlayer, type BangViewerState, type Card, type CardKind,
} from "./types";

interface Props {
  makeMove: (roomId: string, move: unknown) => void;
  onLeave: () => void;
  onRematch: () => void;
  rematching: boolean;
}

interface CardTransferFlight {
  fromX: number;
  fromY: number;
  midX: number;
  midY: number;
  toX: number;
  toY: number;
}
interface PublicCardDrawFlight extends CardTransferFlight { id: number; delayMs: number; playerId: string; }
interface DeckReshuffleFlight extends CardTransferFlight { id: number; delayMs: number; rotate: number; stackOffset: number; }

interface CardDropFlight { cardId: string; fromX: number; fromY: number; toX: number; toY: number; }
interface EquipmentDiscardFlight extends CardDropFlight { midX: number; midY: number; id: number; delayMs: number; }
interface CardOrigin { x: number; y: number; }

interface ShotFlight {
  targetId: string;
  kind: "bullet" | "arrow" | "aim";
  fromX: number;
  fromY: number;
  midX: number;
  midY: number;
  toX: number;
  toY: number;
  angle: number;
  delayMs: number;
}

const EMPTY_PUBLIC_PLAYERS: BangPublicPlayer[] = [];
const EMPTY_PUBLIC_GAME_LOG: string[] = [];
const EMPTY_DISCARD_PILE: Card[] = [];
// Keep in sync with .bang-card-transfer-flight (420ms delay + 600ms flight).
const CARD_TRANSFER_FLIGHT_MS = 600;
const CARD_TRANSFER_START_DELAY_MS = 420;
const CARD_TRANSFER_CLEANUP_GRACE_MS = 48;
const EQUIPMENT_DISCARD_STAGGER_MS = 45;

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
    case "generalStore":
      return []; // chọn từ store, không từ tay bài
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
  const prefersReducedMotion = useReducedMotionPreference();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [dragOverTargetId, setDragOverTargetId] = useState<string | null>(null);
  const [invalidDropTarget, setInvalidDropTarget] = useState<{ id: string; sequence: number } | null>(null);
  const invalidDropSequence = useRef(0);
  const [pendingCardId, setPendingCardId] = useState<string | null>(null);
  const [rejectedCard, setRejectedCard] = useState<{ id: string; sequence: number } | null>(null);
  const pendingCardError = useRef<string | null>(error);
  const [discardIds, setDiscardIds] = useState<string[]>([]);
  const [discarding, setDiscarding] = useState(false);
  const [endingTurn, setEndingTurn] = useState(false);
  const [responding, setResponding] = useState(false);
  const [rejectedAction, setRejectedAction] = useState<{ action: "end-turn" | "respond"; sequence: number } | null>(null);
  const rejectedActionSequence = useRef(0);
  const endingTurnError = useRef<string | null>(error);
  const respondingKey = useRef("");
  const respondingError = useRef<string | null>(error);
  const invalidDropTimer = useRef<number | undefined>(undefined);
  const boardRef = useRef<HTMLDivElement>(null);
  const layoutRevision = useResizeRevision(boardRef, !!room);
  const playedCardOrigins = useRef(new Map<string, { x: number; y: number }>());
  const activeOriginIds = useRef<string[]>([]);
  const [cardTransferFlight, setCardTransferFlight] = useState<CardTransferFlight | null>(null);
  const [publicCardDrawFlights, setPublicCardDrawFlights] = useState<PublicCardDrawFlight[]>([]);
  const publicCardDrawSequence = useRef(0);
  const publicCardDrawTimer = useRef<number | undefined>(undefined);
  const publicCardDrawExpiry = useRef(0);
  const publicCardDrawRevision = useRef(0);
  const [deckReshuffleFlights, setDeckReshuffleFlights] = useState<DeckReshuffleFlight[]>([]);
  const deckReshuffleFlightSequence = useRef(0);
  const deckReshuffleTimer = useRef<number | undefined>(undefined);
  const deckReshuffleExpiry = useRef(0);
  const deckReshuffleRevision = useRef(0);
  const [cardDropFlight, setCardDropFlight] = useState<CardDropFlight | null>(null);
  const [equipmentDiscardFlights, setEquipmentDiscardFlights] = useState<EquipmentDiscardFlight[]>([]);
  const equipmentDiscardSequence = useRef(0);
  const equipmentDiscardIds = useRef(new Map<string, number>());
  const equipmentDiscardTimer = useRef<number | undefined>(undefined);
  const equipmentDiscardRevision = useRef(0);
  const previousEquipmentDiscardRoomId = useRef(room?.id);
  const [cardActorOrigin, setCardActorOrigin] = useState<CardOrigin | null>(null);
  const [bulkDiscardTarget, setBulkDiscardTarget] = useState<CardOrigin | null>(null);
  const [equipmentTarget, setEquipmentTarget] = useState<CardOrigin | null>(null);
  const [shotFlights, setShotFlights] = useState<ShotFlight[]>([]);
  const [selectedPlayerForInfo, setSelectedPlayerForInfo] = useState<BangPublicPlayer | null>(null);
  // Hook phải gọi KHÔNG điều kiện (Rules of Hooks, xem bug ESLint 2026-09-11 ở VayBatBoard.tsx)
  // — tính state dạng optional TRƯỚC nhánh return sớm bên dưới thay vì gọi hook sau đó. Khai báo
  // lại `state` KHÔNG optional NGAY SAU nhánh return (thay vì dùng thẳng biến optional này) vì
  // TypeScript không lan truyền narrowing của "state" optional vào các closure khai báo bên dưới
  // (vd handleCardClick dùng state.pendingResponse).
  const stateOrUndefined = room?.state as BangViewerState | undefined;
  const pendingResponseKey = stateOrUndefined?.pendingResponse
    ? `${stateOrUndefined.pendingResponse.kind}|${stateOrUndefined.pendingResponse.fromPlayerId}|${stateOrUndefined.pendingResponse.targetIds.join(",")}|${stateOrUndefined.gameLog.length}|${stateOrUndefined.gameLog[stateOrUndefined.gameLog.length - 1] ?? ""}`
    : "";
  const joiningSeats = useChangedIndices(room?.seats.map((seat) => Number(seat.displayName !== null)) ?? [], 560, room?.id);
  const roomStatusChanged = useChangeFlash(room?.status, 500, room?.id);
  const discardPile = stateOrUndefined?.discardPile ?? EMPTY_DISCARD_PILE;
  const deckChanged = useChangeFlash(stateOrUndefined?.deckCount, 520, room?.id);
  const discardTopId = discardPile[discardPile.length - 1]?.id ?? "empty";
  const discardTopChanged = useChangeFlash(discardTopId, 560, room?.id);
  const muzzleFlash = useMuzzleFlashState(stateOrUndefined?.gameLog ?? [], room?.id);
  const defenseFlashes = useDefenseFlash(stateOrUndefined?.gameLog ?? [], stateOrUndefined?.players ?? EMPTY_PUBLIC_PLAYERS, room?.id);
  const duelLossFlashes = useDuelLossFlash(stateOrUndefined?.gameLog ?? [], stateOrUndefined?.players ?? EMPTY_PUBLIC_PLAYERS, room?.id);
  const statePlayers = stateOrUndefined?.players ?? EMPTY_PUBLIC_PLAYERS;
  const publicGameLog = stateOrUndefined?.gameLog ?? EMPTY_PUBLIC_GAME_LOG;
  const deckReshuffleLogSequence = publicGameLog.reduce(
    (count, entry) => count + Number(entry.includes("Nọc bài hết — xáo lại từ chồng bài bỏ.")),
    0,
  );
  const localPlayerId = stateOrUndefined?.you?.id;
  const previousPublicDrawRoomId = useRef(room?.id);
  const previousPublicCardCounts = useRef(new Map(statePlayers.map((player) => [player.id, player.cardCount])));
  const previousPublicDrawLogLength = useRef(publicGameLog.length);
  const previousPublicDiscardCount = useRef(discardPile.length);
  useLayoutEffect(() => {
    if (previousPublicDrawRoomId.current !== room?.id) {
      previousPublicDrawRoomId.current = room?.id;
      previousPublicCardCounts.current = new Map(statePlayers.map((player) => [player.id, player.cardCount]));
      previousPublicDrawLogLength.current = publicGameLog.length;
      previousPublicDiscardCount.current = discardPile.length;
      publicCardDrawExpiry.current = 0;
      deckReshuffleExpiry.current = 0;
      publicCardDrawRevision.current += 1;
      deckReshuffleRevision.current += 1;
      setPublicCardDrawFlights([]);
      setDeckReshuffleFlights([]);
      window.clearTimeout(publicCardDrawTimer.current);
      window.clearTimeout(deckReshuffleTimer.current);
      return;
    }

    const previousCounts = previousPublicCardCounts.current;
    previousPublicCardCounts.current = new Map(statePlayers.map((player) => [player.id, player.cardCount]));
    const previousDiscardCount = previousPublicDiscardCount.current;
    previousPublicDiscardCount.current = discardPile.length;
    const newLogEntries = publicGameLog.slice(previousPublicDrawLogLength.current);
    previousPublicDrawLogLength.current = publicGameLog.length;
    const isOpeningDeal = newLogEntries.some((entry) => entry.startsWith("Bắt đầu ván "));
    const reshuffledDiscard = newLogEntries.some((entry) => entry.includes("Nọc bài hết — xáo lại từ chồng bài bỏ."));
    const reshuffleCount = reshuffledDiscard ? Math.min(previousDiscardCount, 6) : 0;
    const loggedDrawAmounts = new Map<string, number>();
    for (const player of statePlayers) {
      if (statePlayers.filter((candidate) => candidate.name === player.name).length !== 1) continue;
      const prefix = `${player.name} `;
      const amount = newLogEntries.reduce((total, entry) => {
        if (!entry.startsWith(prefix)) return total;
        const match = entry.match(/rút(?: thêm| thưởng)?\s+(\d+)\s+l[aá]\b/i);
        return total + (match ? Number(match[1]) : 0);
      }, 0);
      if (amount > 0) loggedDrawAmounts.set(player.id, amount);
    }
    const gainedCards = statePlayers.flatMap((player, seatIndex) => {
      if (player.id === localPlayerId) return [];
      const previousCount = previousCounts.get(player.id);
      const countDelta = previousCount === undefined ? 0 : player.cardCount - previousCount;
      const amount = Math.max(countDelta, loggedDrawAmounts.get(player.id) ?? 0);
      return amount > 0 ? [{ player, seatIndex, amount }] : [];
    });
    if (!gainedCards.length && reshuffleCount === 0) return;

    const board = boardRef.current;
    const deck = board?.querySelector<HTMLElement>("[data-bang-deck]");
    if (!board || !deck) return;
    const boardRect = board.getBoundingClientRect();
    const centerX = boardRect.left + boardRect.width / 2;
    const centerY = boardRect.top + boardRect.height / 2;
    const deckRect = deck.getBoundingClientRect();
    const fromX = deckRect.left + deckRect.width / 2 - centerX;
    const fromY = deckRect.top + deckRect.height / 2 - centerY;
    const discardArea = board.querySelector<HTMLElement>("[data-bang-discard-area]");
    const discardRect = discardArea?.getBoundingClientRect();
    const discardX = discardRect ? discardRect.left + discardRect.width / 2 - centerX : fromX;
    const discardY = discardRect ? discardRect.top + discardRect.height / 2 - centerY : fromY;
    const playerNodes = [...board.querySelectorAll<HTMLElement>("[data-player-id]")];
    const drawStartDelay = reshuffledDiscard && !prefersReducedMotion ? 420 : 0;
    const flights = gainedCards.flatMap(({ player, seatIndex, amount }) => {
      const target = playerNodes.find((node) => node.dataset.playerId === player.id);
      if (!target) return [];
      const targetRect = target.getBoundingClientRect();
      const toX = targetRect.left + targetRect.width / 2 - centerX;
      const toY = targetRect.top + targetRect.height / 2 - centerY;
      const dx = toX - fromX;
      const dy = toY - fromY;
      return Array.from({ length: amount }, (_, cardIndex) => ({
        id: ++publicCardDrawSequence.current,
        playerId: player.id,
        fromX, fromY, toX, toY,
        midX: fromX + dx * 0.52,
        midY: fromY + dy * 0.52 - 18,
        delayMs: prefersReducedMotion ? 0 : isOpeningDeal
          ? cardIndex * statePlayers.length * 36 + seatIndex * 36
          : drawStartDelay + seatIndex * 48 + cardIndex * 36,
      }));
    });
    if (flights.length) {
      setPublicCardDrawFlights((current) => [...current, ...flights]);
      const latestDelay = Math.max(...flights.map(({ delayMs }) => delayMs));
      publicCardDrawExpiry.current = Math.max(
        publicCardDrawExpiry.current,
        performance.now() + (prefersReducedMotion
          ? 180
          : latestDelay + CARD_TRANSFER_START_DELAY_MS + CARD_TRANSFER_FLIGHT_MS + CARD_TRANSFER_CLEANUP_GRACE_MS),
      );
      const revision = ++publicCardDrawRevision.current;
      window.clearTimeout(publicCardDrawTimer.current);
      publicCardDrawTimer.current = window.setTimeout(() => {
        if (publicCardDrawRevision.current !== revision) return;
        const remaining = publicCardDrawExpiry.current - performance.now();
        if (remaining > 0) {
          publicCardDrawTimer.current = window.setTimeout(() => {
            if (publicCardDrawRevision.current !== revision) return;
            setPublicCardDrawFlights([]);
            publicCardDrawExpiry.current = 0;
          }, remaining);
        } else {
          setPublicCardDrawFlights([]);
          publicCardDrawExpiry.current = 0;
        }
      }, Math.max(0, publicCardDrawExpiry.current - performance.now()));
    }
    if (reshuffleCount > 0) {
      const dx = fromX - discardX;
      const dy = fromY - discardY;
      const shuffleFlights = Array.from({ length: reshuffleCount }, (_, index) => ({
        id: ++deckReshuffleFlightSequence.current,
        stackOffset: index - (reshuffleCount - 1) / 2,
        fromX: discardX + (index - (reshuffleCount - 1) / 2) * 2.5,
        fromY: discardY + Math.abs(index - (reshuffleCount - 1) / 2) * 1.5,
        midX: discardX + dx * 0.52 + (index - (reshuffleCount - 1) / 2) * 8,
        midY: discardY + dy * 0.48 - 32 - Math.abs(index - (reshuffleCount - 1) / 2) * 2,
        toX: fromX + (index - (reshuffleCount - 1) / 2) * 2,
        toY: fromY + Math.abs(index - (reshuffleCount - 1) / 2) * 1.5,
        delayMs: prefersReducedMotion ? 0 : index * 32,
        rotate: (index - (reshuffleCount - 1) / 2) * 13,
      }));
      setDeckReshuffleFlights((current) => [...current, ...shuffleFlights]);
      const latestDelay = Math.max(...shuffleFlights.map(({ delayMs }) => delayMs));
      deckReshuffleExpiry.current = Math.max(
        deckReshuffleExpiry.current,
          performance.now() + (prefersReducedMotion ? 180 : latestDelay + 560),
      );
      const revision = ++deckReshuffleRevision.current;
      window.clearTimeout(deckReshuffleTimer.current);
      deckReshuffleTimer.current = window.setTimeout(() => {
        if (deckReshuffleRevision.current !== revision) return;
        const remaining = deckReshuffleExpiry.current - performance.now();
        if (remaining > 0) {
          deckReshuffleTimer.current = window.setTimeout(() => {
            if (deckReshuffleRevision.current !== revision) return;
            setDeckReshuffleFlights([]);
            deckReshuffleExpiry.current = 0;
          }, remaining);
        } else {
          setDeckReshuffleFlights([]);
          deckReshuffleExpiry.current = 0;
        }
      }, Math.max(0, deckReshuffleExpiry.current - performance.now()));
    }
  }, [room?.id, statePlayers, publicGameLog, localPlayerId, discardPile, prefersReducedMotion]);
  useLayoutEffect(() => {
    if (!publicCardDrawFlights.length && !deckReshuffleFlights.length) return;
    const board = boardRef.current;
    const deck = board?.querySelector<HTMLElement>("[data-bang-deck]");
    if (!board || !deck) return;
    const boardRect = board.getBoundingClientRect();
    const centerX = boardRect.left + boardRect.width / 2;
    const centerY = boardRect.top + boardRect.height / 2;
    const deckRect = deck.getBoundingClientRect();
    const deckX = deckRect.left + deckRect.width / 2 - centerX;
    const deckY = deckRect.top + deckRect.height / 2 - centerY;
    const playerNodes = [...board.querySelectorAll<HTMLElement>("[data-player-id]")];
    if (publicCardDrawFlights.length) {
      const drawFromX = deckX;
      const drawFromY = deckY;
      setPublicCardDrawFlights((current) => current.map((flight) => {
        const target = playerNodes.find((node) => node.dataset.playerId === flight.playerId);
        if (!target) return flight;
        const targetRect = target.getBoundingClientRect();
        const toX = targetRect.left + targetRect.width / 2 - centerX;
        const toY = targetRect.top + targetRect.height / 2 - centerY;
        const dx = toX - drawFromX;
        const dy = toY - drawFromY;
        return {
          ...flight,
          fromX: drawFromX,
          fromY: drawFromY,
          toX,
          toY,
          midX: drawFromX + dx * 0.52,
          midY: drawFromY + dy * 0.52 - 18,
        };
      }));
    }
    if (deckReshuffleFlights.length) {
      const discard = board.querySelector<HTMLElement>("[data-bang-discard-area]");
      if (!discard) return;
      const discardRect = discard.getBoundingClientRect();
      const discardX = discardRect.left + discardRect.width / 2 - centerX;
      const discardY = discardRect.top + discardRect.height / 2 - centerY;
      const dx = deckX - discardX;
      const dy = deckY - discardY;
      setDeckReshuffleFlights((current) => current.map((flight) => ({
        ...flight,
        fromX: discardX + flight.stackOffset * 2.5,
        fromY: discardY + Math.abs(flight.stackOffset) * 1.5,
        midX: discardX + dx * 0.52 + flight.stackOffset * 8,
        midY: discardY + dy * 0.48 - 32 - Math.abs(flight.stackOffset) * 2,
        toX: deckX + flight.stackOffset * 2,
        toY: deckY + Math.abs(flight.stackOffset) * 1.5,
      })));
    }
  }, [layoutRevision, publicCardDrawFlights.length, deckReshuffleFlights.length]);
  useEffect(() => () => {
    publicCardDrawRevision.current += 1;
    deckReshuffleRevision.current += 1;
    equipmentDiscardRevision.current += 1;
    invalidDropSequence.current += 1;
    window.clearTimeout(publicCardDrawTimer.current);
    window.clearTimeout(deckReshuffleTimer.current);
    window.clearTimeout(equipmentDiscardTimer.current);
    window.clearTimeout(invalidDropTimer.current);
  }, []);
  useEffect(() => {
    if (!prefersReducedMotion) return;
    const now = performance.now();
    const shortenFlights = <T,>(flights: T[], expiry: MutableRefObject<number>, timer: MutableRefObject<number | undefined>, revision: MutableRefObject<number>, clear: () => void) => {
      if (!flights.length) return;
      const reducedExpiry = now + 180;
      expiry.current = Math.min(expiry.current || reducedExpiry, reducedExpiry);
      const activeRevision = ++revision.current;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        if (revision.current !== activeRevision) return;
        clear();
        expiry.current = 0;
      }, Math.max(0, expiry.current - performance.now()));
    };
    shortenFlights(publicCardDrawFlights, publicCardDrawExpiry, publicCardDrawTimer, publicCardDrawRevision, () => setPublicCardDrawFlights([]));
    shortenFlights(deckReshuffleFlights, deckReshuffleExpiry, deckReshuffleTimer, deckReshuffleRevision, () => setDeckReshuffleFlights([]));
    if (equipmentDiscardFlights.length) {
      const activeRevision = ++equipmentDiscardRevision.current;
      window.clearTimeout(equipmentDiscardTimer.current);
      equipmentDiscardTimer.current = window.setTimeout(() => {
        if (equipmentDiscardRevision.current === activeRevision) setEquipmentDiscardFlights([]);
      }, 180);
    }
  }, [prefersReducedMotion, publicCardDrawFlights, deckReshuffleFlights, equipmentDiscardFlights.length]);
  useEffect(() => {
    if (!prefersReducedMotion || !invalidDropTarget) return;
    const activeSequence = invalidDropTarget.sequence;
    window.clearTimeout(invalidDropTimer.current);
    invalidDropTimer.current = window.setTimeout(() => {
      if (invalidDropSequence.current === activeSequence) setInvalidDropTarget(null);
    }, 180);
  }, [prefersReducedMotion, invalidDropTarget]);
  const pendingResponse = stateOrUndefined?.pendingResponse ?? null;
  const playedCardEffect = usePlayedCardAnimation(
    stateOrUndefined?.gameLog ?? [],
    stateOrUndefined?.discardPile ?? [],
    stateOrUndefined?.you?.hand ?? [],
    room?.id,
    statePlayers,
    pendingResponse,
  );
  const equipmentTransferMatch = playedCardEffect?.message.match(/^(.+?) trang bị (.+?)(?: \(tầm bắn \d+\))?\.$/) ?? null;
  const equipmentTransferOwnerId = equipmentTransferMatch ? playedCardEffect?.actorId ?? null : null;
  const equipmentTransferItemName = equipmentTransferMatch?.[2] ?? null;
  const shotActorId = playedCardEffect?.shotActorId ?? null;
  const shotTargetIds = playedCardEffect?.shotTargetIds ?? [];
  const shotTargetKey = shotTargetIds.join(",");
  const shotKind = playedCardEffect?.shotKind ?? "bullet";
  const isForcedDeputyDiscardEffect = /b\u1eafn nh\u1ea7m Ph\u00f3 c\u1ea3nh s\u00e1t/i.test(playedCardEffect?.message ?? "");
  const isBulkDiscardEffect = isForcedDeputyDiscardEffect || /bỏ \d+ lá do vượt giới hạn|bỏ hết bài trên tay/i.test(playedCardEffect?.message ?? "");
  const isEquipmentEffect = !!equipmentTransferMatch && !!equipmentTarget;
  useLayoutEffect(() => {
    const board = boardRef.current;
    if (!board || !shotActorId || !shotTargetKey || !playedCardEffect?.cards.length) {
      setShotFlights([]);
      return;
    }
    const targetIds = shotTargetKey.split(",");
    const playerNodes = [...board.querySelectorAll<HTMLElement>("[data-player-id]")];
    const source = playerNodes.find((node) => node.dataset.playerId === shotActorId);
    if (!source) {
      setShotFlights([]);
      return;
    }
    const boardRect = board.getBoundingClientRect();
    const centerX = boardRect.left + boardRect.width / 2;
    const centerY = boardRect.top + boardRect.height / 2;
    const sourceRect = source.getBoundingClientRect();
    const fromX = sourceRect.left + sourceRect.width / 2 - centerX;
    const fromY = sourceRect.top + sourceRect.height / 2 - centerY;
    const flights = targetIds.flatMap((targetId, index) => {
      const target = playerNodes.find((node) => node.dataset.playerId === targetId);
      if (!target) return [];
      const targetRect = target.getBoundingClientRect();
      const toX = targetRect.left + targetRect.width / 2 - centerX;
      const toY = targetRect.top + targetRect.height / 2 - centerY;
      const dx = toX - fromX;
      const dy = toY - fromY;
      return [{
        targetId, kind: shotKind, fromX, fromY, toX, toY,
        midX: fromX + dx * 0.52,
        midY: fromY + dy * 0.52 - 12,
        angle: Math.atan2(dy, dx) * 180 / Math.PI,
        delayMs: index * 65,
      }];
    });
    setShotFlights(flights);
  }, [playedCardEffect?.key, playedCardEffect?.cards.length, room?.id, shotActorId, shotTargetKey, shotKind, layoutRevision]);
  const defenseFlashKeys = new Map(defenseFlashes.map(({ playerId, key }) => [playerId, key]));
  const duelLossKeys = new Map(duelLossFlashes.map(({ playerId, key }) => [playerId, key]));
  const effectActorId = playedCardEffect?.actorId ?? null;
  useLayoutEffect(() => {
    const board = boardRef.current;
    const isBarrelCheck = playedCardEffect?.message.includes("kiểm tra Thùng rượu") === true;
    const isBulkDiscard = /bỏ \d+ lá do vượt giới hạn|bỏ hết bài trên tay/i.test(playedCardEffect?.message ?? "");
    const actor = board && !isBarrelCheck && effectActorId
      ? [...board.querySelectorAll<HTMLElement>("[data-player-id]")].find((node) => node.dataset.playerId === effectActorId)
      : null;
    const source = isBarrelCheck
      ? board?.querySelector<HTMLElement>("[data-bang-deck]") ?? null
      : actor;
    if (!board || !source) {
      setCardActorOrigin(null);
      setBulkDiscardTarget(null);
      setEquipmentTarget(null);
      return;
    }
    const boardRect = board.getBoundingClientRect();
    const actorRect = source.getBoundingClientRect();
    setCardActorOrigin({
      x: actorRect.left + actorRect.width / 2 - boardRect.left - boardRect.width / 2,
      y: actorRect.top + actorRect.height / 2 - boardRect.top - boardRect.height / 2,
    });
    const discard = isBulkDiscard ? board.querySelector<HTMLElement>("[data-bang-discard]") : null;
    if (discard) {
      const discardRect = discard.getBoundingClientRect();
      setBulkDiscardTarget({
        x: discardRect.left + discardRect.width / 2 - boardRect.left - boardRect.width / 2,
        y: discardRect.top + discardRect.height / 2 - boardRect.top - boardRect.height / 2,
      });
    } else {
      setBulkDiscardTarget(null);
    }
    const equipmentNode = equipmentTransferOwnerId && equipmentTransferItemName
      ? [...board.querySelectorAll<HTMLElement>("[data-bang-equipment-owner][data-bang-equipment-name]")]
        .find((node) => node.dataset.bangEquipmentOwner === equipmentTransferOwnerId
          && node.dataset.bangEquipmentName === equipmentTransferItemName)
      : null;
    if (equipmentNode) {
      const equipmentRect = equipmentNode.getBoundingClientRect();
      setEquipmentTarget({
        x: equipmentRect.left + equipmentRect.width / 2 - boardRect.left - boardRect.width / 2,
        y: equipmentRect.top + equipmentRect.height / 2 - boardRect.top - boardRect.height / 2,
      });
    } else {
      setEquipmentTarget(null);
    }
  }, [playedCardEffect?.key, playedCardEffect?.message, room?.id, effectActorId, isBulkDiscardEffect, equipmentTransferOwnerId, equipmentTransferItemName, layoutRevision]);
  const panicTransfer = /Ho\u1ea3ng lo\u1ea1n! l\u1ea5y 1 l\u00e1 t\u1eeb /.test(playedCardEffect?.message ?? "");
  const transferSourcePlayerId = panicTransfer ? playedCardEffect?.targetId ?? null : null;
  const transferTargetPlayerId = panicTransfer ? playedCardEffect?.actorId ?? null : null;
  useLayoutEffect(() => {
    const board = boardRef.current;
    if (!board || !transferSourcePlayerId || !transferTargetPlayerId || !playedCardEffect?.cards.length) {
      setCardTransferFlight(null);
      return;
    }
    const playerNodes = [...board.querySelectorAll<HTMLElement>("[data-player-id]")];
    const source = playerNodes.find((node) => node.dataset.playerId === transferSourcePlayerId);
    const target = playerNodes.find((node) => node.dataset.playerId === transferTargetPlayerId);
    if (!source || !target) {
      setCardTransferFlight(null);
      return;
    }
    const boardRect = board.getBoundingClientRect();
    const centerX = boardRect.left + boardRect.width / 2;
    const centerY = boardRect.top + boardRect.height / 2;
    const sourceRect = source.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const fromX = sourceRect.left + sourceRect.width / 2 - centerX;
    const fromY = sourceRect.top + sourceRect.height / 2 - centerY;
    const toX = targetRect.left + targetRect.width / 2 - centerX;
    const toY = targetRect.top + targetRect.height / 2 - centerY;
    const dx = toX - fromX;
    const dy = toY - fromY;
    setCardTransferFlight({ fromX, fromY, toX, toY, midX: fromX + dx * 0.58, midY: fromY + dy * 0.58 - 18 });
  }, [playedCardEffect?.key, playedCardEffect?.cards.length, room?.id, transferSourcePlayerId, transferTargetPlayerId, layoutRevision]);
  const catBalouTargetId = /Cat Balou bu\u1ed9c /.test(playedCardEffect?.message ?? "")
    ? playedCardEffect?.targetId ?? null
    : null;
  const discardedTargetCardId = playedCardEffect?.cards[1]?.id;
  useLayoutEffect(() => {
    const board = boardRef.current;
    if (!board || !catBalouTargetId || !discardedTargetCardId) {
      setCardDropFlight(null);
      return;
    }
    const target = [...board.querySelectorAll<HTMLElement>("[data-player-id]")]
      .find((node) => node.dataset.playerId === catBalouTargetId);
    const discard = board.querySelector<HTMLElement>("[data-bang-discard]");
    if (!target || !discard) {
      setCardDropFlight(null);
      return;
    }
    const boardRect = board.getBoundingClientRect();
    const centerX = boardRect.left + boardRect.width / 2;
    const centerY = boardRect.top + boardRect.height / 2;
    const sourceRect = target.getBoundingClientRect();
    const targetRect = discard.getBoundingClientRect();
    setCardDropFlight({
      cardId: discardedTargetCardId,
      fromX: sourceRect.left + sourceRect.width / 2 - centerX,
      fromY: sourceRect.top + sourceRect.height / 2 - centerY,
      toX: targetRect.left + targetRect.width / 2 - centerX,
      toY: targetRect.top + targetRect.height / 2 - centerY,
    });
  }, [playedCardEffect?.key, discardedTargetCardId, room?.id, catBalouTargetId, layoutRevision]);
  useLayoutEffect(() => {
    if (previousEquipmentDiscardRoomId.current !== room?.id) {
      previousEquipmentDiscardRoomId.current = room?.id;
      equipmentDiscardRevision.current += 1;
      window.clearTimeout(equipmentDiscardTimer.current);
      equipmentDiscardIds.current.clear();
      setEquipmentDiscardFlights([]);
      return;
    }
    const board = boardRef.current;
    const cards = playedCardEffect?.discardedCards ?? [];
    const discard = board?.querySelector<HTMLElement>("[data-bang-discard-area]");
    const actor = board && effectActorId
      ? [...board.querySelectorAll<HTMLElement>("[data-player-id]")].find((node) => node.dataset.playerId === effectActorId)
      : null;
    if (!board || !discard || !actor || !equipmentTransferOwnerId || !equipmentTransferItemName || !cards.length) {
      equipmentDiscardRevision.current += 1;
      window.clearTimeout(equipmentDiscardTimer.current);
      equipmentDiscardIds.current.clear();
      setEquipmentDiscardFlights([]);
      return;
    }
    const boardRect = board.getBoundingClientRect();
    const centerX = boardRect.left + boardRect.width / 2;
    const centerY = boardRect.top + boardRect.height / 2;
    const discardRect = discard.getBoundingClientRect();
    const toX = discardRect.left + discardRect.width / 2 - centerX;
    const toY = discardRect.top + discardRect.height / 2 - centerY;
    const flights = cards.map((card, index) => {
      const oldItemName = CARD_DISPLAY[card.kind].name;
      const itemSlot = [...actor.querySelectorAll<HTMLElement>("[data-bang-equipment-owner][data-bang-equipment-name]")]
        .find((node) => node.dataset.bangEquipmentOwner === equipmentTransferOwnerId
          && node.dataset.bangEquipmentName === oldItemName);
      const sourceRect = (itemSlot ?? actor).getBoundingClientRect();
      const fromX = sourceRect.left + sourceRect.width / 2 - centerX;
      const fromY = sourceRect.top + sourceRect.height / 2 - centerY;
      const dx = toX - fromX;
      const dy = toY - fromY;
      const id = equipmentDiscardIds.current.get(card.id) ?? ++equipmentDiscardSequence.current;
      equipmentDiscardIds.current.set(card.id, id);
      return {
        cardId: card.id,
        fromX, fromY, toX, toY,
        midX: fromX + dx * 0.54,
        midY: fromY + dy * 0.54 - 20,
        id,
        delayMs: index * EQUIPMENT_DISCARD_STAGGER_MS,
      };
    });
    setEquipmentDiscardFlights(flights);
    window.clearTimeout(equipmentDiscardTimer.current);
    const latestStaggerMs = Math.max(0, cards.length - 1) * EQUIPMENT_DISCARD_STAGGER_MS;
    const flightLifetimeMs = prefersReducedMotion
      ? 180
      : CARD_TRANSFER_START_DELAY_MS + CARD_TRANSFER_FLIGHT_MS + latestStaggerMs + CARD_TRANSFER_CLEANUP_GRACE_MS;
    const revision = ++equipmentDiscardRevision.current;
    equipmentDiscardTimer.current = window.setTimeout(() => {
      if (equipmentDiscardRevision.current === revision) setEquipmentDiscardFlights([]);
    }, flightLifetimeMs);
  }, [room?.id, playedCardEffect?.key, playedCardEffect?.discardedCards, effectActorId, equipmentTransferOwnerId, equipmentTransferItemName, prefersReducedMotion, layoutRevision]);
  const dealAnimation = useInitialDealFlash(
    !!room && room.status === "Playing" && stateOrUndefined?.phase === "action",
    room?.id,
  );

  // Lựa chọn chỉ có hiệu lực trong đúng lượt/giai đoạn hiện tại, kể cả khi server
  // tự chuyển lượt vì mất kết nối hoặc người chơi chuyển sang phòng chơi lại.
  useLayoutEffect(() => {
    setSelectedCardId(null);
    setDraggingCardId(null);
    setDragOverTargetId(null);
    setInvalidDropTarget(null);
    invalidDropSequence.current += 1;
    window.clearTimeout(invalidDropTimer.current);
    setPendingCardId(null);
    setRejectedCard(null);
    setDiscardIds([]);
    setDiscarding(false);
    setEndingTurn(false);
    setResponding(false);
    setRejectedAction(null);
  }, [room?.id, stateOrUndefined?.turnNumber, stateOrUndefined?.phase, stateOrUndefined?.currentPlayerId]);
  useEffect(() => {
    if (!endingTurn) return;
    const timer = window.setTimeout(() => setEndingTurn(false), 2400);
    return () => window.clearTimeout(timer);
  }, [endingTurn]);
  useLayoutEffect(() => {
    if (endingTurn && error !== endingTurnError.current) {
      setEndingTurn(false);
      setRejectedAction({ action: "end-turn", sequence: ++rejectedActionSequence.current });
    }
  }, [endingTurn, error]);
  useLayoutEffect(() => {
    if (!responding) return;
    if (error !== respondingError.current) {
      setResponding(false);
      setRejectedAction({ action: "respond", sequence: ++rejectedActionSequence.current });
      return;
    }
    if (pendingResponseKey !== respondingKey.current || !stateOrUndefined?.pendingResponse?.itsYourTurn) {
      setResponding(false);
    }
  }, [responding, pendingResponseKey, stateOrUndefined?.pendingResponse?.itsYourTurn, error]);
  useEffect(() => {
    if (!responding) return;
    const timer = window.setTimeout(() => setResponding(false), 2400);
    return () => window.clearTimeout(timer);
  }, [responding]);
  useLayoutEffect(() => {
    if (!pendingCardId) return;
    if (error !== pendingCardError.current) {
      setRejectedCard((current) => ({ id: pendingCardId, sequence: (current?.sequence ?? 0) + 1 }));
      setPendingCardId(null);
      return;
    }
    if (!stateOrUndefined?.you?.hand.some((card) => card.id === pendingCardId)) {
      setPendingCardId(null);
      return;
    }
    const timer = window.setTimeout(() => {
      setPendingCardId(null);
      if (connectionState === "connected" && stateOrUndefined?.you?.hand.some((card) => card.id === pendingCardId)) {
        setRejectedCard((current) => ({ id: pendingCardId, sequence: (current?.sequence ?? 0) + 1 }));
      }
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [pendingCardId, stateOrUndefined?.you?.hand, error, connectionState]);
  useEffect(() => {
    if (!rejectedCard) return;
    const timer = window.setTimeout(() => setRejectedCard(null), prefersReducedMotion ? 180 : 560);
    return () => window.clearTimeout(timer);
  }, [rejectedCard, prefersReducedMotion]);
  useEffect(() => {
    if (!rejectedAction) return;
    const timer = window.setTimeout(() => setRejectedAction(null), prefersReducedMotion ? 180 : 560);
    return () => window.clearTimeout(timer);
  }, [rejectedAction, prefersReducedMotion]);
  useEffect(() => { playedCardOrigins.current.clear(); activeOriginIds.current = []; }, [room?.id]);
  useEffect(() => {
    if (!playedCardEffect) return;
    activeOriginIds.current.forEach((id) => playedCardOrigins.current.delete(id));
    const ids = playedCardEffect.cards.map((card) => card.id);
    activeOriginIds.current = ids;
    const timer = window.setTimeout(() => {
      ids.forEach((id) => playedCardOrigins.current.delete(id));
      if (activeOriginIds.current === ids) activeOriginIds.current = [];
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [playedCardEffect]);

  if (!room || !stateOrUndefined) return null;
  const state = normalizeBangViewerState(room.state as BangViewerState);

  if (state.phase === "waitingForPlayers" || room.status === "Waiting") {
    const joined = room.seats.filter((s) => s.displayName !== null).length;
    return (
      <div className={`animate-board-enter flex flex-col gap-3 w-full max-w-md mx-auto ${changeFlashClass(roomStatusChanged, "animate-board-enter")}`}>
        <ConnectionBanner connectionState={connectionState} />
        <div className="relative overflow-hidden rounded-sm border border-amber-500/20 bg-[#1a1208]/80 p-1 shadow-2xl">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
          <div className="rounded-sm border border-amber-500/30 bg-gradient-to-b from-[#2b2013] to-[#1a1208] p-6 text-center">
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

            <p className="text-[#d4b996]/80 text-sm mb-3">
              <span className="font-bold text-[#e8c07e]">{joined}</span>
              <span className="text-amber-400/50">/{room.seatCount}</span>
              {" "}người chơi
            </p>

            <div className="grid grid-cols-2 gap-2 mb-2">
              {room.seats.map((seat, i) => (
                seat.displayName ? (
                  <div key={i} className={`relative overflow-hidden flex flex-col items-center rounded-sm border border-amber-600/50 bg-gradient-to-b from-[#251810] to-[#140d08] p-2.5 shadow-[0_4px_12px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(245,158,11,0.25)] ${changedIndexClass(joiningSeats, i, "animate-seat-arrive")}`} style={{ animationDelay: `${i * 55}ms` }}>
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
                    <div className="h-10 w-10 rounded-full border-2 border-amber-500/80 bg-amber-950/60 flex items-center justify-center text-lg shadow-[0_0_10px_rgba(245,158,11,0.3)]">🤠</div>
                    <span className="mt-1.5 text-[11px] font-bold text-[#f5d09d] truncate max-w-full [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]">{seat.displayName}</span>
                    <span className="text-[9px] uppercase tracking-wider text-amber-600/80">Sẵn sàng</span>
                  </div>
                ) : (
                  <div key={i} className={`flex flex-col items-center justify-center rounded-sm border-2 border-dashed border-amber-950/70 bg-[#0d0805]/70 p-2.5 shadow-[inset_0_3px_8px_rgba(0,0,0,0.9)] transition-colors hover:border-amber-800/50 ${changedIndexClass(joiningSeats, i, "animate-seat-vacate")}`}>
                    <div className="h-10 w-10 rounded-full border border-dashed border-amber-900/50 bg-black/40 flex items-center justify-center text-amber-900/60 text-xl font-light">+</div>
                    <span className="mt-1.5 text-[11px] italic text-amber-900/70">Ghế trống</span>
                  </div>
                )
              ))}
            </div>
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
  const publicEquipmentMatch = playedCardEffect?.message.match(/^(.+?) trang bị (.+?)(?: \(tầm bắn \d+\))?\.$/);
  const publicEquipmentKind = publicEquipmentMatch
    ? Object.entries(CARD_DISPLAY).find(([, display]) => display.name === publicEquipmentMatch[2])?.[0] as CardKind | undefined
    : undefined;
  const equipmentOwner = publicEquipmentMatch
    ? state.players.find((player) => player.id === playedCardEffect?.actorId)
    : undefined;
  const publicEquipmentIsVisible = !!publicEquipmentMatch && !!equipmentOwner
    && (equipmentOwner.weapon === publicEquipmentMatch[2] || equipmentOwner.equipment.includes(publicEquipmentMatch[2]));
  const publicEquipmentCard: Card | null = !playedCardEffect?.cards.length && publicEquipmentKind && publicEquipmentIsVisible
    ? { id: `public-equipment-${playedCardEffect?.key}`, kind: publicEquipmentKind, rank: "", suit: "" }
    : null;
  const effectCards = playedCardEffect?.cards.length
    ? playedCardEffect.cards
    : publicEquipmentCard ? [publicEquipmentCard] : [];
  const panicLogPrefix = me ? `${me.name} dùng Hoảng loạn! lấy 1 lá từ ` : null;
  const latestGameLog = state.gameLog[state.gameLog.length - 1] ?? "";
  const panicTargetName = panicLogPrefix && latestGameLog.startsWith(panicLogPrefix)
    ? latestGameLog.slice(panicLogPrefix.length).replace(/\.$/, "")
    : null;
  const incomingSourcePlayerId = previousPublicDrawRoomId.current === room.id && panicTargetName
    ? resolveLogPlayer(panicTargetName, state.players, previousPublicCardCounts.current)?.id ?? null
    : null;
  const myTurn = isMyTurn(state);
  const awaitingResp = awaitingMyResponse(state);
  const isCalamity = me?.character === "Calamity";
  const isSpectator = me === null;
  const turnStatus = state.phase === "finished"
    ? "VÁN ĐẤU KẾT THÚC"
    : state.phase === "awaitingResponse"
      ? awaitingResp
        ? "⚠️ ĐẾN LƯỢT BẠN PHẢN HỒI"
        : `⏳ Đang chờ ${state.pendingResponse?.targetIds.map((id) => state.players.find((p) => p.id === id)?.name ?? "người chơi").join(", ") || "đối thủ"} phản hồi`
      : myTurn
        ? "⚡ ĐẾN LƯỢT BẠN"
        : `${state.players.find((p) => p.id === state.currentPlayerId)?.name ?? "…"} đang đi`;

  const selectedCard = you?.hand.find((c) => c.id === selectedCardId) ?? null;
  const draggedCard = you?.hand.find((card) => card.id === draggingCardId) ?? null;
  const selectingTarget = !!selectedCard && myTurn && needsTarget(selectedCard.kind, isCalamity);
  const discardOverflow = me && you ? Math.max(0, you.hand.length - me.hp) : 0;
  const blockedHandSummary = myTurn && you && you.hand.length > 0
    ? [...new Set(you.hand
      .filter((card) => !canPlayCard(card))
      .map((card) => `${CARD_DISPLAY[card.kind].name}: ${cardBlockedReason(card) ?? "chưa dùng được"}`))]
    : [];

  const send = (move: BangMove) => makeMove(room.id, move);

  function markResponsePending() {
    respondingKey.current = pendingResponseKey;
    respondingError.current = error;
    setRejectedAction(null);
    setResponding(true);
  }

  function handleRespondPass() {
    if (!awaitingResp || responding) return;
    markResponsePending();
    send({ type: "RESPOND" });
  }

  function rememberCardOrigin(card: Card) {
    rememberCardOriginById(card.id);
  }

  function rememberCardOriginById(cardId: string) {
    const board = boardRef.current;
    if (!board) return;
    const cardNode = [...board.querySelectorAll<HTMLElement>(".bang-hand-card [data-card-id]")]
      .find((node) => node.dataset.cardId === cardId);
    if (!cardNode) return;
    const boardRect = board.getBoundingClientRect();
    const cardRect = cardNode.getBoundingClientRect();
    playedCardOrigins.current.set(cardId, {
      x: cardRect.left + cardRect.width / 2 - (boardRect.left + boardRect.width / 2),
      y: cardRect.top + cardRect.height / 2 - (boardRect.top + boardRect.height / 2),
    });
  }

  function cardBlockedReason(card: Card): string | undefined {
    if (!me?.alive) return "Bạn đã bị loại.";
    if (connectionState !== "connected") return "Đang kết nối lại máy chủ.";
    if (pendingCardId) return "Đang chờ máy chủ xác nhận lá bài.";
    if (responding) return "Đang gửi phản hồi.";
    if (discarding) {
      if (discardIds.includes(card.id) || discardIds.length < discardOverflow) return undefined;
      return "Đã chọn đủ số lá cần bỏ.";
    }
    if (awaitingResp && state.pendingResponse) {
      return allowedResponseKinds(state.pendingResponse.kind, isCalamity).includes(card.kind)
        ? undefined
        : "Lá này không dùng được để phản hồi.";
    }
    if (!myTurn) return "Chưa đến lượt bạn.";
    if (!playableInActionPhase(card.kind, isCalamity)) return "Trượt! chỉ dùng khi phản hồi, trừ nhân vật Calamity.";
    if (you?.canFire === false && (card.kind === "bang" || card.kind === "gatling" || (card.kind === "missed" && isCalamity)))
      return "Bạn đã dùng lượt bắn này.";
    if (card.kind === "beer" && me.hp >= me.maxHp) return "Máu của bạn đang đầy.";
    if (needsTarget(card.kind, isCalamity) && !state.players.some((p) => isValidTarget(card.kind, p, p.id === me.id)))
      return "Không có mục tiêu hợp lệ.";
    return undefined;
  }

  function canPlayCard(card: Card): boolean {
    return cardBlockedReason(card) === undefined;
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
        if (selectedCardId === card.id) {
          playedCardOrigins.current.delete(card.id);
          setSelectedCardId(null);
        } else {
          if (selectedCardId) playedCardOrigins.current.delete(selectedCardId);
          rememberCardOrigin(card);
          setSelectedCardId(card.id);
        }
      } else {
        rememberCardOrigin(card);
        pendingCardError.current = error;
        setRejectedCard(null);
        setPendingCardId(card.id);
        send({ type: "PLAY_CARD", cardId: card.id });
        setSelectedCardId(null);
      }
      return;
    }
    if (awaitingResp) {
      const allowed = allowedResponseKinds(state.pendingResponse!.kind, isCalamity);
      if (!allowed.includes(card.kind)) return;
      rememberCardOrigin(card);
      pendingCardError.current = error;
      setRejectedCard(null);
      setPendingCardId(card.id);
      markResponsePending();
      send({ type: "RESPOND", cardId: card.id });
    }
  }

  function handleEndTurnClick() {
    if (pendingCardId || responding || endingTurn) return;
    if (discardOverflow > 0) {
      setDiscardIds([]);
      setDiscarding(true);
      return;
    }
    endingTurnError.current = error;
    setRejectedAction(null);
    setEndingTurn(true);
    send({ type: "END_TURN" });
  }

  function handleConfirmDiscard() {
    if (!myTurn || discardIds.length !== discardOverflow || !discardIds.every((id) => you?.hand.some((c) => c.id === id))) return;
    discardIds.forEach(rememberCardOriginById);
    endingTurnError.current = error;
    setRejectedAction(null);
    setEndingTurn(true);
    send({ type: "END_TURN", discardCardIds: discardIds });
    setDiscarding(false);
    setDiscardIds([]);
  }

  function handleCancelDiscard() {
    setDiscarding(false);
    setDiscardIds([]);
  }

  function handleSeatClick(target: BangPublicPlayer) {
    handleSeatDrop(target, selectedCard);
  }

  function handleSeatDrop(target: BangPublicPlayer, card: Card | null) {
    if (!card || !myTurn || !canPlayCard(card) || !isValidTarget(card.kind, target, target.id === me?.id)) return;
    rememberCardOrigin(card);
    pendingCardError.current = error;
    setRejectedCard(null);
    setPendingCardId(card.id);
    send({ type: "PLAY_CARD", cardId: card.id, targetPlayerId: target.id });
    setSelectedCardId(null);
  }

  function handleCardDragStart(card: Card, event: DragEvent<HTMLButtonElement>) {
    if (!canPlayCard(card)) {
      event.preventDefault();
      return;
    }
    rememberCardOrigin(card);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-bang-card-id", card.id);
    event.dataTransfer.setData("text/plain", card.id);
    const dragImage = event.currentTarget.cloneNode(true) as HTMLButtonElement;
    const bounds = event.currentTarget.getBoundingClientRect();
    dragImage.setAttribute("aria-hidden", "true");
    dragImage.tabIndex = -1;
    dragImage.removeAttribute("data-card-id");
    dragImage.style.position = "fixed";
    dragImage.style.left = "-10000px";
    dragImage.style.top = "0";
    dragImage.style.pointerEvents = "none";
    dragImage.style.margin = "0";
    dragImage.style.transform = "rotate(-4deg) scale(1.06)";
    dragImage.style.transformOrigin = "center center";
    dragImage.style.filter = "drop-shadow(0 12px 16px rgba(0, 0, 0, 0.72)) drop-shadow(0 0 10px rgba(251, 191, 36, 0.4))";
    document.body.appendChild(dragImage);
    event.dataTransfer.setDragImage(dragImage, bounds.width / 2, bounds.height / 2);
    window.setTimeout(() => dragImage.remove(), 0);
    setDraggingCardId(card.id);
    setDragOverTargetId(null);
  }

  function handleCardDragEnd() {
    setDraggingCardId(null);
    setDragOverTargetId(null);
  }

  function handleBoardDragOver(event: DragEvent<HTMLDivElement>) {
    const hasBangCard = Array.from(event.dataTransfer.types).includes("application/x-bang-card-id") || draggingCardId !== null;
    if (!hasBangCard) return;
    const element = event.target instanceof Element ? event.target : null;
    if (element?.closest(".bang-hand-card")) {
      setDragOverTargetId(null);
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const playerNode = element?.closest<HTMLElement>("[data-player-id]");
    setDragOverTargetId(playerNode?.dataset.playerId ?? "play");
  }

  function handleBoardDragLeave(event: DragEvent<HTMLDivElement>) {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const pointerStillInside = event.clientX >= bounds.left && event.clientX < bounds.right
      && event.clientY >= bounds.top && event.clientY < bounds.bottom;
    if (pointerStillInside) return;
    setDragOverTargetId(null);
  }

  function handleBoardDrop(event: DragEvent<HTMLDivElement>) {
    const cardId = event.dataTransfer.getData("application/x-bang-card-id")
      || event.dataTransfer.getData("text/plain")
      || draggingCardId;
    if (!cardId) return;
    event.preventDefault();
    const card = you?.hand.find((candidate) => candidate.id === cardId) ?? null;
    if (card) {
      const element = event.target instanceof Element ? event.target : null;
      const playerId = element?.closest<HTMLElement>("[data-player-id]")?.dataset.playerId;
      const target = playerId ? state.players.find((player) => player.id === playerId) : undefined;
      if (discarding || awaitingResp || !myTurn) {
        handleCardClick(card);
      } else if (target && needsTarget(card.kind, isCalamity) && canPlayCard(card)) {
        if (isValidTarget(card.kind, target, target.id === me?.id)) {
          handleSeatDrop(target, card);
        } else {
          const sequence = ++invalidDropSequence.current;
          setInvalidDropTarget({ id: target.id, sequence });
          window.clearTimeout(invalidDropTimer.current);
          invalidDropTimer.current = window.setTimeout(() => {
            if (invalidDropSequence.current === sequence) setInvalidDropTarget(null);
          }, prefersReducedMotion ? 180 : 560);
          if (selectedCardId !== card.id) {
            if (selectedCardId) playedCardOrigins.current.delete(selectedCardId);
            rememberCardOrigin(card);
            setSelectedCardId(card.id);
          }
        }
      } else {
        handleCardClick(card);
      }
    }
    handleCardDragEnd();
  }

  const opponents = state.players.filter((p) => p.id !== me?.id);
  const dragTargetPlayer = dragOverTargetId && dragOverTargetId !== "play"
    ? state.players.find((player) => player.id === dragOverTargetId) ?? null
    : null;
  const draggedCardNeedsTarget = !!draggedCard && needsTarget(draggedCard.kind, isCalamity);
  const draggedTargetIsValid = !!dragTargetPlayer && !!draggedCard && isValidTarget(draggedCard.kind, dragTargetPlayer, false);
  const dragTargetMessage = draggedCardNeedsTarget
    ? dragTargetPlayer
      ? draggedTargetIsValid ? ` — thả để chọn ${dragTargetPlayer.name}` : ` — ${dragTargetPlayer.name} không hợp lệ`
      : " — thả lên người chơi hợp lệ"
    : " — thả vào vùng bàn để dùng";

  return (
    <div ref={boardRef} data-bang-board className={`animate-board-enter relative flex flex-col gap-3 w-full max-w-2xl mx-auto ${changeFlashClass(roomStatusChanged, "animate-board-enter")}`}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || event.nativeEvent.isComposing) return;
        if (!discarding && !selectedCardId) return;
        event.preventDefault();
        if (selectedCardId) playedCardOrigins.current.delete(selectedCardId);
        setSelectedCardId(null);
        setDraggingCardId(null);
        setDragOverTargetId(null);
        handleCancelDiscard();
      }}
      onDragOver={handleBoardDragOver}
      onDragLeave={handleBoardDragLeave}
      onDrop={handleBoardDrop}>
      {draggedCard && (
        <div className="bang-drag-instructions" role="status" aria-live="polite">
          <span aria-hidden="true" className="text-lg">{CARD_DISPLAY[draggedCard.kind].icon}</span>
          <span>
            <strong>{CARD_DISPLAY[draggedCard.kind].name}</strong>
            <span key={`${dragTargetPlayer?.id ?? "board"}-${draggedTargetIsValid}`} className={dragTargetPlayer && draggedCardNeedsTarget ? `bang-drag-target-message ${draggedTargetIsValid ? "is-valid" : "is-invalid"}` : ""}>{dragTargetMessage}</span>
          </span>
          <span className="hidden sm:inline text-amber-200/65">Esc để hủy</span>
        </div>
      )}
      {invalidDropTarget && (
        <div key={invalidDropTarget.sequence} role="status" aria-live="polite" className={`bang-drag-rejected-message bang-drag-invalid-drop-${invalidDropTarget.sequence % 2 === 0 ? "a" : "b"}`}>
          Mục tiêu không hợp lệ. Hãy thả lá bài lên người chơi được đánh dấu hợp lệ.
        </div>
      )}
      {publicCardDrawFlights.length > 0 && (
        <div aria-hidden="true" className="bang-card-draw-layer">
          {publicCardDrawFlights.map((flight) => (
            <div
              key={flight.id}
              className="bang-card-transfer-flight"
              style={{
                "--transfer-from-x": `${flight.fromX}px`,
                "--transfer-from-y": `${flight.fromY}px`,
                "--transfer-mid-x": `${flight.midX}px`,
                "--transfer-mid-y": `${flight.midY}px`,
                "--transfer-to-x": `${flight.toX}px`,
                "--transfer-to-y": `${flight.toY}px`,
                animationDelay: `${flight.delayMs}ms`,
              } as CSSProperties}
            >
              <div className="bang-play-back bang-transfer-back">🂠</div>
            </div>
          ))}
        </div>
      )}
      {deckReshuffleFlights.length > 0 && (
        <div aria-hidden="true" className="bang-deck-reshuffle-layer">
          {deckReshuffleFlights.map((flight) => (
            <div
              key={flight.id}
              className="bang-deck-reshuffle-flight"
              style={{
                "--shuffle-from-x": `${flight.fromX}px`,
                "--shuffle-from-y": `${flight.fromY}px`,
                "--shuffle-mid-x": `${flight.midX}px`,
                "--shuffle-mid-y": `${flight.midY}px`,
                "--shuffle-to-x": `${flight.toX}px`,
                "--shuffle-to-y": `${flight.toY}px`,
                "--shuffle-rotate": `${flight.rotate}deg`,
                animationDelay: `${flight.delayMs}ms`,
              } as CSSProperties}
            >
              <div className="bang-reshuffle-back">🂠</div>
            </div>
          ))}
        </div>
      )}
      {equipmentDiscardFlights.length > 0 && playedCardEffect && (
        <div aria-hidden="true" className="bang-equipment-discard-layer">
          {equipmentDiscardFlights.map((flight) => {
            const card = playedCardEffect.discardedCards.find((candidate) => candidate.id === flight.cardId);
            if (!card) return null;
            return (
              <div
                key={flight.id}
                className="bang-card-transfer-flight"
                style={{
                  "--transfer-from-x": `${flight.fromX}px`,
                  "--transfer-from-y": `${flight.fromY}px`,
                  "--transfer-mid-x": `${flight.midX}px`,
                  "--transfer-mid-y": `${flight.midY}px`,
                  "--transfer-to-x": `${flight.toX}px`,
                  "--transfer-to-y": `${flight.toY}px`,
                  animationDelay: `${flight.delayMs}ms`,
                } as CSSProperties}
              >
                <CardView card={card} small />
              </div>
            );
          })}
        </div>
      )}
      {muzzleFlash.active && (
        <span
          aria-hidden="true"
          data-testid="muzzle-flash"
          className={`bang-muzzle-flash-point ${changeFlashClass(muzzleFlash, "animate-muzzle-flash")}`}
          style={shotFlights[0] ? {
            "--muzzle-x": `${shotFlights[0].fromX}px`,
            "--muzzle-y": `${shotFlights[0].fromY}px`,
          } as CSSProperties : undefined}
        >💥</span>
      )}
      {shotFlights.length > 0 && playedCardEffect && (
        <div aria-hidden="true" className="bang-shot-layer">
          {shotFlights.flatMap((flight) => [
            <span
              key={`${playedCardEffect.key}-${flight.targetId}-shot`}
              className={flight.kind === "aim" ? "bang-duel-aim" : flight.kind === "arrow" ? "bang-shot-arrow" : "bang-shot-projectile"}
              style={{
                "--shot-from-x": `${flight.fromX}px`,
                "--shot-from-y": `${flight.fromY}px`,
                "--shot-mid-x": `${flight.midX}px`,
                "--shot-mid-y": `${flight.midY}px`,
                "--shot-to-x": `${flight.toX}px`,
                "--shot-to-y": `${flight.toY}px`,
                "--shot-angle": `${flight.angle}deg`,
                "--aim-x": `${flight.toX}px`,
                "--aim-y": `${flight.toY}px`,
                animationDelay: `${(flight.kind === "aim" ? 180 : 420) + flight.delayMs}ms`,
              } as CSSProperties}
            />,
            ...(flight.kind === "aim" ? [] : [
              <span
                key={`${playedCardEffect.key}-${flight.targetId}-impact`}
                className={`bang-shot-impact ${flight.kind === "arrow" ? "is-arrow" : ""}`}
                style={{
                  "--shot-to-x": `${flight.toX}px`,
                  "--shot-to-y": `${flight.toY}px`,
                  animationDelay: `${750 + flight.delayMs}ms`,
                } as CSSProperties}
              />,
            ]),
          ])}
        </div>
      )}

      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {playedCardEffect?.message ?? ""}
      </div>

      {playedCardEffect && (
        <div
          key={playedCardEffect.key}
          aria-hidden="true"
          className={`bang-play-effect ${isBulkDiscardEffect ? "bang-play-discard" : ""} ${isEquipmentEffect ? "bang-play-equip" : ""}`}
          style={cardActorOrigin ? {
            "--play-from-x": `${cardActorOrigin.x}px`,
            "--play-from-y": `${cardActorOrigin.y}px`,
          } as CSSProperties : undefined}
        >
          {cardTransferFlight && (
            <div
              className="bang-card-transfer-flight"
              style={{
                "--transfer-from-x": `${cardTransferFlight.fromX}px`,
                "--transfer-from-y": `${cardTransferFlight.fromY}px`,
                "--transfer-mid-x": `${cardTransferFlight.midX}px`,
                "--transfer-mid-y": `${cardTransferFlight.midY}px`,
                "--transfer-to-x": `${cardTransferFlight.toX}px`,
                "--transfer-to-y": `${cardTransferFlight.toY}px`,
              } as CSSProperties}
            >
              <div className="bang-play-back bang-transfer-back">🂠</div>
            </div>
          )}
          <div
            className="bang-play-cards"
            style={{ "--play-stack-width": `${64 + Math.min(72, Math.max(0, effectCards.length - 1) * 18)}px` } as CSSProperties}
          >
            {effectCards.length > 0
              ? effectCards.map((card, index) => {
                const middle = (effectCards.length - 1) / 2;
                const spread = effectCards.length > 1
                  ? Math.min(18, 72 / (effectCards.length - 1))
                  : 0;
                const origin = playedCardOrigins.current.get(card.id);
                const droppedTargetCard = cardDropFlight?.cardId === card.id ? cardDropFlight : null;
                const dropDx = droppedTargetCard ? droppedTargetCard.toX - droppedTargetCard.fromX : 0;
                const dropDy = droppedTargetCard ? droppedTargetCard.toY - droppedTargetCard.fromY : 0;
                const fromX = origin?.x ?? cardActorOrigin?.x ?? 0;
                const fromY = origin?.y ?? cardActorOrigin?.y ?? 0;
                const discardDx = (bulkDiscardTarget?.x ?? 0) - fromX;
                const discardDy = (bulkDiscardTarget?.y ?? 0) - fromY;
                const equipDx = (equipmentTarget?.x ?? 0) - fromX;
                const equipDy = (equipmentTarget?.y ?? 0) - fromY;
                return (
                  <div
                    key={card.id}
                    className={`bang-play-card ${isBulkDiscardEffect ? "bang-play-card-discard" : ""} ${isEquipmentEffect ? "bang-play-card-equip" : ""}`}
                    style={{
                      "--play-card-offset-x": `${(index - middle) * spread}px`,
                      "--play-card-offset-y": `${Math.abs(index - middle) * 1.5}px`,
                      "--play-card-delay": `${Math.min(index, 4) * 45}ms`,
                      ...(origin ? {
                        "--play-from-x": `${origin.x}px`,
                        "--play-from-y": `${origin.y}px`,
                      } : {}),
                      ...(droppedTargetCard ? {
                        "--play-from-x": `${droppedTargetCard.fromX}px`,
                        "--play-from-y": `${droppedTargetCard.fromY}px`,
                        "--play-mid-x": `${droppedTargetCard.fromX + dropDx * 0.52}px`,
                        "--play-mid-y": `${droppedTargetCard.fromY + dropDy * 0.52 - 12}px`,
                        "--play-to-x": `${droppedTargetCard.toX}px`,
                        "--play-to-y": `${droppedTargetCard.toY}px`,
                      } : {}),
                      ...(isBulkDiscardEffect && bulkDiscardTarget ? {
                        "--discard-from-x": `${fromX}px`,
                        "--discard-from-y": `${fromY}px`,
                        "--discard-mid-x": `${fromX + discardDx * 0.54 + (index - middle) * spread * 0.45}px`,
                        "--discard-mid-y": `${fromY + discardDy * 0.54 - 28 + Math.abs(index - middle) * 2}px`,
                        "--discard-to-x": `${bulkDiscardTarget.x + (index - middle) * spread * 0.22}px`,
                        "--discard-to-y": `${bulkDiscardTarget.y + Math.abs(index - middle) * 2}px`,
                      } : {}),
                      ...(isEquipmentEffect && equipmentTarget ? {
                        "--equip-from-x": `${fromX}px`,
                        "--equip-from-y": `${fromY}px`,
                        "--equip-mid-x": `${fromX + equipDx * 0.56 + (index - middle) * spread * 0.4}px`,
                        "--equip-mid-y": `${fromY + equipDy * 0.56 - 28 + Math.abs(index - middle) * 2}px`,
                        "--equip-to-x": `${equipmentTarget.x}px`,
                        "--equip-to-y": `${equipmentTarget.y}px`,
                      } : {}),
                    } as CSSProperties}
                  >
                    <CardView card={card} small hideIdentity={card.id.startsWith("public-equipment-")} />
                  </div>
                );
              })
              : (
                <div className="bang-play-card" style={{ "--play-card-delay": "0ms" } as CSSProperties}>
                  <div className="bang-play-back">🂠</div>
                </div>
              )}
          </div>
          <div className="bang-play-caption">{playedCardEffect.message}</div>
        </div>
      )}

      {state.phase === "finished" && !playedCardEffect && (
        <VictoryScreen
          state={state}
          onLeave={onLeave}
          onRematch={me ? onRematch : undefined}
          rematching={rematching}
        />
      )}

      {/* Player info popup */}
      {selectedPlayerForInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setSelectedPlayerForInfo(null)}
        >
          <div
            className="animate-game-action-enter relative mx-4 max-w-xs w-full rounded-sm border border-amber-700/50 bg-gradient-to-b from-[#2a1c0e] to-[#1a1208] p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedPlayerForInfo(null)}
              className="absolute right-2 top-2 w-6 h-6 flex items-center justify-center text-amber-700/60 hover:text-amber-300 text-lg leading-none rounded-sm"
            >
              ×
            </button>
            <div className="flex items-start gap-3 mb-3">
              <span className="text-3xl shrink-0">{ROLE_ICON[selectedPlayerForInfo.publicRole] ?? "❓"}</span>
              <div className="min-w-0">
                <div className="font-bold text-amber-200 text-base">{selectedPlayerForInfo.name}</div>
                <div className="text-xs text-amber-700/60">{selectedPlayerForInfo.publicRole}</div>
              </div>
            </div>
            <div className="border-t border-amber-900/30 pt-3 mb-3">
              <div className="text-sm font-semibold text-amber-300">{selectedPlayerForInfo.character}</div>
              {selectedPlayerForInfo.abilityName && (
                <div className="text-xs text-amber-700/70 italic mt-0.5">{selectedPlayerForInfo.abilityName}</div>
              )}
            </div>
            <div className="flex items-center gap-1 flex-wrap mb-3">
              {Array.from({ length: selectedPlayerForInfo.maxHp }, (_, i) => (
                <div
                  key={i}
                  className={`h-4 w-[6px] rounded-t-sm ${i < selectedPlayerForInfo.hp ? "border-t border-amber-300/60 bg-gradient-to-b from-amber-500 to-amber-700 shadow-[0_0_6px_rgba(245,158,11,0.4)]" : "border border-dashed border-amber-900/40 bg-[#1a1208]/60 opacity-30"}`}
                />
              ))}
              <span className="ml-1 text-xs font-mono text-amber-300/60">{selectedPlayerForInfo.hp}/{selectedPlayerForInfo.maxHp} HP</span>
            </div>
            {selectedPlayerForInfo.distance !== null && (
              <div className={`rounded-sm px-2 py-1 text-xs font-semibold text-center mb-2 ${selectedPlayerForInfo.inRange ? "bg-[#3d2008]/70 text-[#f5c872] border border-[#c87d2a]/60" : "border border-amber-950/40 bg-[#0d0805]/50 text-amber-900/40"}`}>
                {selectedPlayerForInfo.inRange ? "✦ TRONG TẦM BẠN" : `✕ Ngoài tầm · ${selectedPlayerForInfo.distance} ô`}
              </div>
            )}
            <div className="text-xs text-amber-300/70 mb-2">🔫 {selectedPlayerForInfo.weapon} · tầm {selectedPlayerForInfo.weaponRange} · 🃏 {selectedPlayerForInfo.cardCount} lá</div>
            {selectedPlayerForInfo.equipment.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedPlayerForInfo.equipment.map((eq) => (
                  <span key={eq} className="text-[10px] rounded-sm border border-[#8b5a2b]/50 bg-[#3a2012]/80 px-1.5 py-0.5 text-[#e8c07e]">
                    {eq === "Thùng rượu" ? "🛢" : eq === "Ngựa" ? "🐎" : "🔫"} {eq}
                  </span>
                ))}
              </div>
            )}
            {!selectedPlayerForInfo.alive && (
              <div className="text-center text-2xl mt-2">💀 Đã bị loại</div>
            )}
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#1a1008] via-[#2a1c0e] to-[#1a1008] rounded-sm px-4 py-3 shadow-lg border border-amber-900/40 flex items-center justify-between">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
        <div>
          <div className="font-western text-amber-300 text-base tracking-wide [text-shadow:0_1px_0_rgba(255,255,255,0.15),0_2px_4px_rgba(0,0,0,0.9)]">🤠 BANG!</div>
          <div className="text-[10px] text-amber-700/60 font-mono">#{room.id.slice(0, 8)}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-amber-600/60 uppercase tracking-widest font-medium">Lượt {state.turnNumber}</div>
          <div className={`font-bold text-sm ${myTurn || awaitingResp ? "text-amber-300 [text-shadow:0_0_12px_rgba(251,191,36,0.5)]" : "text-[#d4b996]"}`}>
            {turnStatus}
          </div>
        </div>
        <button
          onClick={onLeave}
          className="room-action-button text-xs px-3 py-1.5 rounded-sm border border-[#6b4725]/60 bg-[#22140c]/90 text-[#bba182] shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)] hover:border-red-700/50 hover:bg-red-950/40 hover:text-red-400 transition-all uppercase tracking-wider"
        >
          Thoát
        </button>
      </div>

      <ConnectionBanner connectionState={connectionState} />
      <DisconnectBadge seats={room.seats} />
      <RoomErrorBanner error={error} />

      {me && !me.alive && state.phase !== "finished" && (
        <div role="status" className="rounded-sm border border-amber-900/40 bg-[#1a1208] p-3 text-sm text-amber-700/70">
          Bạn đã bị loại. Bạn có thể tiếp tục theo dõi ván đấu và chờ kết quả.
        </div>
      )}

      {isSpectator && (
        <div className="rounded-sm p-2 text-center bg-amber-900/30 text-amber-300 text-sm">
          👁 Bạn đang xem — không thể chơi bài.
        </div>
      )}

      {/* Bàn tròn — đối thủ */}
      <div className="bg-gradient-to-b from-[#1c150c] to-[#160f08] rounded-sm p-3 border border-amber-900/30 shadow-inner flex flex-col gap-2">
        <DistanceRing players={state.players} myId={me?.id ?? null} currentPlayerId={state.currentPlayerId} />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {opponents.map((p, seatIndex) => (
            <PlayerSeat
              key={p.id}
              player={p}
              roleRevealDelayMs={seatIndex * 36}
              isCurrentTurn={state.phase === "awaitingResponse"
                ? state.pendingResponse?.targetIds.includes(p.id) === true
                : state.currentPlayerId === p.id}
              isMe={false}
              targeting={selectingTarget}
              targetable={selectingTarget && !!selectedCard && isValidTarget(selectedCard.kind, p, false)}
              dragTarget={dragOverTargetId === p.id && !!draggedCard && canPlayCard(draggedCard) && needsTarget(draggedCard.kind, isCalamity) && isValidTarget(draggedCard.kind, p, false)}
              dragInvalidTarget={dragOverTargetId === p.id && !!draggedCard && canPlayCard(draggedCard) && needsTarget(draggedCard.kind, isCalamity) && !isValidTarget(draggedCard.kind, p, false)}
              dragInvalidDrop={invalidDropTarget?.id === p.id ? invalidDropTarget.sequence : undefined}
              draggingCard={draggingCardId !== null}
              roomId={room.id}
              defenseKey={defenseFlashKeys.get(p.id) ?? null}
              duelLossKey={duelLossKeys.get(p.id) ?? null}
              onClick={() => handleSeatClick(p)}
              onInfoClick={() => setSelectedPlayerForInfo(p)}
            />
          ))}
        </div>
      </div>

      {/* Giữa bàn: nọc bài / chồng bài bỏ / hiệu ứng đang treo */}
      <div className={`bang-card-drop-zone flex items-center justify-center gap-6 bg-gradient-to-b from-[#1c150c] to-[#160f08] rounded-sm px-5 py-3 border border-amber-900/30 shadow-[inset_0_2px_8px_rgba(0,0,0,0.8),0_8px_20px_rgba(0,0,0,0.7)] ${dragOverTargetId === "play" ? "is-drag-over" : ""}`}>
        {/* Nọc bài */}
        <div data-bang-discard-area className="flex flex-col items-center gap-1">
          <div
            data-bang-deck
            className={`w-16 h-24 rounded-sm border-2 border-amber-900/60 bg-gradient-to-b from-[#2b2013] to-[#1c150c] flex items-center justify-center shadow-lg ${changeFlashClass(deckChanged, "bang-deck-change")}`}
            aria-label="Nọc bài"
          >
            <span className="text-3xl">🂠</span>
          </div>
          <div className={`text-[10px] text-amber-400/60 font-mono ${changeFlashClass(deckChanged, "bang-deck-count-change")}`}><AnimatedNumber value={state.deckCount} /> lá</div>
        </div>

        {/* Divider */}
        <div className="w-px h-16 bg-amber-900/30" />

        {/* Chồng bài bỏ */}
        <div className="flex flex-col items-center gap-1">
          {discardPile.length > 0 ? (
            <div data-bang-discard key={discardTopId} className={`flex w-16 h-24 items-center justify-center ${changeFlashClass(discardTopChanged, "bang-discard-arrive")}`}>
              <CardView card={discardPile[discardPile.length - 1]} small />
            </div>
          ) : (
            <div className="w-16 h-24 rounded-sm border-2 border-dashed border-amber-900/60 bg-amber-950/20 flex items-center justify-center shadow-inner">
              <span className="text-amber-900/40 text-2xl">∅</span>
            </div>
          )}
          <div className="text-[10px] text-amber-400/60">bỏ bài</div>
        </div>

        {/* Pending response */}
        {state.pendingResponse && (
          <>
            <div className="w-px h-16 bg-amber-900/30" />
            <div key={pendingResponseKey} className="bang-pending-response text-center text-xs text-red-300 bg-red-950/60 rounded-sm px-3 py-2 border border-red-800/40 max-w-[150px]">
              <div className="font-bold mb-0.5">
                {state.pendingResponse.kind === "bang" || state.pendingResponse.kind === "gatling" ? "🔫" :
                 state.pendingResponse.kind === "duel" ? "⚔️" :
                 state.pendingResponse.kind === "indians" ? "🏹" :
                 state.pendingResponse.kind === "generalStore" ? "🏪" : "⏳"}{" "}
                {state.pendingResponse.kind === "bang" ? "Bang!" :
                 state.pendingResponse.kind === "gatling" ? "Gatling!" :
                 state.pendingResponse.kind === "duel" ? "Đấu súng" :
                 state.pendingResponse.kind === "indians" ? "Người da đỏ!" :
                 state.pendingResponse.kind === "generalStore" ? "General Store" : "Đang chờ"}
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

      {/* General Store picker */}
      {state.generalStoreCards && state.generalStoreCards.length > 0 && (
        <div className="rounded-sm border border-amber-700/50 bg-gradient-to-b from-[#221508] to-[#160f08] p-3 shadow-inner">
          <p className="text-xs text-amber-400/80 uppercase tracking-widest mb-2 text-center font-medium">🏪 General Store — chọn 1 lá</p>
          <div className="flex flex-wrap justify-center gap-2">
            {state.generalStoreCards.map((storeCard) => {
              const isMyPickTurn = awaitingResp && state.pendingResponse?.kind === "generalStore" && state.pendingResponse.itsYourTurn;
              return (
                <button
                  key={storeCard.id}
                  disabled={!isMyPickTurn || responding}
                  onClick={() => {
                    if (!isMyPickTurn || responding) return;
                    markResponsePending();
                    send({ type: "RESPOND", cardId: storeCard.id });
                  }}
                  className={`relative w-16 h-24 rounded-sm transition-all ${isMyPickTurn && !responding ? "cursor-pointer hover:scale-105 hover:ring-2 hover:ring-amber-400/60" : "cursor-default opacity-75"}`}
                >
                  <CardView card={storeCard} small />
                </button>
              );
            })}
          </div>
          {awaitingResp && state.pendingResponse?.kind === "generalStore" && !state.pendingResponse.itsYourTurn && (
            <p className="text-center text-xs text-amber-500/60 mt-2">
              Đang chờ{" "}
              {state.pendingResponse.targetIds.map((id) => state.players.find((p) => p.id === id)?.name ?? id).join(", ")}
              {" "}chọn…
            </p>
          )}
        </div>
      )}

      {/* Local player + action bar + hand */}
      {me && you && (
        <fieldset disabled={connectionState !== "connected" || !me.alive} className="flex min-w-0 flex-col gap-3">
          <LocalPlayerPanel me={me} you={you} isCurrentTurn={myTurn || awaitingResp} roomId={room.id} defenseKey={defenseFlashKeys.get(me.id) ?? null} duelLossKey={duelLossKeys.get(me.id) ?? null} />
          <ActionBar
            key={awaitingResp ? `response-${state.pendingResponse?.kind}-${state.pendingResponse?.fromPlayerId}` : discarding ? "discarding" : selectingTarget ? `target-${selectedCardId}` : myTurn ? "action-turn" : "waiting"}
            myTurn={myTurn}
            awaitingResponse={awaitingResp}
            selectingTarget={selectingTarget}
            targetCardName={selectedCard ? CARD_DISPLAY[selectedCard.kind].name : undefined}
            targetCount={selectedCard ? opponents.filter((p) => isValidTarget(selectedCard.kind, p, false)).length : 0}
            canEndTurn={myTurn && connectionState === "connected" && me.alive && !pendingCardId && !responding}
            endingTurn={endingTurn}
            onEndTurn={handleEndTurnClick}
            responding={responding}
            rejectedAction={rejectedAction}
            onRespondPass={handleRespondPass}
            onCancelTarget={() => {
              if (selectedCardId) playedCardOrigins.current.delete(selectedCardId);
              setSelectedCardId(null);
            }}
            hasBarrel={(state.pendingResponse?.kind === "bang" || state.pendingResponse?.kind === "gatling") && me.equipment.includes("Thùng rượu")}
            hasDefenseCard={you.hand.some((card) => state.pendingResponse && allowedResponseKinds(state.pendingResponse.kind, isCalamity).includes(card.kind))}
            responseKind={state.pendingResponse?.kind}
            isCalamity={isCalamity}
            waitingFor={state.pendingResponse
              ? state.pendingResponse.targetIds.map((id) => state.players.find((p) => p.id === id)?.name ?? "người chơi").join(", ")
              : state.players.find((p) => p.id === state.currentPlayerId)?.name}
            discarding={discarding}
            discardOverflow={discardOverflow}
            discardSelectedCount={discardIds.length}
            handCount={you.hand.length}
            currentHp={me.hp}
            onConfirmDiscard={handleConfirmDiscard}
            onCancelDiscard={handleCancelDiscard}
          />
          {rejectedCard && (
            <div key={`card-rejected-${rejectedCard.sequence}`} role="status" aria-live="polite" className="animate-game-action-enter rounded-sm border border-red-800/50 bg-red-950/40 px-3 py-2 text-center text-xs text-red-200">
              Chưa nhận được xác nhận lá bài — hãy thử lại.
            </div>
          )}
          <HandFan
            hand={you.hand}
            selectedId={selectedCardId}
            pendingId={pendingCardId}
            selectedIds={discarding ? discardIds : undefined}
            rejectedId={rejectedCard?.id}
            rejectedSequence={rejectedCard?.sequence}
            playable={discarding || myTurn || awaitingResp}
            responseMode={awaitingResp}
            canPlay={canPlayCard}
            getDisabledReason={cardBlockedReason}
            onSelect={handleCardClick}
            dealAnimation={dealAnimation}
            roomId={room.id}
            incomingSourcePlayerId={incomingSourcePlayerId}
            deckReshuffleSequence={deckReshuffleLogSequence}
            boardLayoutRevision={layoutRevision}
            draggingCardId={draggingCardId}
            onCardDragStart={handleCardDragStart}
            onCardDragEnd={handleCardDragEnd}
          />
          {blockedHandSummary.length > 0 && (
            <div role="status" className="rounded-sm border border-amber-800/40 bg-amber-950/30 px-3 py-2 text-xs text-amber-200/90">
              <p className="font-semibold">{you.hand.some((card) => canPlayCard(card)) ? "Lá chưa thể dùng lúc này:" : "Chưa có lá nào dùng được:"}</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                {blockedHandSummary.map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
              {!you.hand.some((card) => canPlayCard(card)) && <p className="mt-1 text-amber-200/70">Bạn có thể kết thúc lượt hoặc chọn bỏ bài nếu vượt giới hạn.</p>}
            </div>
          )}
          {myTurn && you.canFire === false && <p role="status" className="px-2 text-xs text-amber-400/80">🔫 Đã dùng lượt bắn. Dùng lá khác hoặc kết thúc lượt (Volcanic cho phép bắn thêm).</p>}
        </fieldset>
      )}

      <GameLogPanel log={state.gameLog} roomId={room.id} />

      <BangDebugPanel roomId={room.id} players={state.players} />
    </div>
  );
}
