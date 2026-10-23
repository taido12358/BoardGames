import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import GameLibrary from "./GameLibrary";
import { useGameStore } from "../platform/gameStore";

vi.mock("../platform/useLobbyHub", () => ({ useLobbyHub: () => {} }));

beforeEach(() => {
  useGameStore.setState({
    engines: [
      { key: "oanquan", displayName: "Ô Ăn Quan", minPlayers: 2, maxPlayers: 2 },
      { key: "zodiacrace", displayName: "Đua Xe Hoàng Đạo", minPlayers: 2, maxPlayers: 6 },
    ],
    enginesLoading: false, enginesError: "", rooms: [], roomsLoading: false, roomsError: "",
    fetchEngines: vi.fn(), fetchRooms: vi.fn(),
  });
});

describe("GameLibrary — tìm tên không dấu", () => {
  it("khôi phục từ khóa và bộ lọc từ URL khi mở lại thư viện", () => {
    render(<MemoryRouter initialEntries={["/games?q=o+an+quan&filter=players%3A2+ng%C6%B0%E1%BB%9Di"]}><GameLibrary /></MemoryRouter>);
    expect(screen.getByRole("searchbox")).toHaveValue("o an quan");
    expect(screen.getByRole("button", { name: "2 người" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("status")).toHaveTextContent("1 trò chơi");
  });
  it.each(["o an quan", "QUAN   O", "đua xe", "dua xe"])("tìm được với từ khóa %s", async (query) => {
    render(<MemoryRouter><GameLibrary /></MemoryRouter>);
    await userEvent.type(screen.getByRole("searchbox"), query);
    expect(screen.getByRole("status")).toHaveTextContent("1 trò chơi");
    expect(screen.queryByText("Không tìm thấy trò chơi")).not.toBeInTheDocument();
  });

  it("xóa từ khóa phục hồi danh sách đầy đủ", async () => {
    render(<MemoryRouter><GameLibrary /></MemoryRouter>);
    await userEvent.type(screen.getByRole("searchbox"), "o an quan");
    await userEvent.click(screen.getByRole("button", { name: "Xóa từ khóa" }));
    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(screen.getByRole("status")).toHaveTextContent("2 trò chơi");
  });
});
