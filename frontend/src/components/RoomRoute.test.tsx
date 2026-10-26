import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import RoomRoute from "./RoomRoute";
import { GameRoomHubProvider, type GameRoomHubActions } from "../platform/GameRoomHubContext";
import { useGameStore } from "../platform/gameStore";

vi.mock("../games/bang/BangBoard", () => ({ default: () => <div>Bàn BANG đã tải</div> }));

const actions: GameRoomHubActions = {
  joinRoom: vi.fn().mockResolvedValue(undefined), makeMove: vi.fn(), leaveRoom: vi.fn(),
  subscribeLobby: vi.fn(), unsubscribeLobby: vi.fn(), sendChatMessage: vi.fn(), announceRematch: vi.fn(),
};

function renderRoom() {
  return render(<MemoryRouter initialEntries={["/games/bang/room/r1"]}>
    <GameRoomHubProvider value={actions}><Routes>
      <Route path="/games/:gameKey/room/:roomId" element={<RoomRoute />} />
      <Route path="/games/:gameKey" element={<div>Sảnh trò chơi</div>} />
    </Routes></GameRoomHubProvider>
  </MemoryRouter>);
}

beforeEach(() => {
  useGameStore.setState({ room: null, error: "", chatMessages: [], rematchInvite: null });
  vi.clearAllMocks();
});

describe("RoomRoute — phục hồi khi vào phòng lỗi", () => {
  it("unmount rời subscription và dọn state phòng kể cả không bấm Thoát", async () => {
    useGameStore.setState({ room: { id: "r1", gameKey: "bang", status: "Playing" } as never });
    const { unmount } = renderRoom();
    expect(await screen.findByText("Bàn BANG đã tải")).toBeInTheDocument();
    useGameStore.setState({ mySide: "P0", selected: "card", error: "old", rematchInvite: { newRoomId: "r2", byDisplayName: "An" } });
    unmount();
    expect(actions.leaveRoom).toHaveBeenCalledWith("r1");
    expect(useGameStore.getState().room).toBeNull();
    expect(useGameStore.getState().mySide).toBeNull();
    expect(useGameStore.getState().selected).toBeNull();
    expect(useGameStore.getState().error).toBe("");
    expect(useGameStore.getState().rematchInvite).toBeNull();
  });

  it("lỗi mạng hiện thông báo và thử lại vào được phòng", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({
      ok: true, status: 200, json: async () => ({ id: "r1", gameKey: "bang", status: "Playing" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    renderRoom();
    expect(await screen.findByRole("alert")).toHaveTextContent("Không tải được phòng");
    expect(screen.queryByText("Đang vào phòng…")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Thử vào lại" }));
    expect(await screen.findByText("Bàn BANG đã tải")).toBeInTheDocument();
    expect(actions.joinRoom).toHaveBeenCalledWith("r1", expect.any(AbortSignal));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("404 có thông báo phòng không tồn tại riêng", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    renderRoom();
    expect(await screen.findByText(/Không tìm thấy phòng này/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Thử vào lại" })).not.toBeInTheDocument();
  });

  it("phiên hết hạn có lời giải thích và có thể về sảnh", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    renderRoom();
    expect(await screen.findByRole("alert")).toHaveTextContent("phiên đăng nhập đã hết hạn");
    await userEvent.click(screen.getByRole("button", { name: "Về sảnh trò chơi" }));
    await waitFor(() => expect(screen.getByText("Sảnh trò chơi")).toBeInTheDocument());
  });
});
