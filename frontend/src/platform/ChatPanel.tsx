import { useEffect, useId, useRef, useState } from "react";
import { useGameStore } from "./gameStore";
import { useGameRoomHubActions } from "./GameRoomHubContext";

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

/**
 * Chat trong phòng — GENERIC cho mọi game (Platform, không phải riêng VayBat/Bang). Mount MỘT
 * lần ở RoomRoute.tsx cho mọi board thay vì mỗi game tự viết lại. Không lưu lịch sử (mất khi
 * rời phòng/tải lại trang) — xem GameHub.SendChatMessage.
 */
export default function ChatPanel({ roomId }: { roomId: string }) {
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
  const following = useRef(true);
  const [hasNewMessages, setHasNewMessages] = useState(false);

  useEffect(() => {
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
    <div className="w-full max-w-2xl mx-auto rounded-2xl border border-amber-900/30 bg-[#16120a] overflow-hidden shadow-inner">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          following.current = true;
          setHasNewMessages(false);
          setOpen((v) => !v);
        }}
        className="w-full flex items-center justify-between px-4 py-2.5 text-[11px] uppercase tracking-widest text-amber-500/70 hover:bg-amber-900/15 font-medium"
      >
        <span>💬 Trò Chuyện{chatMessages.length > 0 ? <span className="text-amber-600/80 normal-case ml-1">({chatMessages.length})</span> : ""}</span>
        <span className="text-amber-700/60">{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <div id={panelId} className="border-t border-amber-900/30">
          {hasNewMessages && <button type="button" onClick={() => {
            following.current = true;
            setHasNewMessages(false);
            listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
          }} className="m-2 rounded-lg bg-amber-900/60 px-3 py-2 text-xs text-amber-200 hover:bg-amber-800">Có tin nhắn mới · Xem tin mới</button>}
          <div ref={listRef} role="log" aria-label="Tin nhắn trong phòng" aria-live="polite" tabIndex={0}
            onScroll={(event) => {
              const list = event.currentTarget;
              following.current = list.scrollHeight - list.scrollTop - list.clientHeight < 32;
              if (following.current) setHasNewMessages(false);
            }} className="max-h-56 overflow-y-auto px-4 py-2 space-y-1.5 focus-visible:outline focus-visible:outline-amber-400">
            {chatMessages.length === 0 && (
              <p className="text-slate-500 text-xs text-center py-3">Chưa có tin nhắn nào.</p>
            )}
            {chatMessages.map((m, i) => (
              <div key={i} className="text-sm">
                <span className="text-amber-300 font-medium">{m.displayName}</span>{" "}
                <span className="text-slate-500 text-xs">{formatTime(m.sentAt)}</span>
                <div className="text-slate-200 break-words">{m.text}</div>
              </div>
            ))}
          </div>
          {connectionState !== "connected" && <p role="status" className="px-3 py-2 text-xs text-amber-300">Đang mất kết nối. Bạn có thể soạn tin và gửi khi kết nối trở lại.</p>}
          {sendError && <p role="alert" className="px-3 py-2 text-xs text-red-300">{sendError}</p>}
          <form onSubmit={handleSend} aria-busy={sending} className="flex gap-2 px-3 py-2.5 border-t border-amber-900/30">
            <input
              type="text"
              disabled={sending}
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
              placeholder="Nhắn gì đó…"
              aria-label="Nhập tin nhắn"
              className="min-w-0 flex-1 rounded-lg bg-[#120c08] border border-amber-900/50 px-3 py-1.5 text-sm text-amber-100 shadow-[inset_0_2px_3px_rgba(0,0,0,0.7)] outline-none focus:border-amber-500/60 focus:shadow-[inset_0_2px_3px_rgba(0,0,0,0.7),0_0_6px_rgba(217,119,6,0.2)] placeholder:text-amber-900/40"
            />
            <button
              type="submit"
              disabled={!text.trim() || sending || connectionState !== "connected"}
              className="relative shrink-0 rounded-lg bg-gradient-to-b from-amber-600 via-amber-700 to-amber-800 border-t border-amber-400/40 shadow-[0_2px_0_0_#451a03] hover:brightness-110 active:top-[1px] active:shadow-none disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 text-sm font-medium text-amber-50"
            >
              {sending ? "Đang gửi…" : "Gửi"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
