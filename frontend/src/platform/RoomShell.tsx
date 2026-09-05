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

/** Phòng mở (còn hiển thị trong sảnh) là Waiting/Playing — dùng thay cho `status !== "Finished"` cũ. */
export function isOpenStatus(status: RoomStatus): boolean {
  return status === "Waiting" || status === "Playing";
}
