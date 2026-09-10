import { useEffect, useRef, useState } from "react";
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
  const { sendChatMessage } = useGameRoomHubActions();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [chatMessages, open]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    sendChatMessage(roomId, trimmed);
    setText("");
  }

  return (
    <div className="w-full max-w-2xl mx-auto rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800/60"
      >
        <span>💬 Trò chuyện{chatMessages.length > 0 ? ` (${chatMessages.length})` : ""}</span>
        <span className="text-slate-500">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="border-t border-slate-800">
          <div ref={listRef} className="max-h-56 overflow-y-auto px-4 py-2 space-y-1.5">
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
          <form onSubmit={handleSend} className="flex gap-2 px-3 py-2.5 border-t border-slate-800">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
              placeholder="Nhắn gì đó…"
              aria-label="Nhập tin nhắn"
              className="flex-1 rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-500 placeholder:text-slate-500"
            />
            <button
              type="submit"
              disabled={!text.trim()}
              className="shrink-0 rounded-lg bg-amber-700 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 text-sm font-medium"
            >
              Gửi
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
