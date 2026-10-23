import { describe, expect, it } from "vitest";
import { localOutcome, type BangViewerState } from "./types";

function state(overrides: Partial<BangViewerState> = {}): BangViewerState {
  return {
    phase: "finished",
    players: [],
    currentPlayerId: null,
    turnNumber: 5,
    deckCount: 10,
    discardPile: [],
    pendingResponse: null,
    winner: "Sheriff",
    gameLog: [],
    you: { id: "p0", role: "Sheriff", roleDisplay: "Cảnh sát trưởng", hand: [], weapon: "Cattleman", weaponRange: 1 },
    ...overrides,
  };
}

describe("localOutcome", () => {
  it("khán giả (you=null) → neutral", () => {
    expect(localOutcome(state({ you: null }))).toBe("neutral");
  });

  it("chưa có winner → neutral", () => {
    expect(localOutcome(state({ winner: null }))).toBe("neutral");
  });

  it("Sheriff thắng, bạn là Sheriff → win", () => {
    expect(localOutcome(state({ winner: "Sheriff", you: { ...state().you!, role: "Sheriff" } }))).toBe("win");
  });

  it("Sheriff thắng, bạn là Deputy (cùng phe) → win", () => {
    expect(localOutcome(state({ winner: "Sheriff", you: { ...state().you!, role: "Deputy" } }))).toBe("win");
  });

  it("Sheriff thắng, bạn là Outlaw → lose", () => {
    expect(localOutcome(state({ winner: "Sheriff", you: { ...state().you!, role: "Outlaw" } }))).toBe("lose");
  });

  it("Outlaw thắng, bạn là Outlaw → win", () => {
    expect(localOutcome(state({ winner: "Outlaw", you: { ...state().you!, role: "Outlaw" } }))).toBe("win");
  });

  it("Outlaw thắng, bạn là Sheriff → lose", () => {
    expect(localOutcome(state({ winner: "Outlaw", you: { ...state().you!, role: "Sheriff" } }))).toBe("lose");
  });

  it("Renegade thắng, bạn là Renegade → win", () => {
    expect(localOutcome(state({ winner: "Renegade", you: { ...state().you!, role: "Renegade" } }))).toBe("win");
  });

  it("Renegade thắng, bạn là Deputy → lose", () => {
    expect(localOutcome(state({ winner: "Renegade", you: { ...state().you!, role: "Deputy" } }))).toBe("lose");
  });

  it("so sánh không phân biệt hoa/thường (winner viết thường lẫn vào vẫn đúng)", () => {
    expect(localOutcome(state({ winner: "outlaw", you: { ...state().you!, role: "Outlaw" } }))).toBe("win");
  });
});
