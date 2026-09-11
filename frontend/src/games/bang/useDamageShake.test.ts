import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useDamageShake } from "./useDamageShake";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useDamageShake", () => {
  it("hp giảm → trả true, rồi tự tắt sau 400ms", () => {
    const { result, rerender } = renderHook(({ hp }) => useDamageShake(hp), { initialProps: { hp: 4 } });
    expect(result.current).toBe(false);

    rerender({ hp: 3 });
    expect(result.current).toBe(true);

    act(() => vi.advanceTimersByTime(400));
    expect(result.current).toBe(false);
  });

  it("hp tăng (hồi máu) → không kích hoạt rung", () => {
    const { result, rerender } = renderHook(({ hp }) => useDamageShake(hp), { initialProps: { hp: 2 } });

    rerender({ hp: 3 });

    expect(result.current).toBe(false);
  });

  it("hp không đổi → không kích hoạt rung", () => {
    const { result, rerender } = renderHook(({ hp }) => useDamageShake(hp), { initialProps: { hp: 4 } });

    rerender({ hp: 4 });

    expect(result.current).toBe(false);
  });

  it("lần render đầu tiên (mount) không tính là vừa bị đánh dù hp thấp", () => {
    const { result } = renderHook(({ hp }) => useDamageShake(hp), { initialProps: { hp: 1 } });

    expect(result.current).toBe(false);
  });

  it("mất máu liên tiếp 2 lần trước khi hết 400ms vẫn giữ trạng thái rung", () => {
    const { result, rerender } = renderHook(({ hp }) => useDamageShake(hp), { initialProps: { hp: 4 } });

    rerender({ hp: 3 });
    act(() => vi.advanceTimersByTime(200));
    rerender({ hp: 2 });
    act(() => vi.advanceTimersByTime(200));

    expect(result.current).toBe(true); // timer thứ 2 (bắt đầu lúc t=200) chưa chạy hết tới t=600
  });
});
