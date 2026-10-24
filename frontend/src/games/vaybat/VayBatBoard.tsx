import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useGameStore } from "../../platform/gameStore";
import { ConnectionBanner, DisconnectBadge, LeaveRoomButton, RematchButton, RoomErrorBanner, RoomStatusBanner } from "../../platform/RoomShell";
import { legalMoves, occupancy, side, type GameState, type MapDef } from "./types";
import { changeFlashClass, useChangeFlash } from "../useChangeFlash";
import { changedIndexClass, useChangedIndices } from "../useChangedIndices";
import { useValueDeltas } from "../useValueDeltas";
import { useReducedMotionPreference } from "../../hooks/useReducedMotionPreference";
import { useResizeRevision } from "../../hooks/useResizeRevision";
import AnimatedNumber from "../../components/AnimatedNumber";
import WaitingDots from "../../components/WaitingDots";

interface Props {
  makeMove: (roomId: string, move: unknown) => void;
  onLeave: () => void;
  onRematch: () => void;
  rematching: boolean;
}

interface DragState { pieceId: string; svgX: number; svgY: number; }
interface CapturedPiece { pieceId: string; nodeId: number; delayMs: number; }
interface CaptureFlight { pieceId: string; x: number; y: number; midX: number; midY: number; dx: number; dy: number; delayMs: number; color: string; }
interface ReturningPiece { pieceId: string; fromX: number; fromY: number; toX: number; toY: number; }
interface PendingDrop { pieceId: string; fromX: number; fromY: number; toX: number; toY: number; originX: number; originY: number; targetNodeId: number; reducedMotion: boolean; }

const CAPTURE_BURST_MS = 600;
const CAPTURE_TRANSFER_MS = 380;
const CAPTURE_STAGGER_MS = 45;
const MAX_CAPTURE_STAGGER = 5;
const CAPTURE_GRACE_MS = 50;
const MOVE_SETTLE_MS = 450;

export default function VayBatBoard({ makeMove, onLeave, onRematch, rematching }: Props) {
  const { room, mySide, selected, setSelected, error, connectionState } = useGameStore();
  const prefersReducedMotion = useReducedMotionPreference();
  const svgRef = useRef<SVGSVGElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const layoutRevision = useResizeRevision(rootRef, !!room);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dragTarget, setDragTarget] = useState<number | null>(null);
  const [dragInvalidTarget, setDragInvalidTarget] = useState<number | null>(null);
  const [previewTarget, setPreviewTarget] = useState<number | null>(null);
  const [returningPiece, setReturningPiece] = useState<ReturningPiece | null>(null);
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null);
  const [invalidNode, setInvalidNode] = useState<number | null>(null);
  const [invalidSequence, setInvalidSequence] = useState(0);
  const [capturedPieces, setCapturedPieces] = useState<CapturedPiece[]>([]);
  const [captureFlights, setCaptureFlights] = useState<CaptureFlight[]>([]);
  const [captureRevealDelay, setCaptureRevealDelay] = useState(0);
  const [movingPieces, setMovingPieces] = useState<ReadonlyMap<string, number>>(new Map());
  const pressRef = useRef<DragState | null>(null);
  const didDrag = useRef(false);
  const dragFrame = useRef<number | undefined>(undefined);
  const latestDragPosition = useRef<{ x: number; y: number } | null>(null);
  const previousRoomId = useRef<string | undefined>(room?.id);
  const captureTimer = useRef<number | undefined>(undefined);
  const captureExpiresAt = useRef(0);
  const moveExpiresAt = useRef(0);
  const resultTimer = useRef<number | undefined>(undefined);
  const resultRevision = useRef(0);
  const captureRevision = useRef(0);
  const pendingDropRevision = useRef(0);
  const returnRevision = useRef(0);
  const invalidRevision = useRef(0);
  const [resultReady, setResultReady] = useState(false);
  const movingPieceTimers = useRef(new Map<string, number>());
  const movingPieceRevisions = useRef(new Map<string, number>());
  const returnTimer = useRef<number | undefined>(undefined);
  const invalidTimer = useRef<number | undefined>(undefined);
  const pendingDropTimer = useRef<number | undefined>(undefined);
  const pendingDropError = useRef<string | null>(error);
  const pointerPreviewTarget = useRef<number | null>(null);
  const focusPreviewTarget = useRef<number | null>(null);

  const updatePreviewSource = useCallback((source: "pointer" | "focus", targetId: number | null) => {
    const sourceRef = source === "pointer" ? pointerPreviewTarget : focusPreviewTarget;
    sourceRef.current = targetId;
    setPreviewTarget(pointerPreviewTarget.current ?? focusPreviewTarget.current);
  }, []);

  const flashInvalidNode = useCallback((nodeId: number) => {
    const revision = ++invalidRevision.current;
    setInvalidNode(nodeId);
    setInvalidSequence((sequence) => sequence + 1);
    window.clearTimeout(invalidTimer.current);
    invalidTimer.current = window.setTimeout(() => {
      if (invalidRevision.current === revision) setInvalidNode(null);
    }, prefersReducedMotion ? 180 : 520);
  }, [prefersReducedMotion]);

  useLayoutEffect(() => {
    if (!prefersReducedMotion) return;
    setPendingDrop((current) => current && !current.reducedMotion ? { ...current, reducedMotion: true } : current);
    setReturningPiece(null);
    returnRevision.current += 1;
    window.clearTimeout(returnTimer.current);
    if (capturedPieces.length) {
      window.clearTimeout(captureTimer.current);
      const revision = ++captureRevision.current;
      captureExpiresAt.current = performance.now() + 180;
      captureTimer.current = window.setTimeout(() => {
        if (captureRevision.current !== revision) return;
        setCapturedPieces([]);
        captureExpiresAt.current = 0;
      }, 180);
    }
    for (const [pieceId, fromNodeId] of movingPieces) {
      window.clearTimeout(movingPieceTimers.current.get(pieceId));
      const revision = (movingPieceRevisions.current.get(pieceId) ?? 0) + 1;
      movingPieceRevisions.current.set(pieceId, revision);
      const timer = window.setTimeout(() => {
        if (movingPieceRevisions.current.get(pieceId) !== revision) return;
        setMovingPieces((current) => {
          if (current.get(pieceId) !== fromNodeId) return current;
          const next = new Map(current);
          next.delete(pieceId);
          return next;
        });
        movingPieceTimers.current.delete(pieceId);
      }, 180);
      movingPieceTimers.current.set(pieceId, timer);
    }
    if (invalidNode !== null) {
      window.clearTimeout(invalidTimer.current);
      const revision = ++invalidRevision.current;
      invalidTimer.current = window.setTimeout(() => {
        if (invalidRevision.current === revision) setInvalidNode(null);
      }, 180);
    }
  }, [prefersReducedMotion, capturedPieces.length, movingPieces, invalidNode]);

  // Mọi hook phải gọi KHÔNG điều kiện (Rules of Hooks) — không được return sớm trước các
  // useMemo bên dưới rồi mới gọi chúng, nếu không React sẽ thấy số hook khác nhau giữa các lần
  // render khi `room` chuyển null <-> có giá trị. Vì vậy tính map/state dạng optional trước,
  // return null thật sự chỉ SAU khi mọi hook đã chạy xong.
  const map = room?.map as MapDef | undefined;
  const state = room?.state as GameState | undefined;
  const myTurn = !!room && room.status === "Playing" && !state?.winner && state?.turn === mySide;
  const canInteract = myTurn && connectionState === "connected";
  const turnChanged = useChangeFlash(state?.turn, 650, room?.id);
  const roomStatusChanged = useChangeFlash(room?.status, 500, room?.id);
  const redTurnsChanged = useChangeFlash(state?.redTurnsUsed, 560, room?.id);
  const joiningSeats = useChangedIndices(room?.seats.map((seat) => Number(seat.displayName !== null)) ?? [], 560, room?.id);
  const capturedCounts = useMemo(() => {
    const pieces = Object.keys(state?.pieces ?? {});
    const redRemaining = pieces.filter((pieceId) => pieceId.startsWith("R")).length;
    const whiteRemaining = pieces.filter((pieceId) => pieceId.startsWith("W")).length;
    return [map ? map.whiteCount - whiteRemaining : 0, map ? map.redCount - redRemaining : 0];
  }, [map, state]);
  const captureDeltas = useValueDeltas(
    capturedCounts,
    room?.id,
    CAPTURE_BURST_MS + CAPTURE_TRANSFER_MS + MAX_CAPTURE_STAGGER * CAPTURE_STAGGER_MS + 900,
  );
  useLayoutEffect(() => {
    if (prefersReducedMotion || !captureDeltas.size) {
      setCaptureRevealDelay(0);
      return;
    }
    if (capturedPieces.length) {
      setCaptureRevealDelay(capturedPieces.reduce((latest, piece) => Math.max(latest, piece.delayMs + CAPTURE_BURST_MS + CAPTURE_TRANSFER_MS), 0));
    }
  }, [captureDeltas, capturedPieces, prefersReducedMotion]);
  useLayoutEffect(() => {
    pressRef.current = null;
    didDrag.current = false;
    window.cancelAnimationFrame(dragFrame.current ?? 0);
    dragFrame.current = undefined;
    latestDragPosition.current = null;
    setDrag(null);
    setDragTarget(null);
    setReturningPiece(null);
    setPendingDrop(null);
    setInvalidNode(null);
    pendingDropRevision.current += 1;
    returnRevision.current += 1;
    invalidRevision.current += 1;
    window.clearTimeout(returnTimer.current);
    window.clearTimeout(invalidTimer.current);
    window.clearTimeout(pendingDropTimer.current);
    setSelected(null);
  }, [room?.id, room?.status, state?.turn, state?.winner, connectionState, error, mySide, setSelected]);

  // Tính lại khi state/selected thay đổi, không tính lại khi chỉ drag thay đổi
  const occ = useMemo(() => (state ? occupancy(state) : new Map<number, string>()), [state]);
  const previousOccupancy = useRef(new Map<number, string>());
  useLayoutEffect(() => {
    if (previousRoomId.current !== room?.id) {
      previousRoomId.current = room?.id;
      previousOccupancy.current = new Map(occ);
      setCapturedPieces([]);
      captureExpiresAt.current = 0;
      moveExpiresAt.current = 0;
      setMovingPieces(new Map());
      movingPieceRevisions.current.clear();
      captureRevision.current += 1;
      window.clearTimeout(captureTimer.current);
      movingPieceTimers.current.forEach((timer) => window.clearTimeout(timer));
      movingPieceTimers.current.clear();
      return;
    }

    const currentPieces = new Set(occ.values());
    const removed = [...previousOccupancy.current]
      .filter(([, pieceId]) => !currentPieces.has(pieceId))
      .map(([nodeId, pieceId]) => ({ nodeId, pieceId }));
    const currentNodeByPiece = new Map([...occ].map(([nodeId, pieceId]) => [pieceId, nodeId]));
    const moved = new Map<string, number>();
    for (const [nodeId, pieceId] of previousOccupancy.current) {
      const nextNode = currentNodeByPiece.get(pieceId);
      if (nextNode !== undefined && nextNode !== nodeId) moved.set(pieceId, nodeId);
    }
    previousOccupancy.current = new Map(occ);

    if (removed.length) {
      const staged = removed.map((piece, index) => ({
        ...piece,
        delayMs: prefersReducedMotion ? 0 : Math.min(index, MAX_CAPTURE_STAGGER) * CAPTURE_STAGGER_MS,
      }));
      setCapturedPieces((current) => {
        const currentIds = new Set(current.map(({ pieceId }) => pieceId));
        return [...current, ...staged.filter(({ pieceId }) => !currentIds.has(pieceId))];
      });
      window.clearTimeout(captureTimer.current);
      const now = performance.now();
      const captureLifetime = prefersReducedMotion
        ? 180
        : CAPTURE_BURST_MS + CAPTURE_TRANSFER_MS + Math.min(Math.max(0, removed.length - 1), MAX_CAPTURE_STAGGER) * CAPTURE_STAGGER_MS + CAPTURE_GRACE_MS;
      captureExpiresAt.current = Math.max(captureExpiresAt.current, now + captureLifetime);
      const revision = ++captureRevision.current;
      captureTimer.current = window.setTimeout(() => {
        if (captureRevision.current !== revision) return;
        setCapturedPieces([]);
        captureExpiresAt.current = 0;
      }, Math.max(0, captureExpiresAt.current - performance.now()));
    }
    if (moved.size) {
      const moveLifetime = prefersReducedMotion ? 180 : MOVE_SETTLE_MS;
      moveExpiresAt.current = Math.max(moveExpiresAt.current, performance.now() + moveLifetime);
      setMovingPieces((current) => new Map([...current, ...moved]));
      moved.forEach((fromNodeId, pieceId) => {
        window.clearTimeout(movingPieceTimers.current.get(pieceId));
        const revision = (movingPieceRevisions.current.get(pieceId) ?? 0) + 1;
        movingPieceRevisions.current.set(pieceId, revision);
        const timer = window.setTimeout(() => {
          if (movingPieceRevisions.current.get(pieceId) !== revision) return;
          setMovingPieces((current) => {
            if (current.get(pieceId) !== fromNodeId) return current;
            const next = new Map(current);
            next.delete(pieceId);
            return next;
          });
          movingPieceTimers.current.delete(pieceId);
        }, moveLifetime);
        movingPieceTimers.current.set(pieceId, timer);
      });
    }
  }, [occ, room?.id, prefersReducedMotion]);
  useLayoutEffect(() => {
    const revision = ++resultRevision.current;
    window.clearTimeout(resultTimer.current);
    if (!state?.winner || prefersReducedMotion) {
      setResultReady(!!state?.winner);
      return;
    }
    const revealAt = Math.max(captureExpiresAt.current, moveExpiresAt.current);
    const delay = Math.max(0, revealAt - performance.now());
    if (delay === 0) {
      setResultReady(true);
      return;
    }
    setResultReady(false);
    resultTimer.current = window.setTimeout(() => {
      if (resultRevision.current === revision) setResultReady(true);
    }, delay);
    return () => {
      if (resultRevision.current === revision) resultRevision.current += 1;
      window.clearTimeout(resultTimer.current);
    };
  }, [room?.id, state?.winner, prefersReducedMotion]);
  useLayoutEffect(() => {
    if (pendingDrop && occ.get(pendingDrop.targetNodeId) === pendingDrop.pieceId) {
      setPendingDrop(null);
      window.clearTimeout(pendingDropTimer.current);
      pendingDropRevision.current += 1;
    }
  }, [occ, pendingDrop]);
  useLayoutEffect(() => {
    if (!pendingDrop || error === pendingDropError.current || occ.get(pendingDrop.targetNodeId) === pendingDrop.pieceId) return;
    window.clearTimeout(pendingDropTimer.current);
    pendingDropRevision.current += 1;
    setPendingDrop(null);
    if (!prefersReducedMotion) {
      animatePieceReturn(pendingDrop.pieceId, pendingDrop.toX, pendingDrop.toY, pendingDrop.originX, pendingDrop.originY);
    }
    flashInvalidNode(pendingDrop.targetNodeId);
  }, [error, pendingDrop, occ, prefersReducedMotion, flashInvalidNode]);
  useEffect(() => () => {
    captureRevision.current += 1;
    pendingDropRevision.current += 1;
    returnRevision.current += 1;
    invalidRevision.current += 1;
    window.cancelAnimationFrame(dragFrame.current ?? 0);
    window.clearTimeout(captureTimer.current);
    window.clearTimeout(resultTimer.current);
    movingPieceTimers.current.forEach((timer) => window.clearTimeout(timer));
    movingPieceTimers.current.clear();
    movingPieceRevisions.current.clear();
    window.clearTimeout(returnTimer.current);
    window.clearTimeout(invalidTimer.current);
    window.clearTimeout(pendingDropTimer.current);
  }, []);
  const highlights = useMemo(
    () => (map && state && selected && canInteract ? new Set(legalMoves(map, state, selected)) : new Set<number>()),
    [selected, canInteract, map, state]
  );
  useLayoutEffect(() => {
    pointerPreviewTarget.current = null;
    focusPreviewTarget.current = null;
    setPreviewTarget(null);
  }, [selected, room?.id]);
  // Lookup O(1) thay vì O(N) linear scan trong mỗi edge render
  const nodeById = useMemo(
    () => new Map((map?.nodes ?? []).map(n => [n.id, n])),
    [map]
  );

  useLayoutEffect(() => {
    const svg = svgRef.current;
    const root = rootRef.current;
    const matrix = svg?.getScreenCTM();
    if (!capturedPieces.length || prefersReducedMotion || !svg || !root || !matrix) {
      setCaptureFlights([]);
      return;
    }

    const rootRect = root.getBoundingClientRect();
    const flights = capturedPieces.flatMap((piece) => {
      const node = nodeById.get(piece.nodeId);
      const captureIndex = piece.pieceId.startsWith("R") ? 0 : 1;
      const counter = root.querySelector<HTMLElement>(`[data-vay-capture-count="${captureIndex}"]`);
      if (!node || !counter) return [];
      const point = svg.createSVGPoint();
      point.x = node.x;
      point.y = node.y;
      const source = point.matrixTransform(matrix);
      const targetRect = counter.getBoundingClientRect();
      const fromX = source.x - rootRect.left;
      const fromY = source.y - rootRect.top;
      const toX = targetRect.left + targetRect.width / 2 - rootRect.left;
      const toY = targetRect.top + targetRect.height / 2 - rootRect.top;
      const dx = toX - fromX;
      const dy = toY - fromY;
      return [{
        pieceId: piece.pieceId,
        x: fromX,
        y: fromY,
        midX: dx * 0.52,
        midY: dy * 0.52 - 24,
        dx,
        dy,
        delayMs: CAPTURE_BURST_MS + piece.delayMs,
        color: piece.pieceId.startsWith("R") ? "#e7463c" : "#f4f6ff",
      }];
    });
    setCaptureFlights(flights);
  }, [capturedPieces, nodeById, prefersReducedMotion, layoutRevision]);

  if (!room || !map || !state) return null;

  function toSvg(clientX: number, clientY: number) {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: p.x, y: p.y };
  }

  function nearestNode(x: number, y: number, threshold = 35) {
    let best: number | null = null, bestDist = threshold;
    for (const n of map!.nodes) {
      const d = Math.hypot(n.x - x, n.y - y);
      if (d < bestDist) { bestDist = d; best = n.id; }
    }
    return best;
  }

  function nearestLegalNode(x: number, y: number, threshold = 40) {
    let best: number | null = null, bestDist = threshold;
    for (const node of map!.nodes) {
      if (!highlights.has(node.id)) continue;
      const distance = Math.hypot(node.x - x, node.y - y);
      if (distance < bestDist) { bestDist = distance; best = node.id; }
    }
    return best;
  }

  function animateDropTo(pieceId: string, fromX: number, fromY: number, targetNodeId: number, originX = fromX, originY = fromY) {
    const target = nodeById.get(targetNodeId);
    if (!target) return;
    window.clearTimeout(pendingDropTimer.current);
    pendingDropError.current = error;
    const reducedMotion = prefersReducedMotion;
    const drop: PendingDrop = { pieceId, fromX, fromY, toX: target.x, toY: target.y, originX, originY, targetNodeId, reducedMotion };
    setPendingDrop(drop);
    const revision = ++pendingDropRevision.current;
    pendingDropTimer.current = window.setTimeout(() => {
      if (pendingDropRevision.current === revision) rejectPendingDrop(drop);
    }, 1800);
  }

  function animatePieceReturn(pieceId: string, fromX: number, fromY: number, toX: number, toY: number) {
    if (prefersReducedMotion) return;
    setReturningPiece({ pieceId, fromX, fromY, toX, toY });
    window.clearTimeout(returnTimer.current);
    const revision = ++returnRevision.current;
    returnTimer.current = window.setTimeout(() => {
      if (returnRevision.current === revision) setReturningPiece(null);
    }, 300);
  }

  function rejectPendingDrop(drop: PendingDrop) {
    pendingDropRevision.current += 1;
    setPendingDrop(null);
    animatePieceReturn(drop.pieceId, drop.toX, drop.toY, drop.originX, drop.originY);
    flashInvalidNode(drop.targetNodeId);
  }

  function onSvgPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (!canInteract) return;
    if (returningPiece) {
      setReturningPiece(null);
      window.clearTimeout(returnTimer.current);
      returnRevision.current += 1;
    }
    const pos = toSvg(e.clientX, e.clientY);
    const nodeId = nearestNode(pos.x, pos.y);
    if (nodeId === null) { setSelected(null); return; }

    const pid = occ.get(nodeId);

    if (myTurn && pid && side(pid) === mySide) {
      // Nhấc quân của mình — ghi nhận điểm bắt đầu, ghost chỉ hiện sau khi kéo > 8px
      setInvalidNode(null);
      setDragTarget(null);
      setDragInvalidTarget(null);
      window.clearTimeout(invalidTimer.current);
      invalidRevision.current += 1;
      svgRef.current?.setPointerCapture(e.pointerId);
      didDrag.current = false;
      setSelected(pid);
      pressRef.current = { pieceId: pid, svgX: pos.x, svgY: pos.y };
    } else if (myTurn && selected && highlights.has(nodeId)) {
      // Tap vào ô đích hợp lệ — đi ngay
      setInvalidNode(null);
      window.clearTimeout(invalidTimer.current);
      invalidRevision.current += 1;
      const source = [...occ].find(([, pieceId]) => pieceId === selected);
      const sourceNode = source ? nodeById.get(source[0]) : null;
      if (sourceNode) animateDropTo(selected, sourceNode.x, sourceNode.y, nodeId);
      makeMove(room!.id, { pieceId: selected, to: nodeId });
      setSelected(null);
    } else if (myTurn && selected) {
      // Giữ lựa chọn để người chơi thử ô khác; báo rõ ô vừa bị từ chối.
      flashInvalidNode(nodeId);
    } else {
      setSelected(null);
    }
  }

  function onSvgPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!canInteract) return;
    const press = pressRef.current;
    if (!press) return;
    e.preventDefault();
    const pos = toSvg(e.clientX, e.clientY);
    const dist = Math.hypot(pos.x - press.svgX, pos.y - press.svgY);
    if (dist > 8) {
      // Vượt ngưỡng → kích hoạt ghost drag
      didDrag.current = true;
    }
    if (!didDrag.current) return;
    latestDragPosition.current = pos;
    if (dragFrame.current !== undefined) return;
    dragFrame.current = window.requestAnimationFrame(() => {
      dragFrame.current = undefined;
      const latest = latestDragPosition.current;
      const activePress = pressRef.current;
      if (!latest || !activePress || !didDrag.current) return;
      const targetId = nearestLegalNode(latest.x, latest.y);
      const target = targetId === null ? null : nodeById.get(targetId) ?? null;
      setDragTarget(targetId);
      const nearNode = targetId === null ? nearestNode(latest.x, latest.y) : null;
      setDragInvalidTarget(nearNode !== null && !highlights.has(nearNode) ? nearNode : null);
      setDrag({ pieceId: activePress.pieceId, svgX: target?.x ?? latest.x, svgY: target?.y ?? latest.y });
    });
  }

  function onSvgPointerUp(e: React.PointerEvent<SVGSVGElement>) {
    // Đọc press trước khi null hoá — tránh stale closure nếu setDrag chưa trigger re-render
    const press = pressRef.current;
    pressRef.current = null;
    window.cancelAnimationFrame(dragFrame.current ?? 0);
    dragFrame.current = undefined;
    latestDragPosition.current = null;
    if (canInteract && didDrag.current && press) {
      const pos = toSvg(e.clientX, e.clientY);
      const best = nearestLegalNode(pos.x, pos.y);
      if (best !== null) {
        setInvalidNode(null);
        window.clearTimeout(invalidTimer.current);
        invalidRevision.current += 1;
        animateDropTo(press.pieceId, pos.x, pos.y, best, press.svgX, press.svgY);
        makeMove(room!.id, { pieceId: press.pieceId, to: best });
        setSelected(null);
      } else {
        animatePieceReturn(press.pieceId, pos.x, pos.y, press.svgX, press.svgY);
        const rejectedNode = nearestNode(pos.x, pos.y, 40);
        if (rejectedNode !== null) flashInvalidNode(rejectedNode);
      }
    }
    setDrag(null);
    setDragTarget(null);
    setDragInvalidTarget(null);
    didDrag.current = false;
  }

  function onSvgPointerCancel(e: React.PointerEvent<SVGSVGElement>) {
    const press = pressRef.current;
    window.cancelAnimationFrame(dragFrame.current ?? 0);
    dragFrame.current = undefined;
    latestDragPosition.current = null;
    if (press && didDrag.current) {
      const pos = toSvg(e.clientX, e.clientY);
      animatePieceReturn(press.pieceId, pos.x, pos.y, press.svgX, press.svgY);
    }
    pressRef.current = null;
    setDrag(null);
    setDragTarget(null);
    setDragInvalidTarget(null);
    didDrag.current = false;
  }

  const dragColor = drag ? (drag.pieceId[0] === "R" ? "#e7463c" : "#f4f6ff") : null;

  return (
    <div ref={rootRef} className={`animate-board-enter relative flex flex-col gap-3 w-full max-w-md mx-auto ${changeFlashClass(roomStatusChanged, "animate-board-enter")}`}>
      {captureFlights.length > 0 && (
        <div aria-hidden="true" className="vay-capture-flight-layer">
          {captureFlights.map((flight) => (
            <span
              key={flight.pieceId}
              className="vay-capture-flight"
              style={{
                left: `${flight.x}px`,
                top: `${flight.y}px`,
                "--capture-mid-x": `${flight.midX}px`,
                "--capture-mid-y": `${flight.midY}px`,
                "--capture-dx": `${flight.dx}px`,
                "--capture-dy": `${flight.dy}px`,
                "--capture-flight-delay": `${flight.delayMs}ms`,
                "--capture-piece-color": flight.color,
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}

      {/* Status bar */}
      <div className="bg-gradient-to-r from-[#1a1408] via-[#1c1810] to-[#1a1408] rounded-sm px-4 py-3 shadow-lg border border-amber-900/30">
        <div className="grid grid-cols-3 gap-1 text-center">
          <div>
            <div className="text-amber-700/60 text-xs mb-0.5">Bạn cầm</div>
            <div className={`font-bold text-sm ${mySide === "RED" ? "text-red-400" : mySide === "WHITE" ? "text-white" : "text-amber-800/50"}`}>
              {mySide === "RED" ? "🔴 Đỏ" : mySide === "WHITE" ? "⚪ Trắng" : "👁 Xem"}
            </div>
          </div>
          <div>
            <div className="text-amber-700/60 text-xs mb-0.5">Lượt</div>
            <div className={`font-bold text-sm ${changeFlashClass(turnChanged, "animate-turn-start")} ${state.turn === "RED" ? "text-red-400" : "text-white"}`}>
              {state.turn === "RED" ? "🔴 Đỏ" : "⚪ Trắng"}
            </div>
          </div>
          <div>
            <div className="text-amber-700/60 text-xs mb-0.5">Lượt Đỏ</div>
            <div className={`font-bold text-sm ${changeFlashClass(redTurnsChanged, "vay-turn-count-change")}`}><AnimatedNumber value={state.redTurnsUsed} /> / {state.maxRedTurns}</div>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-center gap-5 text-[10px] font-semibold text-amber-200/75">
          {(["🔴", "⚪"] as const).map((icon, index) => {
            const delta = captureDeltas.get(index) ?? 0;
            return (
              <span key={icon} data-vay-capture-count={index} className="relative inline-flex items-center gap-1">
          {icon} Bắt <AnimatedNumber value={capturedCounts[index]} delayMs={delta ? captureRevealDelay : 0} />
                {delta > 0 && <span key={`capture-delta-${index}-${delta}`} aria-hidden="true" style={{ animationDelay: `${captureRevealDelay}ms` }} className="game-value-delta is-gain">+{delta}</span>}
              </span>
            );
          })}
        </div>
        {canInteract && (
          <>
          <div className="animate-game-action-enter mt-2 text-center text-amber-300 font-medium text-sm flex items-center justify-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 game-turn-beacon shrink-0" />
            <span
              key={pendingDrop ? `pending-${pendingDrop.pieceId}-${pendingDrop.targetNodeId}` : drag ? (dragTarget === null ? "dragging" : `target-${dragTarget}`) : selected ? "selected" : "idle"}
              className="animate-game-action-enter"
            >
              {pendingDrop ? "\u0110ang ch\u1edd x\u00e1c nh\u1eadn n\u01b0\u1edbc \u0111i..." : drag
                ? dragTarget !== null ? `Thả để đi tới ô ${dragTarget}` : dragInvalidTarget !== null ? "Ô này không hợp lệ — đưa quân tới chấm xanh" : "Đưa quân tới chấm xanh"
                : selected ? "Dùng phím mũi tên rồi Enter/Space, hoặc chọn ô đích hay kéo quân" : "Chọn hoặc kéo quân của bạn"}
            </span>
          </div>
          <div key={invalidNode !== null ? `invalid-${invalidSequence}` : "turn-status"} className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {pendingDrop
              ? "\u0110ang ch\u1edd x\u00e1c nh\u1eadn n\u01b0\u1edbc \u0111i."
              : invalidNode !== null
                ? `Ô ${invalidNode} không phải đích hợp lệ. Quân vẫn được chọn.`
              : selected
                ? `\u0110\u00e3 ch\u1ecdn qu\u00e2n. ${highlights.size} \u00f4 \u0111\u00edch h\u1ee3p l\u1ec7. D\u00f9ng ph\u00edm m\u0169i t\u00ean \u0111\u1ec3 \u0111\u1ed5i \u0111\u00edch, Enter ho\u1eb7c Space \u0111\u1ec3 \u0111i.`
                : "\u0110\u1ebfn l\u01b0\u1ee3t b\u1ea1n. Ch\u1ecdn ho\u1eb7c k\u00e9o qu\u00e2n c\u1ee7a b\u1ea1n."}
          </div>
          </>
        )}
        {canInteract && <p className="mt-1 text-center text-[10px] text-amber-200/55">Dùng Tab để chọn ô; sau khi chọn quân, dùng phím mũi tên để chuyển đích. Enter/Space để xác nhận.</p>}
        {/* Nói rõ vì sao chưa đi được quân — im lặng khiến người chơi tưởng game lỗi */}
        {!myTurn && room.status === "Playing" && !state.winner && mySide && (
          <div className="animate-game-action-enter mt-2 text-center text-amber-400/50 font-medium text-sm flex items-center justify-center gap-1.5">
            <WaitingDots />
            Chờ đối thủ đi…
          </div>
        )}
        <div className="mt-1 text-center text-amber-800/50 text-xs font-mono">
          Phòng: <span className="font-mono">{room.id.slice(0, 8)}</span>
          {" · "}<span className={`inline-block ${changedIndexClass(joiningSeats, 0, room.seats[0]?.displayName ? "animate-seat-arrive" : "animate-seat-vacate")}`} style={{ animationDelay: "0ms" }}>🔴 {room.seats[0]?.displayName ?? "—"}</span>
          {" vs "}<span className={`inline-block ${changedIndexClass(joiningSeats, 1, room.seats[1]?.displayName ? "animate-seat-arrive" : "animate-seat-vacate")}`} style={{ animationDelay: "55ms" }}>⚪ {room.seats[1]?.displayName ?? "—"}</span>
        </div>
      </div>

      <ConnectionBanner connectionState={connectionState} />
      <DisconnectBadge seats={room.seats} />

      {/* Board */}
      <div className="bg-gradient-to-b from-[#1a2030] to-[#141820] rounded-sm p-2 shadow-lg border border-amber-900/30">
        <svg
          ref={svgRef}
          viewBox="0 0 400 440"
          className="w-full h-auto rounded-sm bg-[#0c1018] touch-none select-none"
          onPointerDown={onSvgPointerDown}
          onPointerMove={onSvgPointerMove}
          onPointerUp={onSvgPointerUp}
          onPointerCancel={onSvgPointerCancel}
        >
          {/* Cạnh đồ thị */}
          {map.edges.map(([a, b], i) => {
            const na = nodeById.get(a)!;
            const nb = nodeById.get(b)!;
            return (
              <line key={i} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                stroke="#3d4a6b" strokeWidth={3} strokeLinecap="round" />
            );
          })}

          {/* Đường chấm động chỉ dẫn các cạnh có thể đi của quân đang chọn. */}
          {selected && state.pieces[selected] !== undefined && canInteract && [...highlights].map((target) => {
            const from = nodeById.get(state.pieces[selected]);
            const to = nodeById.get(target);
            if (!from || !to) return null;
            return <line key={`legal-${selected}-${target}`} className={`vay-legal-route ${previewTarget === target ? "is-preview" : ""}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />;
          })}

          {/* Vệt nối vị trí cũ và mới để người xem bắt kịp nước đi. */}
          {[...movingPieces].map(([pieceId, fromNodeId]) => {
            const from = nodeById.get(fromNodeId);
            const toNodeId = state.pieces[pieceId];
            const to = toNodeId === undefined ? undefined : nodeById.get(toNodeId);
            if (!from || !to) return null;
            const color = pieceId[0] === "R" ? "#fb7185" : "#a7f3d0";
            return <line key={`trail-${pieceId}`} className="vay-move-trail" x1={from.x} y1={from.y} x2={to.x} y2={to.y} pathLength={1} stroke={color} strokeWidth={5} strokeLinecap="round" style={{ "--trail-color": color } as React.CSSProperties} />;
          })}

          {/* Đỉnh */}
          {map.nodes.map((n, targetIndex) => {
            const pid = occ.get(n.id);
            const isDragged = drag?.pieceId === pid || returningPiece?.pieceId === pid || pendingDrop?.pieceId === pid;
            const isHi = highlights.has(n.id);
            const isSel = pid === selected && !isDragged;
            const previousNodeId = pid ? movingPieces.get(pid) : undefined;
            const previousNode = previousNodeId === undefined ? undefined : nodeById.get(previousNodeId);
            const justMoved = !!pid && !!previousNode && previousNodeId !== n.id && !isDragged;

            const r = pid ? 20 : 15;
            const fill = pid
              ? isDragged ? "transparent"
              : pid[0] === "R" ? "#e7463c" : "#f4f6ff"
              : isHi ? "#0f2a1f" : "#1a2240";
            const stroke = pid
              ? isSel ? "#36d399" : "#0b0e1c"
              : isHi ? "#36d399" : "#3d4a6b";

            return (
              <g
                key={n.id}
                className={canInteract ? `vay-node-control ${pid && side(pid) === mySide && !isSel ? "vay-piece-control" : ""}` : undefined}
                role="button"
                tabIndex={canInteract ? 0 : -1}
                aria-disabled={!canInteract}
                aria-pressed={isSel}
                aria-keyshortcuts={selected ? "ArrowLeft ArrowRight ArrowUp ArrowDown Enter Space" : "Enter Space"}
                aria-label={`${n.id}: ${pid ? `quân ${pid[0] === "R" ? "đỏ" : "trắng"}${side(pid) === mySide ? " của bạn" : ""}` : "ô trống"}${isHi ? ", đích đi hợp lệ" : ""}`}
                data-vay-node-id={n.id}
                style={{ cursor: canInteract ? "pointer" : "default" }}
                onPointerEnter={() => { if (isHi) updatePreviewSource("pointer", n.id); }}
                onPointerLeave={() => {
                  if (pointerPreviewTarget.current === n.id) updatePreviewSource("pointer", null);
                }}
                onFocus={() => { if (isHi) updatePreviewSource("focus", n.id); }}
                onBlur={() => {
                  if (focusPreviewTarget.current === n.id) updatePreviewSource("focus", null);
                }}
                onKeyDown={(event) => {
                  if (selected && ["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown"].includes(event.key)) {
                    const targets = map.nodes.filter((candidate) => highlights.has(candidate.id));
                    if (targets.length > 0) {
                      event.preventDefault();
                      const direction = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
                      const activeId = Number((document.activeElement as HTMLElement | null)?.dataset.vayNodeId);
                      const activeIndex = targets.findIndex((target) => target.id === activeId);
                      const nextIndex = activeIndex < 0
                        ? (direction > 0 ? 0 : targets.length - 1)
                        : (activeIndex + direction + targets.length) % targets.length;
                      rootRef.current?.querySelector<SVGGElement>(`[data-vay-node-id="${targets[nextIndex].id}"]`)?.focus();
                      return;
                    }
                  }
                  if (!canInteract || (event.key !== "Enter" && event.key !== " ")) return;
                  event.preventDefault();
                  if (pid && side(pid) === mySide) {
                    setInvalidNode(null);
                    window.clearTimeout(invalidTimer.current);
                    invalidRevision.current += 1;
                    setSelected(pid);
                  } else if (selected && highlights.has(n.id)) {
                    setInvalidNode(null);
                    window.clearTimeout(invalidTimer.current);
                    invalidRevision.current += 1;
                    const fromNodeId = state.pieces[selected];
                    const fromNode = nodeById.get(fromNodeId);
                    if (fromNode) animateDropTo(selected, fromNode.x, fromNode.y, n.id);
                    makeMove(room.id, { pieceId: selected, to: n.id });
                    setSelected(null);
                  } else if (selected) {
                    flashInvalidNode(n.id);
                  }
                }}
              >
                {/* Vùng chạm rộng */}
                <circle cx={n.x} cy={n.y} r={34} fill="transparent" />
                <circle className="vay-node-focus" cx={n.x} cy={n.y} r={32} fill="none" pointerEvents="none" />
                <text x={n.x} y={n.y - 27} textAnchor="middle" fontSize={11}
                  fill={isSel || isHi ? "#8b9fd4" : "#4a5580"} style={{ pointerEvents: "none" }}>
                  {n.id}
                </text>
                {pid ? (
                  <g key={pid} transform={`translate(${n.x} ${n.y})`} style={{ pointerEvents: "none" }}>
                    {justMoved && previousNode && !prefersReducedMotion && (
                      <animateTransform
                        key={`${pid}-${previousNodeId}`}
                        attributeName="transform"
                        type="translate"
                        from={`${previousNode.x - n.x} ${previousNode.y - n.y}`}
                        to="0 0"
                        additive="sum"
                        calcMode="spline"
                        keyTimes="0;1"
                        keySplines="0.22 1 0.36 1"
                        dur="320ms"
                        fill="freeze"
                      />
                    )}
                    <circle className={`vay-piece ${justMoved ? "vay-piece-moving" : ""} ${isSel ? "vay-piece-selected" : ""}`} cx={0} cy={0} r={r}
                      fill={fill} stroke={stroke}
                      strokeWidth={isSel || isHi ? 3.5 : 2} />
                  </g>
                ) : (
                  <circle className={`vay-node ${isHi ? "vay-node-highlighted" : ""}`} cx={n.x} cy={n.y} r={r}
                    fill={fill} stroke={stroke}
                    strokeWidth={isSel || isHi ? 3.5 : 2}
                    style={{ pointerEvents: "none" }} />
                )}
                {justMoved && (
                  <circle key={`move-impact-${pid}-${previousNodeId}-${n.id}`} className="vay-move-impact"
                    cx={n.x} cy={n.y} r={25} fill="none" stroke={pid?.startsWith("R") ? "#fb7185" : "#a7f3d0"}
                    strokeWidth={2.5} style={{ pointerEvents: "none", "--impact-color": pid?.startsWith("R") ? "#fb7185" : "#a7f3d0" } as React.CSSProperties} />
                )}
                {/* Chấm xanh cho ô đích */}
                  {isHi && !pid && (
                  <circle key={`target-${selected}-${n.id}`} className="vay-target-pulse" cx={n.x} cy={n.y} r={7} fill="#36d399" stroke="#a7f3d0" strokeWidth={0} opacity={0.9}
                    style={{ pointerEvents: "none", "--target-delay": `${Math.min(targetIndex, 5) * 24}ms` } as React.CSSProperties} />
                )}
                {dragTarget === n.id && (
                  <circle className="vay-drag-target" cx={n.x} cy={n.y} r={28} fill="rgba(52,211,153,0.1)"
                    stroke="#a7f3d0" strokeWidth={2.5} strokeDasharray="6 4" style={{ pointerEvents: "none" }} />
                )}
                {dragInvalidTarget === n.id && dragTarget === null && (
                  <circle className="vay-drag-invalid-target" cx={n.x} cy={n.y} r={28} fill="rgba(248,113,113,0.12)"
                    stroke="#fca5a5" strokeWidth={2.5} strokeDasharray="5 4" style={{ pointerEvents: "none" }} />
                )}
                {invalidNode === n.id && (
                  <circle key={`invalid-${n.id}-${invalidSequence}`} className="vay-invalid-target" cx={n.x} cy={n.y} r={r + 7}
                    fill="rgba(248,113,113,0.08)" stroke="#f87171" strokeWidth={2.5}
                    style={{ pointerEvents: "none" }} />
                )}
                {/* Vòng sáng quanh quân đang được chọn */}
                {isSel && pid && (
                  <circle className="vay-selected-pulse" cx={n.x} cy={n.y} r={r + 6} fill="none"
                    stroke="#36d399" strokeWidth={2} opacity={0.5}
                    style={{ pointerEvents: "none" }} />
                )}
              </g>
            );
          })}

          {/* Captured pieces dissolve at their last server-confirmed position. */}
          {capturedPieces.map(({ pieceId, nodeId, delayMs }) => {
            const node = nodeById.get(nodeId);
            if (!node) return null;
            const color = pieceId[0] === "R" ? "#e7463c" : "#f4f6ff";
            return (
              <g key={`captured-${pieceId}`} transform={`translate(${node.x} ${node.y})`} style={{ pointerEvents: "none" }}>
                <circle className="vay-capture-ring" style={{ "--vay-capture-delay": `${delayMs}ms` } as React.CSSProperties} r={22} fill="none" stroke="#fbbf24" strokeWidth={2.5} strokeDasharray="7 5" />
                <circle className="vay-capture-burst" style={{ "--vay-capture-delay": `${delayMs}ms` } as React.CSSProperties} r={21} fill={color} stroke="#fbbf24" strokeWidth={3} />
              </g>
            );
          })}

          {/* Quân ma (ghost) khi đang kéo */}
          {drag && dragColor && (
            <g className="vay-drag-ghost" style={{ pointerEvents: "none" }}>
              <circle className="vay-drag-ghost-ring" cx={drag.svgX} cy={drag.svgY} r={30}
                fill="none" stroke="#a7f3d0" strokeWidth={1.5} />
              <circle cx={drag.svgX} cy={drag.svgY} r={22}
                fill={dragColor} stroke="#36d399" strokeWidth={3} opacity={0.92} />
            </g>
          )}
          {pendingDrop && (
            <g className="vay-drop-flight" style={{ pointerEvents: "none" }}>
              {pendingDrop.reducedMotion && <circle transform={`translate(${pendingDrop.toX} ${pendingDrop.toY})`} className="vay-drop-flight-ring" r={29} fill="none" stroke="#fbbf24" strokeWidth={2} strokeDasharray="6 4" />}
              {!pendingDrop.reducedMotion && (
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  from={`${pendingDrop.fromX} ${pendingDrop.fromY}`}
                  to={`${pendingDrop.toX} ${pendingDrop.toY}`}
                  calcMode="spline"
                  keyTimes="0;1"
                  keySplines="0.22 1 0.36 1"
                  dur="180ms"
                  fill="freeze"
                />
              )}
              {!pendingDrop.reducedMotion && <circle className="vay-drop-flight-ring" r={29} fill="none" stroke="#fbbf24" strokeWidth={2} strokeDasharray="6 4" />}
              <circle transform={pendingDrop.reducedMotion ? `translate(${pendingDrop.toX} ${pendingDrop.toY})` : undefined} r={22} fill={pendingDrop.pieceId[0] === "R" ? "#e7463c" : "#f4f6ff"}
                stroke={pendingDrop.pieceId[0] === "R" ? "#fb7185" : "#a7f3d0"} strokeWidth={3} />
            </g>
          )}
          {returningPiece && (
            <g className="vay-drag-return" style={{ pointerEvents: "none" }}>
              <animateTransform
                attributeName="transform"
                type="translate"
                from={`${returningPiece.fromX} ${returningPiece.fromY}`}
                to={`${returningPiece.toX} ${returningPiece.toY}`}
                calcMode="spline"
                keyTimes="0;1"
                keySplines="0.22 1 0.36 1"
                dur="280ms"
                fill="freeze"
              />
              <circle cx={0} cy={0} r={22}
                fill={returningPiece.pieceId[0] === "R" ? "#e7463c" : "#f4f6ff"}
                stroke="#36d399" strokeWidth={3} opacity={0.92} />
            </g>
          )}
        </svg>
      </div>

      {/* Thông báo */}
      {state.winner && resultReady && (
        <div className={`${!mySide ? "animate-victory-neutral" : state.winner === mySide ? "animate-victory-win" : "animate-victory-lose"} rounded-sm p-1 ${state.winner === "RED" ? "border border-red-700/40 bg-red-950/20 shadow-[0_0_20px_rgba(220,38,38,0.15)]" : "border border-amber-900/30 bg-amber-950/20"}`}>
          <div className={`rounded-sm p-4 text-center ${state.winner === "RED" ? "bg-gradient-to-b from-red-950/60 to-[#1c0808] border border-red-800/30" : "bg-[#1a1208]/60 border border-amber-900/30"}`}>
            <div className="game-result-emblem text-3xl mb-1">{state.winner === "RED" ? "🔴" : "⚪"}</div>
            <div className={`game-result-title font-bold text-base [text-shadow:0_1px_0_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.8)] ${state.winner === "RED" ? "text-red-200" : "text-white"}`}>
              {state.winner === "RED" ? "PHE ĐỎ THẮNG — đã vây bắt!" : "PHE TRẮNG THẮNG — trốn thoát!"}
            </div>
          </div>
        </div>
      )}
      <RoomStatusBanner room={room} mySide={mySide} />
      <RoomErrorBanner error={error} />

      {state.winner && resultReady && mySide && <RematchButton onRematch={onRematch} loading={rematching} />}
      <LeaveRoomButton onLeave={onLeave} />
    </div>
  );
}
