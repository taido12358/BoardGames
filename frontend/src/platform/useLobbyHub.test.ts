import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useLobbyHub } from "./useLobbyHub";
import { useGameRoomHubActions } from "./GameRoomHubContext";

vi.mock("./GameRoomHubContext", () => ({
  useGameRoomHubActions: vi.fn(),
}));

describe("useLobbyHub", () => {
  it("mount gọi subscribeLobby, unmount gọi unsubscribeLobby", () => {
    const subscribeLobby = vi.fn();
    const unsubscribeLobby = vi.fn();
    vi.mocked(useGameRoomHubActions).mockReturnValue({ subscribeLobby, unsubscribeLobby } as never);

    const { unmount } = renderHook(() => useLobbyHub());

    expect(subscribeLobby).toHaveBeenCalledTimes(1);
    expect(unsubscribeLobby).not.toHaveBeenCalled();

    unmount();

    expect(unsubscribeLobby).toHaveBeenCalledTimes(1);
  });
});
