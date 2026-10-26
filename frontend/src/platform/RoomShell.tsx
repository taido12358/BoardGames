// Component "khung phòng" dùng CHUNG cho mọi game — thuần hiển thị, không tự fetch/kết
// nối gì, nhận toàn bộ dữ liệu qua props. Trước đây mỗi board (VayBat/Bang) tự chế lại
// các banner này riêng (chữ/style hơi khác nhau) — gộp về đây để nhất quán và để game mới
// không phải viết lại từ đầu.
import type { RoomDto, RoomStatus, SeatSlotDto } from "./types";
import type { ConnectionState } from "./gameStore";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotionPreference } from "../hooks/useReducedMotionPreference";

function useExitNotice(value: string | null) {
  const reducedMotion = useReducedMotionPreference();
  const [displayed, setDisplayed] = useState(value);
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useLayoutEffect(() => {
    window.clearTimeout(timer.current);
    if (value) {
      if (value !== displayed) setDisplayed(value);
      setLeaving(false);
    } else if (displayed) {
      setLeaving(true);
      timer.current = window.setTimeout(() => {
        setDisplayed(null);
        setLeaving(false);
      }, reducedMotion ? 1 : 180);
    }
  }, [value, displayed, reducedMotion]);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    if (!reducedMotion || !leaving) return;
    window.clearTimeout(timer.current);
    setDisplayed(null);
    setLeaving(false);
  }, [reducedMotion, leaving]);
  return { displayed, leaving };
}

export function RoomStatusBanner({ room, mySide }: { room: RoomDto; mySide: string | null }) {
  const occupied = room.seats.filter((s) => s.displayName !== null).length;
  const waitingValue = room.status === "Waiting" ? String(occupied) : null;
  const { displayed: displayedWaitingCount, leaving: waitingIsLeaving } = useExitNotice(waitingValue);
  const waitingBanner = displayedWaitingCount && (
    <div role="status" aria-live="polite" aria-atomic="true" aria-hidden={waitingIsLeaving || undefined} className={`inline-flex items-center gap-2 rounded-full border border-amber-700/40 bg-[#0d0905]/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-amber-300 shadow-[inset_0_1px_2px_rgba(0,0,0,0.8),0_2px_6px_rgba(0,0,0,0.5)] animate-game-action-enter ${waitingIsLeaving ? "connection-banner-exit" : ""}`}>
      <span className="relative flex h-2 w-2 shrink-0">
        {!waitingIsLeaving && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />}
        <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_6px_#f59e0b]" />
      </span>
      Đang chờ <span key={displayedWaitingCount} className="room-waiting-count-change">{displayedWaitingCount}</span>/{room.seatCount} người vào phòng…
    </div>
  );
  if (room.status === "Waiting") {
    return (
      <div className="flex justify-center">
        {waitingBanner}
      </div>
    );
  }
  if (room.status === "Playing" && mySide === null) {
    return (
      <div className="flex flex-col items-center gap-2">{waitingBanner}<div key="spectating" className="animate-game-action-enter rounded-sm p-2 text-center bg-amber-900/30 text-amber-300 text-sm">👁 Bạn đang xem — không thể chơi.</div></div>
    );
  }
  if (room.status === "Cancelled") {
    return (
      <div className="animate-game-action-enter rounded-sm p-3 text-center bg-[#1a1208] text-amber-700/60 text-sm border border-amber-900/30">
        Phòng đã bị huỷ.
      </div>
    );
  }
  if (room.status === "Abandoned") {
    return (
      <div className="animate-game-action-enter rounded-sm p-3 text-center bg-[#1a1208] text-amber-700/60 text-sm border border-amber-900/30">
        Phòng đã đóng do mất kết nối kéo dài.
      </div>
    );
  }
  return waitingBanner ? <div className="flex justify-center">{waitingBanner}</div> : null;
}

export function DisconnectBadge({ seats }: { seats: SeatSlotDto[] }) {
  const disconnected = seats.filter((s) => s.displayName !== null && !s.connected);
  const value = disconnected.length ? JSON.stringify(disconnected.map((seat) => seat.displayName)) : null;
  const { displayed, leaving } = useExitNotice(value);
  if (!displayed) return null;
  const displayedNames = JSON.parse(displayed) as string[];
  return (
    <div key={displayed} role="status" aria-atomic="true" aria-hidden={leaving || undefined} className={`animate-game-action-enter rounded-sm p-2 text-center bg-orange-900/30 text-orange-300 text-xs border border-orange-800/50 ${leaving ? "connection-banner-exit" : ""}`}>
      {displayedNames.map((name) => `⚠ ${name} mất kết nối`).join(" · ")}
    </div>
  );
}

export function ConnectionBanner({ connectionState }: { connectionState: ConnectionState }) {
  const { displayed, leaving } = useExitNotice(connectionState === "connected" ? null : connectionState);
  if (!displayed) return null;
  const displayedState = displayed as Exclude<ConnectionState, "connected">;
  const bannerClass = `animate-game-action-enter rounded-sm p-2 text-center text-xs ${leaving ? "connection-banner-exit" : ""}`;
  if (displayedState === "connecting") return <div key={displayedState} role="status" aria-hidden={leaving || undefined} className={`${bannerClass} bg-amber-900/40 text-amber-300`}>Đang kết nối máy chủ trò chơi…</div>;
  if (displayedState === "reconnecting") {
    return (
      <div key={displayedState} role="status" aria-hidden={leaving || undefined} aria-atomic="true" className={`${bannerClass} bg-amber-900/40 text-amber-300`}>
        Đang kết nối lại…
      </div>
    );
  }
  return (
    <div key={displayedState} role="alert" aria-hidden={leaving || undefined} className={`${bannerClass} bg-red-900/40 text-red-300`}>
      Mất kết nối tới máy chủ — vui lòng tải lại trang.
    </div>
  );
}

export function RoomErrorBanner({ error }: { error: string | null }) {
  const { displayed, leaving } = useExitNotice(error);
  if (!displayed) return null;
  return <div key={displayed} role="alert" aria-hidden={leaving || undefined} className={`animate-game-action-enter rounded-sm p-2.5 text-center bg-[#7a201b]/40 text-[#c88080] border border-[#9a3030]/40 text-sm break-words ${leaving ? "connection-banner-exit" : ""}`}>{displayed}</div>;
}

export function LeaveRoomButton({ onLeave, label = "← Rời phòng" }: { onLeave: () => void; label?: string }) {
  return (
    <button
      onClick={onLeave}
      className="room-action-button w-full rounded-sm border border-[#6b4725]/60 bg-[#22140c]/90 px-4 py-3 text-sm font-medium uppercase tracking-wide text-[#bba182] shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)] hover:-translate-y-0.5 hover:border-[#b47a3c]/80 hover:bg-[#2c1a10] hover:text-[#f3d4a2] active:translate-y-0.5 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 transition-all"
    >
      {label}
    </button>
  );
}

/** Nút "chơi lại" — chỉ hiện cho người TỪNG chơi ván vừa kết thúc (server cũng tự kiểm lại, xem RoomService.CreateRematchAsync). */
export function RematchButton({ onRematch, loading }: { onRematch: () => void; loading: boolean }) {
  return (
    <button
      onClick={onRematch}
      disabled={loading}
      aria-busy={loading}
      aria-label={loading ? "Đang tạo phòng chơi lại" : "Chơi lại"}
      className="animate-game-action-enter room-action-button w-full rounded-sm font-bold text-base text-[#271206] bg-gradient-to-b from-[#fce295] via-[#df9031] to-[#87460e] px-4 py-3 border-t border-[#fff4d1] border-b-4 border-[#4d2506] shadow-[0_6px_16px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:-translate-y-0.5 hover:brightness-110 active:translate-y-1 active:scale-[0.99] active:border-b-0 active:shadow-[0_2px_4px_rgba(0,0,0,0.9)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 transition-all duration-150 disabled:opacity-50 disabled:cursor-wait"
    >
      {loading ? <><span aria-hidden="true" className="rematch-spinner">🔄</span> Đang tạo phòng…</> : "🔄 CHƠI LẠI"}
    </button>
  );
}

/** Lời mời chơi lại từ người khác còn đang ở phòng này — xem GameHub.AnnounceRematch. */
export function RematchInviteBanner({
  invite, onJoin,
}: { invite: { newRoomId: string; byDisplayName: string } | null; onJoin: (roomId: string) => void }) {
  if (!invite) return null;
  return (
    <div key={invite.newRoomId} className="animate-game-action-enter relative overflow-hidden rounded-sm p-3 bg-amber-950/30 text-amber-200 text-sm border border-amber-700/40 flex items-center justify-between gap-2">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
      <span>🔄 {invite.byDisplayName} đã tạo phòng chơi lại</span>
      <button
        onClick={() => onJoin(invite.newRoomId)}
        className="room-action-button relative shrink-0 rounded-sm font-semibold text-[#271206] text-xs bg-gradient-to-b from-[#fce295] via-[#df9031] to-[#87460e] px-3 py-1.5 border-t border-[#fff4d1] border-b-2 border-[#4d2506] shadow-[0_3px_8px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.3)] hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:scale-[0.98] active:border-b-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 transition-all duration-150"
      >
        VÀO PHÒNG
      </button>
    </div>
  );
}

/** Phòng mở (còn hiển thị trong sảnh) là Waiting/Playing — dùng thay cho `status !== "Finished"` cũ. */
export function isOpenStatus(status: RoomStatus): boolean {
  return status === "Waiting" || status === "Playing";
}
