import { describe, expect, it } from "vitest";
import { DAN_INDICES, QUAN_INDEX, isQuanPit, ownerOf, otherSide } from "./types";

describe("QUAN_INDEX / DAN_INDICES", () => {
  it("khớp đúng bố cục 12 ô cố định (0=Quan P0, 1..5=dân P0, 6=Quan P1, 7..11=dân P1)", () => {
    expect(QUAN_INDEX.P0).toBe(0);
    expect(QUAN_INDEX.P1).toBe(6);
    expect(DAN_INDICES.P0).toEqual([1, 2, 3, 4, 5]);
    expect(DAN_INDICES.P1).toEqual([7, 8, 9, 10, 11]);
  });
});

describe("isQuanPit", () => {
  it("chỉ đúng ô 0 và ô 6 là ô quan", () => {
    expect(isQuanPit(0)).toBe(true);
    expect(isQuanPit(6)).toBe(true);
    for (const i of [1, 2, 3, 4, 5, 7, 8, 9, 10, 11]) expect(isQuanPit(i)).toBe(false);
  });
});

describe("ownerOf", () => {
  it("ô 0..5 (quan + dân P0) thuộc P0, ô 6..11 (quan + dân P1) thuộc P1", () => {
    for (const i of [0, 1, 2, 3, 4, 5]) expect(ownerOf(i)).toBe("P0");
    for (const i of [6, 7, 8, 9, 10, 11]) expect(ownerOf(i)).toBe("P1");
  });
});

describe("otherSide", () => {
  it("đảo P0<->P1", () => {
    expect(otherSide("P0")).toBe("P1");
    expect(otherSide("P1")).toBe("P0");
  });
});
