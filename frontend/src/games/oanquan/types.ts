// Kiểu dữ liệu RIÊNG của game Ô Ăn Quan. Khớp CHÍNH XÁC với GameState/OAnQuanMove
// (backend Games/OAnQuan/OAnQuanTypes.cs) — đổi bên nào phải đổi bên kia theo.
//
// 12 ô theo một vòng cố định: [0]=Quan (phía P0), [1..5]=5 ô dân P0, [6]=Quan (phía P1),
// [7..11]=5 ô dân P1, rồi vòng lại [0]. Không có "map" — bàn cờ luôn cố định.

export type Side = "P0" | "P1";
export type Direction = "cw" | "ccw";

export interface GameState {
  pits: number[]; // luôn đúng 12 phần tử
  quanCaptured: [boolean, boolean];
  scores: [number, number];
  turn: Side;
  winner: Side | "DRAW" | null;
}

export type OAnQuanMove = { pitIndex: number; direction: Direction };

export const QUAN_INDEX: Record<Side, number> = { P0: 0, P1: 6 };
export const DAN_INDICES: Record<Side, number[]> = { P0: [1, 2, 3, 4, 5], P1: [7, 8, 9, 10, 11] };

export function isQuanPit(index: number): boolean {
  return index === 0 || index === 6;
}

export function ownerOf(index: number): Side {
  return index <= 5 ? "P0" : "P1"; // 0..5 = quan+dân P0, 6..11 = quan+dân P1
}

export function otherSide(side: Side): Side {
  return side === "P0" ? "P1" : "P0";
}
