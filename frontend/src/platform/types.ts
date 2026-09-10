// Kiểu dữ liệu GENERIC của platform — không gắn với game cụ thể nào.
// map/state để dạng tham số generic; mỗi game tự ép kiểu theo gameKey.

export type RoomStatus = "Waiting" | "Playing" | "Finished" | "Cancelled" | "Abandoned";

/** Một ghế trong phòng — MỘT mô hình duy nhất dùng cho mọi game (kể cả 2 người). displayName null = ghế trống. */
export interface SeatSlotDto {
  displayName: string | null;
  connected: boolean;
  lastSeenAt: string | null;
}

export interface RoomDto<TMap = unknown, TState = unknown> {
  id: string;
  gameKey: string;
  status: RoomStatus;
  winner: string | null;
  map: TMap;
  state: TState;
  createdAt: string;
  seatCount: number;
  /** Luôn có đúng seatCount phần tử, kể cả VayBat (2 ghế) — không còn nhánh seatCount>2. */
  seats: SeatSlotDto[];
  ownerUserId: string;
  /** "RED"/"WHITE" (VayBat) hoặc "P0".."P7" (Bang); null = khán giả. Server tính sẵn theo JWT của người xem. */
  mySide: string | null;
  /** Server tính sẵn (so theo user id JWT, không phải tên hiển thị) — dùng để hiện nút quản lý phòng (huỷ…). */
  isMine: boolean;
}

/** Bản rút gọn của RoomDto dùng cho danh sách sảnh (không có map/state đầy đủ ván đấu). */
export interface RoomSummaryDto {
  id: string;
  gameKey: string;
  status: RoomStatus;
  createdAt: string;
  seatCount: number;
  seats: SeatSlotDto[];
  isMine: boolean;
}

/** Tin nhắn chat trong phòng — GENERIC cho mọi game, chỉ tồn tại trong bộ nhớ (không lưu DB). */
export interface ChatMessageDto {
  userId: string;
  displayName: string;
  text: string;
  sentAt: string;
}

/** Lời mời "chơi lại" nhận được từ một người khác còn đang ở phòng cũ (xem GameHub.AnnounceRematch). */
export interface RematchInviteDto {
  newRoomId: string;
  byDisplayName: string;
}

export interface EngineInfo {
  key: string;
  displayName: string;
  minPlayers: number;
  maxPlayers: number;
}
