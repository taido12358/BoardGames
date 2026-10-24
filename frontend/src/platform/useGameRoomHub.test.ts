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
    state: "Connected",
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
  HubConnectionState: { Connected: "Connected" },
  HttpTransportType: { WebSockets: 1, ServerSentEvents: 2, LongPolling: 4 },
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
  mocks.conn.state = "Connected";
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
  it("sự kiện muộn sau unmount không nạp dữ liệu phiên cũ", () => {
    const { unmount } = renderHook(() => useGameRoomHub());
    unmount();
    fire("GameStateUpdated", room);
    fire("Seated", { side: "P0" });
    fire("Error", "lỗi kết nối cũ");
    fire("ChatMessageReceived", { text: "tin cũ" });
    fire("LobbyUpdated", { id: "old-room", createdAt: "2026-01-01" });
    fire("RematchAvailable", { newRoomId: "old-rematch" });
    expect(useGameStore.getState().room).toBeNull();
    expect(useGameStore.getState().mySide).toBeNull();
    expect(useGameStore.getState().error).toBe("");
    expect(useGameStore.getState().chatMessages).toEqual([]);
    expect(useGameStore.getState().rooms).toEqual([]);
    expect(useGameStore.getState().rematchInvite).toBeNull();
  });
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
  it("hủy khi đang chờ start không vào phòng cũ", async () => {
    let finish!: () => void;
    mocks.conn.start.mockReturnValueOnce(new Promise<void>((resolve) => { finish = resolve; }));
    const { result } = renderHook(() => useGameRoomHub());
    const controller = new AbortController();
    const joining = result.current.joinRoom("r1", controller.signal);
    controller.abort();
    finish();
    await joining;
    expect(mocks.conn.invoke).not.toHaveBeenCalledWith("JoinRoom", "r1");
  });
  it("vào phòng chờ start xong mới invoke JoinRoom", async () => {
    let finish!: () => void;
    mocks.conn.start.mockReturnValueOnce(new Promise<void>((resolve) => { finish = resolve; }));
    const { result } = renderHook(() => useGameRoomHub());
    const joining = result.current.joinRoom("r1");
    expect(mocks.conn.invoke).not.toHaveBeenCalled();
    finish();
    await joining;
    expect(mocks.conn.invoke).toHaveBeenCalledWith("JoinRoom", "r1");
  });

  it("ghi nhớ đăng ký sảnh trong lúc kết nối đang khởi động", async () => {
    let finish!: () => void;
    mocks.conn.state = "Connecting";
    mocks.conn.start.mockReturnValueOnce(new Promise<void>((resolve) => { finish = resolve; }));
    const { result } = renderHook(() => useGameRoomHub());
    result.current.subscribeLobby();
    expect(mocks.conn.invoke).not.toHaveBeenCalled();
    finish();
    await waitFor(() => expect(mocks.conn.invoke).toHaveBeenCalledWith("SubscribeLobby"));
  });
  it("đăng ký lại phòng lỗi không báo connected", async () => {
    renderHook(() => useGameRoomHub());
    await waitFor(() => expect(useGameStore.getState().connectionState).toBe("connected"));
    mocks.conn.invoke.mockRejectedValueOnce(new Error("join failed"));
    await fire("__reconnected");
    expect(useGameStore.getState().connectionState).toBe("disconnected");
    expect(useGameStore.getState().error).toContain("Chưa khôi phục được kết nối phòng");
  });
  it("khởi tạo hiển thị connecting rồi connected sau start", async () => {
    renderHook(() => useGameRoomHub());
    expect(useGameStore.getState().connectionState).toBe("connecting");
    await waitFor(() => expect(useGameStore.getState().connectionState).toBe("connected"));
  });
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

  it("makeMove khi hook đã dọn kết nối -> báo rõ thay vì bỏ thao tác im lặng", () => {
    const { result, unmount } = renderHook(() => useGameRoomHub());
    unmount();

    result.current.makeMove("r1", { type: "ROLL" });

    expect(mocks.conn.invoke).not.toHaveBeenCalled();
    expect(useGameStore.getState().error).toContain("Kết nối trò chơi chưa sẵn sàng");
  });

  it("makeMove khi hub đang reconnect -> không gửi thao tác và chỉ rõ trạng thái", () => {
    mocks.conn.state = "Reconnecting";
    const { result } = renderHook(() => useGameRoomHub());
    // useEffect starts hub; simulate the state after it has connected then begun reconnecting.
    mocks.conn.state = "Reconnecting";

    result.current.makeMove("r1", { type: "ROLL" });

    expect(mocks.conn.invoke).not.toHaveBeenCalled();
    expect(useGameStore.getState().error).toContain("Kết nối trò chơi chưa sẵn sàng");
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

  it("unmount gọi conn.stop() sau khi start settle để đóng kết nối an toàn", async () => {
    const { unmount } = renderHook(() => useGameRoomHub());
    unmount();
    await waitFor(() => expect(mocks.conn.stop).toHaveBeenCalled());
  });
});
