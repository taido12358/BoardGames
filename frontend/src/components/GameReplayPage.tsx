import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useRef } from "react";
import { getGameTitle } from "../platform/gameRegistry";
import { lazy, Suspense } from "react";
const MonopolyReplayBoard = lazy(() => import("../games/monopoly/MonopolyReplayBoard"));

interface MoveEntry {
  moveNumber: number;
  side: string;
  move: unknown;
  state?: unknown;
}

interface Replay {
  id: string;
  gameKey: string;
  winner: string | null;
  seats: (string | null)[];
  moves: MoveEntry[];
  map?: unknown;
  finalState?: unknown;
}

type LoadState = "loading" | "ok" | "not-found" | "unavailable" | "error";

function moveSummary(move: unknown): string {
  if (!move || typeof move !== "object") return "Nước đi đã ghi nhận";
  const data = move as Record<string, unknown>;
  const type = typeof data.type === "string" ? data.type.replace(/_/g, "").toLowerCase() : "";
  switch (type) {
    case "playcard": return "Đánh bài";
    case "endturn": return "Kết thúc lượt";
    case "respond": return data.cardId ? "Dùng bài để phản hồi" : "Không dùng bài phản hồi";
    case "roll": return "Đổ xúc xắc";
    case "buy": return "Mua tài sản";
    case "decline": return "Đưa đất ra đấu giá";
    case "bid": return `Trả giá ${typeof data.amount === "number" ? data.amount : ""}`;
    case "pass": return "Bỏ đấu giá";
    case "build": return "Xây nhà";
    case "sell": case "sellgroup": return "Bán nhà";
    case "mortgage": return "Thế chấp";
    case "unmortgage": return "Giải chấp";
    case "trade": return "Đề nghị giao dịch";
    case "accept": return "Chấp nhận giao dịch";
    case "reject": return "Từ chối giao dịch";
    case "settle": return "Thanh toán nợ";
    case "bankrupt": return "Phá sản";
    case "end": return "Kết thúc lượt";
    case "roomfull": return "Bắt đầu ván";
    case "seattimeout": return "Xử lý mất kết nối";
    case "keepinherited": return "Giữ thế chấp thừa kế";
    case "redeeminherited": return "Giải chấp tài sản thừa kế";
    case "payjail": return "Nộp phí ra tù";
    case "jailcard": return "Dùng thẻ ra tù";
    case "requestbuild": return "Xác nhận mua nhà";
    case "skipbuild": return "Không mua nhà đợt này";
    default: return "Nước đi đã ghi nhận";
  }
}

/**
 * Xem lại diễn biến 1 ván đã kết thúc — `GET /api/games/:roomId/replay` đọc artifact đã lưu ở
 * MinIO lúc ván kết thúc (xem `GameHub.FinishGame`) nhưng CHƯA từng có giao diện gọi tới trước
 * 2026-09-11 (`MinioStorageService` trước đó chỉ ghi, không có cách đọc lại). Chỉ hiện tóm tắt +
 * danh sách nước đi theo thứ tự. Engine có public snapshot (Monopoly) hiển thị bàn cờ đúng
 * state sau từng hành động, không chạy lại RNG hoặc thay đổi phòng đang chơi trong store.
 */
export default function GameReplayPage() {
  const { roomId = "" } = useParams();
  const navigationState: unknown = useLocation().state;
  const historySearch = navigationState && typeof navigationState === "object" && "historySearch" in navigationState && typeof navigationState.historySearch === "string"
    ? new URLSearchParams(navigationState.historySearch).toString() : "";
  const historyUrl = historySearch ? `/history?${historySearch}` : "/history";
  const [state, setState] = useState<LoadState>("loading");
  const [replay, setReplay] = useState<Replay | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [replayStep, setReplayStep] = useState(-1);
  const [replaySelectionSequence, setReplaySelectionSequence] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackIntervalMs, setPlaybackIntervalMs] = useState(900);
  const activeMoveRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setState("loading");
    setReplay(null);
    setReplayStep(-1);
    setIsPlaying(false);
    fetch(`/api/games/${roomId}/replay`, { credentials: "include", signal: controller.signal })
      .then(async (res) => {
        if (!active) return;
        if (res.status === 404) {
          setState("not-found");
          return;
        }
        if (res.status === 503) {
          setState("unavailable");
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as Replay;
        if (!active) return;
        setReplay(body);
        setState("ok");
      })
      .catch(() => { if (active) setState("error"); });
    return () => { active = false; controller.abort(); };
  }, [roomId, attempt]);

  useEffect(() => {
    if (!isPlaying || !replay) return;
    if (replayStep >= replay.moves.length - 1) {
      setIsPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => setReplayStep((step) => step + 1), playbackIntervalMs);
    return () => window.clearTimeout(timer);
  }, [isPlaying, replay, replayStep, playbackIntervalMs]);

  useEffect(() => {
    if (replayStep < 0) return;
    const behavior: ScrollBehavior = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    activeMoveRef.current?.scrollIntoView?.({ behavior, block: "nearest" });
  }, [replayStep]);

  const selectReplayStep = (step: number) => {
    if (!replay) return;
    setReplaySelectionSequence((sequence) => sequence + 1);
    setIsPlaying(false);
    setReplayStep(Math.max(0, Math.min(replay.moves.length - 1, step)));
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-black tracking-wide text-[#f5d09d]">🎬 XEM LẠI VÁN ĐẤU</h1>
        <Link to={historyUrl} viewTransition className="text-sm text-amber-400/70 hover:text-amber-300 transition-colors">
          ← Lịch sử
        </Link>
      </div>

      {state === "loading" && <p role="status" className="animate-game-action-enter text-amber-700/60 text-sm text-center py-10 italic">Đang tải…</p>}

      {state === "not-found" && (
        <p className="animate-game-action-enter text-amber-700/50 text-sm text-center py-10 italic">Chưa có bản ghi lại cho ván này (ván chưa kết thúc hoặc không tồn tại).</p>
      )}

      {state === "unavailable" && (
        <div role="alert" className="animate-game-action-enter rounded-sm p-2.5 text-center bg-red-900/40 text-red-300 text-sm">
          Không tải được replay lúc này. Thử lại sau.
        </div>
      )}

      {state === "error" && (
        <div role="alert" className="animate-game-action-enter rounded-sm p-2.5 text-center bg-red-900/40 text-red-300 text-sm">Không tải được replay.</div>
      )}
      {(state === "error" || state === "unavailable") && <button onClick={() => setAttempt((value) => value + 1)} className="rounded-sm bg-amber-700 px-4 py-3 font-semibold text-white hover:bg-amber-600">Tải lại bản ghi</button>}

      {state === "ok" && replay && (
        <>
          <div className="animate-game-action-enter relative overflow-hidden rounded-sm border border-amber-500/20 bg-[#1a1208]/80 p-1">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
            <div className="rounded-sm border border-amber-500/30 bg-gradient-to-b from-[#2b2013] to-[#1a1208] p-4 space-y-1 text-sm">
            <p>
              <span className="text-amber-700/60">Trò chơi:</span> <span className="text-amber-200 font-medium">{getGameTitle(replay.gameKey)}</span>
            </p>
            <p>
              <span className="text-amber-700/60">Người chơi:</span>{" "}
              <span className="text-amber-300/70">{replay.seats.filter(Boolean).join(", ") || "—"}</span>
            </p>
            <p>
              <span className="text-amber-700/60">Thắng:</span> <span className="text-amber-300/70">{replay.winner ?? "—"}</span>
            </p>
            <p>
              <span className="text-amber-700/60">Số nước đi:</span> <span className="text-amber-300/70 font-mono">{replay.moves.length}</span>
            </p>
            </div>
          </div>

          {replay.gameKey === "monopoly" && replay.map && (
            <Suspense fallback={<p role="status" className="text-sm text-amber-300">Đang chuẩn bị bàn cờ phát lại…</p>}>
              <MonopolyReplayBoard roomId={replay.id} map={replay.map} seats={replay.seats}
                state={replayStep < 0 ? replay.moves[0]?.state ?? replay.finalState : replay.moves[replayStep]?.state} />
            </Suspense>
          )}

          <div className="animate-game-action-enter rounded-sm border border-amber-900/30 overflow-hidden">
            <div className="bg-gradient-to-r from-[#2b2013] to-[#1c150c] text-amber-400/70 text-xs uppercase px-3 py-2.5 tracking-widest border-b border-amber-900/30">Diễn biến</div>
            {replay.moves.length === 0 ? (
              <p className="text-amber-700/50 text-sm text-center py-8 italic">Ván này chưa có nước đi nào được ghi lại.</p>
            ) : (
              <>
              <div className="border-b border-amber-900/20 bg-[#160f09]/80 p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => selectReplayStep(0)} className="replay-control-button" aria-label="Về nước đi đầu tiên">⏮</button>
                  <button type="button" onClick={() => selectReplayStep(replayStep - 1)} disabled={replayStep <= 0} className="replay-control-button" aria-label="Nước đi trước">◀</button>
                  <button type="button" onClick={() => {
                    if (replayStep >= replay.moves.length - 1) setReplayStep(-1);
                    setIsPlaying((playing) => !playing);
                  }} className="replay-control-button replay-play-button" aria-label={isPlaying ? "Tạm dừng replay" : "Phát replay"} aria-pressed={isPlaying}>
                    <span key={isPlaying ? "playing" : "paused"} className="replay-play-state">{isPlaying ? "Ⅱ Tạm dừng" : "▶ Phát"}</span>
                  </button>
                  <button type="button" onClick={() => selectReplayStep(replayStep + 1)} disabled={replayStep >= replay.moves.length - 1} className="replay-control-button" aria-label="Nước đi tiếp theo">▶|</button>
                  <label className="ml-1 flex items-center gap-1.5 text-xs text-amber-500/70">
                    Tốc độ
                    <select aria-label="Tốc độ phát replay" value={playbackIntervalMs} onChange={(event) => setPlaybackIntervalMs(Number(event.target.value))} className="replay-speed-select rounded-sm border border-amber-800/50 bg-[#1a1208] px-1.5 py-1 text-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">
                      <option value={1800}>0.5×</option>
                      <option value={900}>1×</option>
                      <option value={600}>1.5×</option>
                      <option value={450}>2×</option>
                    </select>
                  </label>
                  <span className="ml-auto text-xs text-amber-500/70 tabular-nums" aria-live="polite">
                    {replayStep < 0 ? "Sẵn sàng" : `${replayStep + 1} / ${replay.moves.length}`}
                  </span>
                </div>
                <progress className="replay-progress w-full" aria-label="Tiến độ replay" max={replay.moves.length} value={replayStep + 1} />
              </div>
              <ul className="divide-y divide-amber-900/20 max-h-[28rem] overflow-y-auto">
                {replay.moves.map((m, index) => (
                  <li
                    key={`${m.moveNumber}-${replayStep === index ? replaySelectionSequence : 0}`}
                    ref={replayStep === index ? activeMoveRef : undefined}
                    aria-current={replayStep === index ? "step" : undefined}
                    className={`replay-move-row px-3 py-2 text-sm flex gap-3 hover:bg-amber-950/20 transition-colors ${replayStep === index ? "is-active" : ""} ${replayStep === index && isPlaying ? "is-playing" : ""}`}
                    style={replayStep === index && isPlaying ? { "--replay-step-duration": `${playbackIntervalMs}ms` } as import("react").CSSProperties : undefined}
                  >
                    <span className="text-amber-800/50 w-8 shrink-0 text-right font-mono">{index + 1}.</span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <button type="button" onClick={() => selectReplayStep(index)} aria-label={`Tua tới nước đi ${index + 1}`} className="replay-move-seek text-left text-amber-200/80 hover:text-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 rounded-sm">
                        <span className="text-amber-300 font-semibold">{m.side === "SYSTEM" ? "Hệ thống" : /^P\d+$/.test(m.side) ? replay.seats[Number(m.side.slice(1))] ?? m.side : m.side}</span> · {moveSummary(m.move)}
                      </button>
                      <details className="replay-move-details text-xs text-amber-700/60"><summary className="cursor-pointer py-1 hover:text-amber-400"><span aria-hidden="true" className="replay-details-chevron inline-block mr-1">›</span>Chi tiết nước đi</summary><div className="replay-move-details-content"><code className="block min-h-0 overflow-hidden break-all pt-1 text-amber-600/60">{JSON.stringify(m.move)}</code></div></details>
                    </div>
                  </li>
                ))}
              </ul>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
