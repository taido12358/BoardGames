import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGameStore } from "./gameStore";
import type { ChatMessageDto, RoomSummaryDto } from "./types";

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: () => Promise.resolve(body) } as Response;
}

// KHÔNG dùng vi.unstubAllGlobals() ở đây — sẽ revert nhầm stub `localStorage` dùng chung của
// test-setup.ts (bài học đau từ authStore.test.ts, xem rules/coding/testing.md). Mỗi test tự
// gọi lại vi.stubGlobal("fetch", ...) để ghi đè mock cũ, không cần "unstub" giữa các lần.

function room(overrides: Partial<RoomSummaryDto> & { id: string; createdAt: string }): RoomSummaryDto {
  return {
    gameKey: "vaybat",
    status: "Waiting",
    seatCount: 2,
    seats: [],
    isMine: false,
    ...overrides,
  };
}

beforeEach(() => {
  // Reset về trạng thái sạch trước mỗi test — store là singleton dùng chung giữa các test file.
  useGameStore.setState({
    roomsById: {},
    rooms: [],
    chatMessages: [],
    rematchInvite: null,
    error: "",
  });
});

describe("upsertRoom", () => {
  it("thêm phòng mới và sắp lại theo createdAt giảm dần", () => {
    useGameStore.getState().upsertRoom(room({ id: "a", createdAt: "2026-01-01T00:00:00Z" }));
    useGameStore.getState().upsertRoom(room({ id: "b", createdAt: "2026-01-02T00:00:00Z" }));

    const ids = useGameStore.getState().rooms.map((r) => r.id);
    expect(ids).toEqual(["b", "a"]); // mới nhất trước
  });

  it("KHÔNG bao giờ hạ isMine true -> false chỉ vì một bản cập nhật broadcast đến sau", () => {
    // LobbyUpdated (broadcast dùng chung cho cả nhóm) luôn gửi isMine=false vì server không biết
    // đang gửi cho ai — nếu client đã biết chắc phòng này isMine=true (từ REST trước đó), một
    // bản cập nhật broadcast tới sau KHÔNG được ghi đè nó thành false.
    useGameStore.getState().upsertRoom(room({ id: "a", createdAt: "2026-01-01T00:00:00Z", isMine: true }));

    useGameStore.getState().upsertRoom(room({ id: "a", createdAt: "2026-01-01T00:00:00Z", status: "Playing", isMine: false }));

    const updated = useGameStore.getState().roomsById["a"];
    expect(updated.isMine).toBe(true); // giữ nguyên true
    expect(updated.status).toBe("Playing"); // nhưng các field khác vẫn được cập nhật
  });
});

describe("removeRoom", () => {
  it("xoá đúng phòng khỏi cả roomsById lẫn rooms (mảng dẫn xuất)", () => {
    useGameStore.getState().upsertRoom(room({ id: "a", createdAt: "2026-01-01T00:00:00Z" }));
    useGameStore.getState().upsertRoom(room({ id: "b", createdAt: "2026-01-02T00:00:00Z" }));

    useGameStore.getState().removeRoom("a");

    expect(useGameStore.getState().roomsById["a"]).toBeUndefined();
    expect(useGameStore.getState().rooms.map((r) => r.id)).toEqual(["b"]);
  });
});

describe("chat", () => {
  const msg = (text: string): ChatMessageDto => ({ userId: "u1", displayName: "An", text, sentAt: "2026-01-01T00:00:00Z" });

  it("addChatMessage nối tin nhắn mới vào cuối", () => {
    useGameStore.getState().addChatMessage(msg("chào"));
    useGameStore.getState().addChatMessage(msg("khoẻ không"));

    expect(useGameStore.getState().chatMessages.map((m) => m.text)).toEqual(["chào", "khoẻ không"]);
  });

  it("chỉ giữ tối đa 200 tin nhắn gần nhất, bỏ tin cũ nhất khi vượt quá", () => {
    for (let i = 0; i < 205; i++) useGameStore.getState().addChatMessage(msg(`tin ${i}`));

    const messages = useGameStore.getState().chatMessages;
    expect(messages).toHaveLength(200);
    expect(messages[0].text).toBe("tin 5"); // 5 tin đầu (0..4) đã bị đẩy ra
    expect(messages[199].text).toBe("tin 204");
  });

  it("clearChat xoá sạch danh sách tin nhắn", () => {
    useGameStore.getState().addChatMessage(msg("chào"));

    useGameStore.getState().clearChat();

    expect(useGameStore.getState().chatMessages).toEqual([]);
  });
});

describe("rematchInvite", () => {
  it("setRematchInvite lưu và xoá được lời mời", () => {
    useGameStore.getState().setRematchInvite({ newRoomId: "r1", byDisplayName: "An" });
    expect(useGameStore.getState().rematchInvite).toEqual({ newRoomId: "r1", byDisplayName: "An" });

    useGameStore.getState().setRematchInvite(null);
    expect(useGameStore.getState().rematchInvite).toBeNull();
  });
});

describe("setPlayerName", () => {
  it("lưu tên người chơi vào localStorage để giữ qua lần tải lại trang", () => {
    useGameStore.getState().setPlayerName("Bình");

    expect(useGameStore.getState().playerName).toBe("Bình");
    expect(localStorage.getItem("playerName")).toBe("Bình");
  });
});

describe("fetchEngines", () => {
  it("thành công: lưu danh sách engine, tắt loading, xoá lỗi cũ", async () => {
    useGameStore.setState({ enginesError: "lỗi cũ" });
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse([{ key: "vaybat", displayName: "Vây Bắt", minPlayers: 2, maxPlayers: 2 }]))));

    await useGameStore.getState().fetchEngines();

    expect(useGameStore.getState().engines).toEqual([{ key: "vaybat", displayName: "Vây Bắt", minPlayers: 2, maxPlayers: 2 }]);
    expect(useGameStore.getState().enginesLoading).toBe(false);
    expect(useGameStore.getState().enginesError).toBe("");
  });

  it("HTTP lỗi: giữ enginesError, tắt loading, KHÔNG throw", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse({}, false, 500))));

    await useGameStore.getState().fetchEngines();

    expect(useGameStore.getState().enginesError).toBe("Không thể tải danh sách trò chơi.");
    expect(useGameStore.getState().enginesLoading).toBe(false);
  });

  it("lỗi mạng: cũng set enginesError, không throw", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("network"))));

    await expect(useGameStore.getState().fetchEngines()).resolves.toBeUndefined();
    expect(useGameStore.getState().enginesError).toBe("Không thể tải danh sách trò chơi.");
  });
});

describe("fetchRooms", () => {
  it("thành công: gộp phòng mới vào roomsById đã có, sắp lại theo createdAt", async () => {
    useGameStore.getState().upsertRoom(room({ id: "old", createdAt: "2026-01-01T00:00:00Z" }));
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse([room({ id: "new", createdAt: "2026-01-02T00:00:00Z" })]))));

    await useGameStore.getState().fetchRooms();

    expect(useGameStore.getState().rooms.map((r) => r.id)).toEqual(["new", "old"]);
  });

  it("gửi đúng query gameKey khi được truyền vào", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(jsonResponse([])));
    vi.stubGlobal("fetch", fetchMock);

    await useGameStore.getState().fetchRooms("bang");

    expect(fetchMock).toHaveBeenCalledWith("/api/games?gameKey=bang");
  });

  it("lỗi mạng: im lặng bỏ qua (best-effort, không set error nào)", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("network"))));

    await expect(useGameStore.getState().fetchRooms()).resolves.toBeUndefined();
    expect(useGameStore.getState().error).toBe("");
  });
});

describe("createRoom", () => {
  it("thành công: trả về RoomDto, không set lỗi", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse({ id: "r1" }))));

    const result = await useGameStore.getState().createRoom("zodiacrace", { seatCount: 4 });

    expect(result).toEqual({ id: "r1" });
    expect(useGameStore.getState().error).toBe("");
  });

  it("gửi đúng gameKey/options trong body", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => Promise.resolve(jsonResponse({ id: "r1" })));
    vi.stubGlobal("fetch", fetchMock);

    await useGameStore.getState().createRoom("bang", { seatCount: 6 });

    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toEqual({ gameKey: "bang", options: { seatCount: 6 } });
  });

  it("thất bại: set lỗi, trả về null", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse({ error: "Game chưa hỗ trợ" }, false, 400))));

    const result = await useGameStore.getState().createRoom("khong-ton-tai", {});

    expect(result).toBeNull();
    expect(useGameStore.getState().error).toBe("Không tạo được phòng");
  });
});

describe("cancelRoom", () => {
  it("thành công: trả về true", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse({}))));
    expect(await useGameStore.getState().cancelRoom("r1")).toBe(true);
  });

  it("thất bại: set lỗi, trả về false", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse({}, false, 403))));

    const result = await useGameStore.getState().cancelRoom("r1");

    expect(result).toBe(false);
    expect(useGameStore.getState().error).toBe("Không huỷ được phòng.");
  });
});

describe("quickMatch", () => {
  it("thành công: trả về RoomDto", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse({ id: "qm1" }))));
    expect(await useGameStore.getState().quickMatch("vaybat")).toEqual({ id: "qm1" });
  });

  it("thất bại: set lỗi, trả về null", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse({}, false, 500))));

    const result = await useGameStore.getState().quickMatch("vaybat");

    expect(result).toBeNull();
    expect(useGameStore.getState().error).toBe("Không tìm được trận phù hợp.");
  });
});
