import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useCardDrawFlash } from "./useCardDrawFlash";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useCardDrawFlash", () => {
  it("số lá tăng → trả true, rồi tự tắt sau 500ms", () => {
    const { result, rerender } = renderHook(({ n }) => useCardDrawFlash(n), { initialProps: { n: 2 } });
    expect(result.current).toBe(false);

    rerender({ n: 3 });
    expect(result.current).toBe(true);

    act(() => vi.advanceTimersByTime(500));
    expect(result.current).toBe(false);
  });

  it("số lá giảm (đánh/bỏ bài) → không kích hoạt", () => {
    const { result, rerender } = renderHook(({ n }) => useCardDrawFlash(n), { initialProps: { n: 4 } });

    rerender({ n: 3 });

    expect(result.current).toBe(false);
  });

  it("số lá không đổi → không kích hoạt", () => {
    const { result, rerender } = renderHook(({ n }) => useCardDrawFlash(n), { initialProps: { n: 4 } });

    rerender({ n: 4 });

    expect(result.current).toBe(false);
  });

  it("lần render đầu tiên (mount) không tính là vừa rút bài dù số lá lớn", () => {
    const { result } = renderHook(({ n }) => useCardDrawFlash(n), { initialProps: { n: 5 } });

    expect(result.current).toBe(false);
  });

  it("rút liên tiếp 2 lần trước khi hết 500ms vẫn giữ trạng thái flash", () => {
    const { result, rerender } = renderHook(({ n }) => useCardDrawFlash(n), { initialProps: { n: 2 } });

    rerender({ n: 3 });
    act(() => vi.advanceTimersByTime(300));
    rerender({ n: 4 });
    act(() => vi.advanceTimersByTime(300));

    expect(result.current).toBe(true); // timer thứ 2 (bắt đầu lúc t=300) chưa chạy hết tới t=800
  });
});
