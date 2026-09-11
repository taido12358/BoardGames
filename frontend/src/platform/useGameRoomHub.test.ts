import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useGameRoomHub } from "./useGameRoomHub";
import { useGameStore } from "./gameStore";
import type { RoomDto } from "./types";

// HubConnectionBuilder/HubConnection thật sẽ tự mở WebSocket lúc start() — mock lại toàn bộ để
// test thuần logic (wiring event -> gameStore, reconnect re-đăng ký đúng phòng/sảnh) mà không
// cần server thật. vi.hoisted() vì vi.mock() bị hoist lên đầu file, không thấy được biến khai
// báo sau nó theo thứ tự bình thường.
const mocks = vi.hoisted(() => {
  const handlers: Record<string, (...args: unknown[]) => unknown> = {};
  const conn = {
    on: vi.fn((event: string, cb: (...args: unknown[]) => unknown) => { handlers[event] = cb; }),
    invoke: vi.fn(() => Promise.resolve()),
    start: vi.fn(() => Promise.resolve()),
    stop: vi.fn(() => Promise.resolve()),
    onreconnecting: vi.fn((cb: (...args: unknown[]) => unknown) => { handlers["__reconnecting"] = cb; }),
    onreconnected: vi.fn((cb: (...args: unknown[]) => unknown) => { handlers["__reconnected"] = cb; }),
    onclose: vi.fn((cb: (...args: unknown[]) => unknown) => { handlers["__close"] = cb; }),
  };
  return { handlers, conn };
});

vi.mock("@microsoft/signalr", () => ({
  HubConnectionBuilder: vi.fn().mockImplementation(() => ({
    withUrl: vi.fn().mockReturnThis(),
    withAutomaticReconnect: vi.fn().mockReturnThis(),
    build: vi.fn(() => mocks.conn),
  })),
}));

function fire(event: string, ...args: unknown[]) {
  return mocks.handlers[event]?.(...args);
}

const room = { id: "r1", gameKey: "vaybat" } as RoomDto;

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(mocks.handlers)) delete mocks.handlers[key];
  useGameStore.setState({
    room: null, mySide: null, error: "", connectionState: "connected",
    chatMessages: [], rematchInvite: null, roomsById: {}, rooms: [],
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useGameRoomHub — wiring sự kiện hub vào gameStore", () => {
  it("GameStateUpdated -> setRoom", () => {
    renderHook(() => useGameRoomHub());
    fire("GameStateUpdated", room);
    expect(useGameStore.getState().room).toEqual(room);
  });

  it("Seated -> setMySide", () => {
    renderHook(() => useGameRoomHub());
    fire("Seated", { side: "RED" });
    expect(useGameStore.getState().mySide).toBe("RED");
  });

  it("Error -> setError", () => {
    renderHook(() => useGameRoomHub());
    fire("Error", "Không đi được quân");
    expect(useGameStore.getState().error).toBe("Không đi được quân");
  });

  it("LobbyUpdated -> upsertRoom (thêm vào roomsById)", () => {
    renderHook(() => useGameRoomHub());
    const summary = { id: "r2", gameKey: "bang", status: "Waiting", createdAt: "2026-01-01" } as never;
    fire("LobbyUpdated", summary);
    expect(useGameStore.getState().roomsById["r2"]).toEqual(summary);
  });

  it("ChatMessageReceived -> addChatMessage", () => {
    renderHook(() => useGameRoomHub());
    const msg = { userId: "u1", displayName: "An", text: "chào", sentAt: "2026-01-01" } as never;
    fire("ChatMessageReceived", msg);
    expect(useGameStore.getState().chatMessages).toContainEqual(msg);
  });

  it("RematchAvailable -> setRematchInvite", () => {
    renderHook(() => useGameRoomHub());
    const invite = { oldRoomId: "r1", newRoomId: "r2" } as never;
    fire("RematchAvailable", invite);
    expect(useGameStore.getState().rematchInvite).toEqual(invite);
  });
});

describe("useGameRoomHub — trạng thái kết nối", () => {
  it("onreconnecting -> connectionState = reconnecting", () => {
    renderHook(() => useGameRoomHub());
    fire("__reconnecting");
    expect(useGameStore.getState().connectionState).toBe("reconnecting");
  });

  it("onclose -> connectionState = disconnected", () => {
    renderHook(() => useGameRoomHub());
    fire("__close");
    expect(useGameStore.getState().connectionState).toBe("disconnected");
  });

  it("onreconnected khi đang ở trong phòng -> connectionState=connected + gọi lại JoinRoom đúng phòng hiện tại", async () => {
    useGameStore.setState({ room });
    renderHook(() => useGameRoomHub());

    await fire("__reconnected");

    expect(useGameStore.getState().connectionState).toBe("connected");
    expect(mocks.conn.invoke).toHaveBeenCalledWith("JoinRoom", "r1");
  });

  it("onreconnected khi KHÔNG ở trong phòng nào -> gọi lại SubscribeLobby thay vì JoinRoom", async () => {
    useGameStore.setState({ room: null });
    renderHook(() => useGameRoomHub());

    await fire("__reconnected");

    expect(mocks.conn.invoke).toHaveBeenCalledWith("SubscribeLobby");
    expect(mocks.conn.invoke).not.toHaveBeenCalledWith("JoinRoom", expect.anything());
  });
});

describe("useGameRoomHub — các action gửi invoke", () => {
  it("joinRoom gọi đúng invoke JoinRoom", async () => {
    const { result } = renderHook(() => useGameRoomHub());
    await result.current.joinRoom("r1");
    expect(mocks.conn.invoke).toHaveBeenCalledWith("JoinRoom", "r1");
  });

  it("makeMove serialize move thành JSON string trước khi gửi", () => {
    const { result } = renderHook(() => useGameRoomHub());
    result.current.makeMove("r1", { pieceId: "R0", to: 5 });
    expect(mocks.conn.invoke).toHaveBeenCalledWith("MakeMove", "r1", JSON.stringify({ pieceId: "R0", to: 5 }));
  });

  it("makeMove thất bại -> hiện lỗi lên gameStore (không chỉ console.error)", async () => {
    mocks.conn.invoke.mockImplementationOnce(() => Promise.reject(new Error("network down")));
    const { result } = renderHook(() => useGameRoomHub());

    result.current.makeMove("r1", { type: "ROLL" });
    await waitFor(() => expect(useGameStore.getState().error).toContain("network down"));
  });

  it("sendChatMessage gọi đúng invoke SendChatMessage", async () => {
    const { result } = renderHook(() => useGameRoomHub());
    await result.current.sendChatMessage("r1", "chào");
    expect(mocks.conn.invoke).toHaveBeenCalledWith("SendChatMessage", "r1", "chào");
  });

  it("leaveRoom gọi đúng invoke LeaveRoom", async () => {
    const { result } = renderHook(() => useGameRoomHub());
    await result.current.leaveRoom("r1");
    expect(mocks.conn.invoke).toHaveBeenCalledWith("LeaveRoom", "r1");
  });

  it("unmount gọi conn.stop() để đóng kết nối", () => {
    const { unmount } = renderHook(() => useGameRoomHub());
    unmount();
    expect(mocks.conn.stop).toHaveBeenCalled();
  });
});
