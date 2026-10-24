import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useGameStore } from "./gameStore";
import { useGameRoomHubActions } from "./GameRoomHubContext";
import { formatTimestamp } from "./formatTimestamp";
import { useReducedMotionPreference } from "../hooks/useReducedMotionPreference";

/**
 * Chat trong phòng — GENERIC cho mọi game (Platform, không phải riêng VayBat/Bang). Mount MỘT
 * lần ở RoomRoute.tsx cho mọi board thay vì mỗi game tự viết lại. Không lưu lịch sử (mất khi
 * rời phòng/tải lại trang) — xem GameHub.SendChatMessage.
 */
export default function ChatPanel({ roomId }: { roomId: string }) {
  const reducedMotion = useReducedMotionPreference();
  const chatMessages = useGameStore((s) => s.chatMessages);
  const connectionState = useGameStore((s) => s.connectionState);
  const { sendChatMessage } = useGameRoomHubActions();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const sendLock = useRef(false);
  const panelId = useId();
  const characterCountId = useId();
  const following = useRef(true);
  const previousRoomId = useRef(roomId);
  const previousMessageCount = useRef(chatMessages.length);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [animatedMessages, setAnimatedMessages] = useState<ReadonlyMap<number, number>>(new Map());
  const messageExpiries = useRef(new Map<number, number>());
  const messageDelays = useRef(new Map<number, number>());
  const messageTimer = useRef<number | undefined>(undefined);

  const scheduleMessageCleanup = useCallback(function armNextExpiry() {
    window.clearTimeout(messageTimer.current);
    const nextExpiry = Math.min(...messageExpiries.current.values());
    if (!Number.isFinite(nextExpiry)) return;
    messageTimer.current = window.setTimeout(() => {
      const now = performance.now();
      for (const [index, expiry] of messageExpiries.current) {
        if (expiry <= now) {
          messageExpiries.current.delete(index);
          messageDelays.current.delete(index);
        }
      }
      setAnimatedMessages(new Map(messageDelays.current));
      armNextExpiry();
    }, Math.max(0, nextExpiry - performance.now()));
  }, []);

  useLayoutEffect(() => {
    if (previousRoomId.current !== roomId) {
      previousRoomId.current = roomId;
      previousMessageCount.current = chatMessages.length;
      setHasNewMessages(false);
      messageExpiries.current.clear();
      messageDelays.current.clear();
      setAnimatedMessages(new Map());
      window.clearTimeout(messageTimer.current);
      return;
    }
    const previousCount = previousMessageCount.current;
    previousMessageCount.current = chatMessages.length;
    if (chatMessages.length < previousCount) {
      messageExpiries.current.clear();
      messageDelays.current.clear();
      setAnimatedMessages(new Map());
      window.clearTimeout(messageTimer.current);
      return;
    }
    if (chatMessages.length === previousCount) return;

    const now = performance.now();
    for (let index = previousCount; index < chatMessages.length; index += 1) {
      const delayMs = reducedMotion ? 0 : Math.min(index - previousCount, 4) * 40;
      messageDelays.current.set(index, delayMs);
      messageExpiries.current.set(index, now + (reducedMotion ? 1 : 360 + delayMs));
    }
    setAnimatedMessages(new Map(messageDelays.current));
    if (!open) setHasNewMessages(true);
    scheduleMessageCleanup();
  }, [chatMessages.length, open, roomId, scheduleMessageCleanup, reducedMotion]);

  useLayoutEffect(() => {
    if (!reducedMotion || !messageExpiries.current.size) return;
    const reducedExpiry = performance.now() + 1;
    for (const [index, expiry] of messageExpiries.current) {
      messageExpiries.current.set(index, Math.min(expiry, reducedExpiry));
      messageDelays.current.set(index, 0);
    }
    setAnimatedMessages(new Map(messageDelays.current));
    scheduleMessageCleanup();
  }, [reducedMotion, scheduleMessageCleanup]);

  useEffect(() => () => window.clearTimeout(messageTimer.current), []);

  useLayoutEffect(() => {
    if (!open) return;
    if (following.current) listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    else setHasNewMessages(true);
  }, [chatMessages, open]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sendLock.current || connectionState !== "connected") return;
    sendLock.current = true;
    setSending(true);
    setSendError("");
    try {
      const sent = await sendChatMessage(roomId, trimmed);
      if (sent === false) setSendError("Chưa gửi được tin nhắn. Nội dung được giữ lại để bạn thử lại.");
      else setText("");
    } catch {
      setSendError("Chưa gửi được tin nhắn. Nội dung được giữ lại để bạn thử lại.");
    } finally {
      sendLock.current = false;
      setSending(false);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto rounded-sm border border-amber-900/30 bg-[#16120a] overflow-hidden shadow-inner">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          following.current = true;
          setHasNewMessages(false);
          setOpen((v) => !v);
        }}
        className="w-full flex items-center justify-between px-4 py-2.5 text-[11px] uppercase tracking-widest text-amber-500/70 hover:bg-amber-900/15 active:scale-[0.995] focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400 transition-colors font-medium"
      >
        <span className="flex items-center gap-2">
          <span>💬 Trò Chuyện{chatMessages.length > 0 ? <span className="text-amber-600/80 normal-case ml-1">({chatMessages.length})</span> : ""}</span>
          {hasNewMessages && <span key={chatMessages.length} role="status" aria-label="Có tin nhắn mới" className="animate-game-action-enter rounded-full border border-amber-400/50 bg-amber-500/15 px-2 py-0.5 text-[9px] font-bold tracking-wider text-amber-200">MỚI</span>}
        </span>
        <span className="text-amber-700/60">{open ? "▾" : "▸"}</span>
      </button>

      <div id={panelId} aria-hidden={!open} className={`chat-panel-collapse ${open ? "is-open" : ""}`}>
        <div className="min-h-0 overflow-hidden border-t border-amber-900/30">
          {open && hasNewMessages && <button type="button" onClick={() => {
            following.current = true;
            setHasNewMessages(false);
            listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
          }} className="animate-game-action-enter m-2 rounded-sm bg-amber-900/60 px-3 py-2 text-xs text-amber-200 hover:bg-amber-800 transition-colors">Có tin nhắn mới · Xem tin mới</button>}
          <div ref={listRef} role="log" aria-label="Tin nhắn trong phòng" aria-live="polite" tabIndex={open ? 0 : -1}
            onScroll={(event) => {
              const list = event.currentTarget;
              following.current = list.scrollHeight - list.scrollTop - list.clientHeight < 32;
              if (following.current) setHasNewMessages(false);
            }} className="chat-message-list max-h-56 overflow-y-auto scroll-smooth px-4 py-2 space-y-1.5 focus-visible:outline focus-visible:outline-amber-400">
            {chatMessages.length === 0 && (
              <p className="text-amber-900/40 text-xs text-center py-3 italic">Chưa có tin nhắn nào.</p>
            )}
            {chatMessages.map((m, i) => (
              <div key={i} style={animatedMessages.has(i) ? { animationDelay: `${animatedMessages.get(i)}ms` } : undefined} className={`text-sm ${open && animatedMessages.has(i) ? "animate-log-entry" : ""}`}>
                <span className="text-[#e8c07e] font-medium">{m.displayName}</span>{" "}
                <span className="text-amber-700/50 text-xs">{formatTimestamp(m.sentAt, { hour: "2-digit", minute: "2-digit" })}</span>
                <div className="text-[#d4b996]/80 break-words">{m.text}</div>
              </div>
            ))}
          </div>
          {connectionState !== "connected" && <p role="status" className="animate-game-action-enter px-3 py-2 text-xs text-amber-300">Đang mất kết nối. Bạn có thể soạn tin và gửi khi kết nối trở lại.</p>}
          {sendError && <p role="alert" className="animate-game-action-enter px-3 py-2 text-xs text-[#c84040]">{sendError}</p>}
          <form onSubmit={handleSend} aria-busy={sending} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-1 px-3 py-2.5 border-t border-amber-900/30">
            <input
              type="text"
              disabled={!open || sending}
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
              aria-describedby={characterCountId}
              placeholder="Nhắn gì đó…"
              aria-label="Nhập tin nhắn"
              className="min-w-0 flex-1 rounded-sm bg-[#120c08] border border-amber-900/50 px-3 py-1.5 text-sm text-amber-100 shadow-[inset_0_2px_3px_rgba(0,0,0,0.7)] outline-none focus:border-amber-500/60 focus:shadow-[inset_0_2px_3px_rgba(0,0,0,0.7),0_0_6px_rgba(217,119,6,0.2)] placeholder:text-amber-900/40"
            />
            <button
              type="submit"
              disabled={!open || !text.trim() || sending || connectionState !== "connected"}
              aria-busy={sending}
              className="room-action-button shrink-0 rounded-sm font-bold text-[#271206] text-xs bg-gradient-to-b from-[#fce295] via-[#df9031] to-[#87460e] px-3 py-1.5 border-t border-[#fff4d1] border-b-2 border-[#4d2506] shadow-[0_2px_6px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.2)] hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:scale-[0.98] active:border-b-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {sending ? <><span aria-hidden="true" className="rematch-spinner inline-block">↻</span> Đang gửi…</> : "Gửi"}
            </button>
            <span id={characterCountId} aria-live="off" className={`col-span-2 text-right text-[10px] ${text.length >= 450 ? "text-amber-300/80" : "sr-only"}`}>
              {text.length}/500 ký tự
            </span>
          </form>
        </div>
      </div>
    </div>
  );
}
