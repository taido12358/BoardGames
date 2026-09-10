import { beforeEach, describe, expect, it } from "vitest";
import { useGameStore } from "./gameStore";
import type { ChatMessageDto, RoomSummaryDto } from "./types";

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
