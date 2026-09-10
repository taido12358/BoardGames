import { describe, expect, it } from "vitest";
import { iconForSeat, isMyTurn, seatIndexOfSide, ZODIAC_ICONS, type GameState } from "./types";

function state(overrides: Partial<GameState> = {}): GameState {
  return {
    started: true,
    positions: [0, 0],
    cratesCollected: [0, 0],
    turn: 0,
    lastRoll: null,
    winner: null,
    ...overrides,
  };
}

describe("seatIndexOfSide", () => {
  it("đọc đúng index từ chuỗi side dạng P{index}", () => {
    expect(seatIndexOfSide("P0")).toBe(0);
    expect(seatIndexOfSide("P5")).toBe(5);
  });
});

describe("iconForSeat", () => {
  it("trả đúng icon cung hoàng đạo theo index", () => {
    expect(iconForSeat(0)).toBe(ZODIAC_ICONS[0]);
    expect(iconForSeat(1)).toBe(ZODIAC_ICONS[1]);
  });
});

describe("isMyTurn", () => {
  it("false nếu ván chưa bắt đầu", () => {
    expect(isMyTurn(state({ started: false }), "P0")).toBe(false);
  });

  it("false nếu ván đã kết thúc", () => {
    expect(isMyTurn(state({ winner: "P0" }), "P0")).toBe(false);
  });

  it("false cho khán giả (mySide null)", () => {
    expect(isMyTurn(state(), null)).toBe(false);
  });

  it("false nếu chưa tới lượt mình", () => {
    expect(isMyTurn(state({ turn: 1 }), "P0")).toBe(false);
  });

  it("true nếu đang tới lượt mình và ván đang diễn ra", () => {
    expect(isMyTurn(state({ turn: 0 }), "P0")).toBe(true);
  });
});
