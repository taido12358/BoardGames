// Kiểu & helper RIÊNG của game Đua Xe Hoàng Đạo. Khớp CHÍNH XÁC với GameState/MapDef backend
// (Games/ZodiacRace/ZodiacRaceTypes.cs) — server là nguồn chân lý, helper ở đây chỉ hỗ trợ UI.

export interface MapDef {
  trackLength: number;
  crateTiles: number[];
}

export interface GameState {
  started: boolean;
  positions: number[];
  cratesCollected: number[];
  turn: number;
  lastRoll: number | null;
  winner: string | null; // "P0".."P{n-1}"
}

/** Chỉ một loại nước đi ở v1: đổ xúc xắc — không có payload nào khác. */
export type ZodiacRaceMove = { type: "ROLL" };

/** 12 cung hoàng đạo dùng làm biểu tượng xe theo seat index (lặp lại nếu >12 người — không xảy ra vì MaxPlayers=6). */
export const ZODIAC_ICONS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];

export function iconForSeat(index: number): string {
  return ZODIAC_ICONS[index % ZODIAC_ICONS.length];
}

/** side có dạng "P{index}" (mặc định IGameEngine.SideForSeat). */
export function seatIndexOfSide(side: string): number {
  return Number(side.slice(1));
}

export function isMyTurn(state: GameState, mySide: string | null): boolean {
  return state.started && state.winner === null && mySide !== null && seatIndexOfSide(mySide) === state.turn;
}
