import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChatPanel from "./ChatPanel";
import { useGameStore } from "./gameStore";
import { GameRoomHubProvider, type GameRoomHubActions } from "./GameRoomHubContext";
import type { ChatMessageDto } from "./types";

function renderPanel(sendChatMessage = vi.fn()) {
  const actions: GameRoomHubActions = {
    joinRoom: vi.fn(),
    makeMove: vi.fn(),
    leaveRoom: vi.fn(),
    subscribeLobby: vi.fn(),
    unsubscribeLobby: vi.fn(),
    sendChatMessage,
    announceRematch: vi.fn(),
  };
  render(
    <GameRoomHubProvider value={actions}>
      <ChatPanel roomId="room-1" />
    </GameRoomHubProvider>,
  );
  return { sendChatMessage };
}

const msg = (displayName: string, text: string): ChatMessageDto => ({
  userId: "u1", displayName, text, sentAt: "2026-01-01T10:00:00Z",
});

beforeEach(() => {
  useGameStore.setState({ chatMessages: [] });
});

describe("ChatPanel", () => {
  it("mặc định thu gọn, không hiện số tin nhắn khi chưa có tin nào", () => {
    renderPanel();

    expect(screen.getByText("💬 Trò chuyện")).toBeInTheDocument();
    expect(screen.queryByLabelText("Nhập tin nhắn")).not.toBeInTheDocument();
  });

  it("hiện số lượng tin nhắn trong tiêu đề khi đã có tin", () => {
    useGameStore.setState({ chatMessages: [msg("An", "chào"), msg("Bình", "hi")] });

    renderPanel();

    expect(screen.getByText("💬 Trò chuyện (2)")).toBeInTheDocument();
  });

  it("bấm vào tiêu đề để mở/thu gọn panel", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByText("💬 Trò chuyện"));
    expect(screen.getByLabelText("Nhập tin nhắn")).toBeInTheDocument();

    await user.click(screen.getByText("💬 Trò chuyện"));
    expect(screen.queryByLabelText("Nhập tin nhắn")).not.toBeInTheDocument();
  });

  it("hiện 'Chưa có tin nhắn nào' khi mở panel lúc chưa có tin", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByText("💬 Trò chuyện"));

    expect(screen.getByText("Chưa có tin nhắn nào.")).toBeInTheDocument();
  });

  it("hiện đúng tên người gửi và nội dung của từng tin nhắn", async () => {
    const user = userEvent.setup();
    useGameStore.setState({ chatMessages: [msg("An", "chào mọi người")] });
    renderPanel();

    await user.click(screen.getByText("💬 Trò chuyện (1)"));

    expect(screen.getByText("An")).toBeInTheDocument();
    expect(screen.getByText("chào mọi người")).toBeInTheDocument();
  });

  it("nút Gửi bị disable khi ô nhập rỗng hoặc chỉ có khoảng trắng", async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByText("💬 Trò chuyện"));

    const sendButton = screen.getByRole("button", { name: "Gửi" });
    expect(sendButton).toBeDisabled();

    await user.type(screen.getByLabelText("Nhập tin nhắn"), "   ");
    expect(sendButton).toBeDisabled();
  });

  it("gửi tin nhắn: gọi sendChatMessage với roomId + text đã trim, rồi xoá ô nhập", async () => {
    const user = userEvent.setup();
    const { sendChatMessage } = renderPanel();
    await user.click(screen.getByText("💬 Trò chuyện"));

    const input = screen.getByLabelText("Nhập tin nhắn");
    await user.type(input, "  chào nhé  ");
    await user.click(screen.getByRole("button", { name: "Gửi" }));

    expect(sendChatMessage).toHaveBeenCalledWith("room-1", "chào nhé");
    expect(input).toHaveValue("");
  });
});
