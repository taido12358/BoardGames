// Component "khung phòng" dùng CHUNG cho mọi game — thuần hiển thị, không tự fetch/kết
// nối gì, nhận toàn bộ dữ liệu qua props. Trước đây mỗi board (VayBat/Bang) tự chế lại
// các banner này riêng (chữ/style hơi khác nhau) — gộp về đây để nhất quán và để game mới
// không phải viết lại từ đầu.
import type { RoomDto, RoomStatus, SeatSlotDto } from "./types";
import type { ConnectionState } from "./gameStore";

export function RoomStatusBanner({ room, mySide }: { room: RoomDto; mySide: string | null }) {
  if (room.status === "Waiting") {
    const occupied = room.seats.filter((s) => s.displayName !== null).length;
    return (
      <div className="rounded-2xl p-3 text-center bg-amber-900/30 text-amber-300 text-sm border border-amber-800/50">
        Đang chờ {occupied}/{room.seatCount} người vào phòng… (chưa thể bắt đầu)
      </div>
    );
  }
  if (room.status === "Playing" && mySide === null) {
    return (
      <div className="rounded-xl p-2 text-center bg-amber-900/30 text-amber-300 text-sm">
        👁 Bạn đang xem — không thể chơi.
      </div>
    );
  }
  if (room.status === "Cancelled") {
    return (
      <div className="rounded-2xl p-3 text-center bg-slate-700/60 text-slate-300 text-sm border border-slate-600">
        Phòng đã bị huỷ.
      </div>
    );
  }
  if (room.status === "Abandoned") {
    return (
      <div className="rounded-2xl p-3 text-center bg-slate-700/60 text-slate-300 text-sm border border-slate-600">
        Phòng đã đóng do mất kết nối kéo dài.
      </div>
    );
  }
  return null;
}

export function DisconnectBadge({ seats }: { seats: SeatSlotDto[] }) {
  const disconnected = seats.filter((s) => s.displayName !== null && !s.connected);
  if (disconnected.length === 0) return null;
  return (
    <div className="rounded-xl p-2 text-center bg-orange-900/30 text-orange-300 text-xs border border-orange-800/50">
      {disconnected.map((s) => `⚠ ${s.displayName} mất kết nối`).join(" · ")}
    </div>
  );
}

export function ConnectionBanner({ connectionState }: { connectionState: ConnectionState }) {
  if (connectionState === "connected") return null;
  if (connectionState === "reconnecting") {
    return (
      <div className="rounded-xl p-2 text-center bg-amber-900/40 text-amber-300 text-xs">
        Đang kết nối lại…
      </div>
    );
  }
  return (
    <div className="rounded-xl p-2 text-center bg-red-900/40 text-red-300 text-xs">
      Mất kết nối tới máy chủ — vui lòng tải lại trang.
    </div>
  );
}

export function RoomErrorBanner({ error }: { error: string | null }) {
  if (!error) return null;
  return <div className="rounded-xl p-2.5 text-center bg-red-900/40 text-red-300 text-sm">{error}</div>;
}

export function LeaveRoomButton({ onLeave, label = "← Rời phòng" }: { onLeave: () => void; label?: string }) {
  return (
    <button
      onClick={onLeave}
      className="w-full rounded-xl bg-slate-700 hover:bg-slate-600 active:bg-slate-500 px-4 py-3 font-medium text-base transition-colors"
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
      className="w-full rounded-xl bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-500 disabled:opacity-50 disabled:cursor-wait px-4 py-3 font-medium text-base transition-colors"
    >
      {loading ? "Đang tạo phòng…" : "🔄 CHƠI LẠI"}
    </button>
  );
}

/** Lời mời chơi lại từ người khác còn đang ở phòng này — xem GameHub.AnnounceRematch. */
export function RematchInviteBanner({
  invite, onJoin,
}: { invite: { newRoomId: string; byDisplayName: string } | null; onJoin: (roomId: string) => void }) {
  if (!invite) return null;
  return (
    <div className="rounded-2xl p-3 bg-emerald-900/30 text-emerald-300 text-sm border border-emerald-700/50 flex items-center justify-between gap-2">
      <span>🔄 {invite.byDisplayName} đã tạo phòng chơi lại</span>
      <button
        onClick={() => onJoin(invite.newRoomId)}
        className="shrink-0 rounded-lg bg-emerald-700 hover:bg-emerald-600 px-3 py-1.5 text-xs font-semibold"
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
