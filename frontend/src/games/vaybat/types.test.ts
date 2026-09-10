import { describe, expect, it } from "vitest";
import { buildAdjacency, legalMoves, occupancy, side, type GameState, type MapDef } from "./types";

const starMap: MapDef = {
  nodes: [
    { id: 0, x: 0, y: 0 },
    { id: 1, x: 0, y: 0 },
    { id: 2, x: 0, y: 0 },
    { id: 3, x: 0, y: 0 },
  ],
  edges: [[0, 1], [0, 2], [0, 3]],
  redCount: 3,
  whiteCount: 1,
  whiteStart: 0,
  redStartCandidates: [1, 2, 3],
  maxRedTurns: 15,
};

function makeState(pieces: Record<string, number>): GameState {
  return { pieces, turn: "RED", redTurnsUsed: 0, maxRedTurns: 15, winner: null, redStartPos: [] };
}

describe("side", () => {
  it("phân biệt quân Đỏ/Trắng theo chữ cái đầu của pieceId", () => {
    expect(side("R0")).toBe("RED");
    expect(side("W0")).toBe("WHITE");
  });
});

describe("buildAdjacency", () => {
  it("dựng đồ thị kề đối xứng (2 chiều) từ danh sách cạnh", () => {
    const adj = buildAdjacency(starMap);

    expect(adj.get(0)).toEqual(new Set([1, 2, 3]));
    expect(adj.get(1)).toEqual(new Set([0]));
  });

  it("đỉnh không có cạnh nào vẫn có key rỗng (không undefined)", () => {
    const map: MapDef = { ...starMap, nodes: [...starMap.nodes, { id: 4, x: 0, y: 0 }] };
    const adj = buildAdjacency(map);

    expect(adj.get(4)).toEqual(new Set());
  });
});

describe("occupancy", () => {
  it("đảo ngược map pieceId->node thành node->pieceId", () => {
    const state = makeState({ R0: 1, W0: 0 });

    const occ = occupancy(state);

    expect(occ.get(1)).toBe("R0");
    expect(occ.get(0)).toBe("W0");
    expect(occ.size).toBe(2);
  });
});

describe("legalMoves", () => {
  it("trả về các đỉnh kề còn trống, loại bỏ đỉnh đã có quân khác", () => {
    const state = makeState({ W0: 0, R0: 1, R1: 2 });

    const moves = legalMoves(starMap, state, "W0");

    expect(moves.sort()).toEqual([3]); // 1,2 đã bị chiếm; chỉ còn 3
  });

  it("không có nước đi hợp lệ khi mọi đỉnh kề đều bị chiếm", () => {
    const state = makeState({ W0: 0, R0: 1, R1: 2, R2: 3 });

    const moves = legalMoves(starMap, state, "W0");

    expect(moves).toEqual([]);
  });
});
