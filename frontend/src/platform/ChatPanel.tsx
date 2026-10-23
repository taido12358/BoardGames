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
    <div className="w-full max-w-2xl mx-auto rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          following.current = true;
          setHasNewMessages(false);
          setOpen((v) => !v);
        }}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800/60"
      >
        <span>💬 Trò chuyện{chatMessages.length > 0 ? ` (${chatMessages.length})` : ""}</span>
        <span className="text-slate-500">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div id={panelId} className="border-t border-slate-800">
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
          <form onSubmit={handleSend} aria-busy={sending} className="flex gap-2 px-3 py-2.5 border-t border-slate-800">
            <input
              type="text"
              disabled={sending}
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
              placeholder="Nhắn gì đó…"
              aria-label="Nhập tin nhắn"
              className="min-w-0 flex-1 rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-500 placeholder:text-slate-500"
            />
            <button
              type="submit"
              disabled={!text.trim() || sending || connectionState !== "connected"}
              className="shrink-0 rounded-lg bg-amber-700 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 text-sm font-medium"
            >
              {sending ? "Đang gửi…" : "Gửi"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
