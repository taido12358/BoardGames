// Kiểu dữ liệu GENERIC của platform — không gắn với game cụ thể nào.
// map/state để dạng tham số generic; mỗi game tự ép kiểu theo gameKey.

export interface RoomDto<TMap = unknown, TState = unknown> {
  id: string;
  gameKey: string;
  status: "Waiting" | "Playing" | "Finished";
  redPlayer: string | null;
  whitePlayer: string | null;
  winner: string | null;
  map: TMap;
  state: TState;
  createdAt: string;
  /** Ghế generic cho game > 2 người (vd Bang) — game 2 người (VayBat) để mảng rỗng. */
  seatCount: number;
  seats: (string | null)[];
}

export interface EngineInfo {
  key: string;
  displayName: string;
  minPlayers: number;
  maxPlayers: number;
}
