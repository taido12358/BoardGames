import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useMuzzleFlash } from "./useMuzzleFlash";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useMuzzleFlash", () => {
  it("log mới thêm dòng 'sử dụng Bang!' → trả true, rồi tự tắt sau 300ms", () => {
    const { result, rerender } = renderHook(({ log }) => useMuzzleFlash(log), {
      initialProps: { log: ["Bắt đầu ván."] },
    });
    expect(result.current).toBe(false);

    rerender({ log: ["Bắt đầu ván.", "An sử dụng Bang! lên Bình."] });
    expect(result.current).toBe(true);

    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe(false);
  });

  it("log mới thêm dòng 'sử dụng Súng Gatling' → trả true", () => {
    const { result, rerender } = renderHook(({ log }) => useMuzzleFlash(log), {
      initialProps: { log: [] as string[] },
    });

    rerender({ log: ["An sử dụng Súng Gatling — tấn công tất cả người chơi khác!"] });

    expect(result.current).toBe(true);
  });

  it("log mới thêm dòng 'đáp trả bằng Bang! trong đấu súng' → trả true", () => {
    const { result, rerender } = renderHook(({ log }) => useMuzzleFlash(log), {
      initialProps: { log: [] as string[] },
    });

    rerender({ log: ["Bình đáp trả bằng Bang! trong đấu súng."] });

    expect(result.current).toBe(true);
  });

  it("log mới thêm dòng KHÔNG phải phát súng (vd bỏ Bang! để né Người da đỏ) → không kích hoạt", () => {
    const { result, rerender } = renderHook(({ log }) => useMuzzleFlash(log), {
      initialProps: { log: [] as string[] },
    });

    rerender({ log: ["An bỏ Bang! để né Người da đỏ!."] });

    expect(result.current).toBe(false);
  });

  it("log không đổi → không kích hoạt", () => {
    const initial = ["An sử dụng Bang! lên Bình."];
    const { result, rerender } = renderHook(({ log }) => useMuzzleFlash(log), { initialProps: { log: initial } });

    rerender({ log: initial });

    expect(result.current).toBe(false);
  });

  it("lần render đầu tiên (mount) không tính dù log đã có sẵn dòng bắn súng", () => {
    const { result } = renderHook(({ log }) => useMuzzleFlash(log), {
      initialProps: { log: ["An sử dụng Bang! lên Bình."] },
    });

    expect(result.current).toBe(false);
  });
});
