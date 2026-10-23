import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useWeaponEquipFlash } from "./useWeaponEquipFlash";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useWeaponEquipFlash", () => {
  it("tên vũ khí đổi → trả true, rồi tự tắt sau 500ms", () => {
    const { result, rerender } = renderHook(({ w }) => useWeaponEquipFlash(w), { initialProps: { w: "Cattleman" } });
    expect(result.current).toBe(false);

    rerender({ w: "Volcanic" });
    expect(result.current).toBe(true);

    act(() => vi.advanceTimersByTime(500));
    expect(result.current).toBe(false);
  });

  it("tên vũ khí không đổi → không kích hoạt", () => {
    const { result, rerender } = renderHook(({ w }) => useWeaponEquipFlash(w), { initialProps: { w: "Cattleman" } });

    rerender({ w: "Cattleman" });

    expect(result.current).toBe(false);
  });

  it("lần render đầu tiên (mount) không tính là vừa trang bị dù không phải Cattleman mặc định", () => {
    const { result } = renderHook(({ w }) => useWeaponEquipFlash(w), { initialProps: { w: "Schofield" } });

    expect(result.current).toBe(false);
  });

  it("đổi vũ khí 2 lần liên tiếp trước khi hết 500ms vẫn giữ trạng thái flash", () => {
    const { result, rerender } = renderHook(({ w }) => useWeaponEquipFlash(w), { initialProps: { w: "Cattleman" } });

    rerender({ w: "Volcanic" });
    act(() => vi.advanceTimersByTime(300));
    rerender({ w: "Remington" });
    act(() => vi.advanceTimersByTime(300));

    expect(result.current).toBe(true); // timer thứ 2 (bắt đầu lúc t=300) chưa chạy hết tới t=800
  });
});
