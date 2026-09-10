import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import GameReplayPage from "./GameReplayPage";

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: () => Promise.resolve(body) } as Response;
}

function renderAt(roomId: string) {
  return render(
    <MemoryRouter initialEntries={[`/replay/${roomId}`]}>
      <Routes>
        <Route path="/replay/:roomId" element={<GameReplayPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const replay = {
  id: "r1",
  gameKey: "bang",
  winner: "Sheriff",
  seats: ["An", "Bình", null, null],
  moves: [
    { moveNumber: 0, side: "P1", move: { type: "PlayCard", cardId: "c1" } },
    { moveNumber: 1, side: "P2", move: { type: "EndTurn" } },
  ],
};

describe("GameReplayPage", () => {
  it("tải xong: hiện tóm tắt + danh sách nước đi đúng thứ tự", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse(replay))));

    renderAt("r1");

    await waitFor(() => expect(screen.getByText("bang")).toBeInTheDocument());
    expect(screen.getByText("An, Bình")).toBeInTheDocument();
    expect(screen.getByText("Sheriff")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText(/PlayCard/)).toBeInTheDocument();
    expect(screen.getByText(/EndTurn/)).toBeInTheDocument();
  });

  it("gọi đúng endpoint theo roomId trên URL", async () => {
    const fetchMock = vi.fn((_url: string) => Promise.resolve(jsonResponse(replay)));
    vi.stubGlobal("fetch", fetchMock);

    renderAt("abc-123");

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/games/abc-123/replay", { credentials: "include" }));
  });

  it("404: hiện thông báo chưa có replay, không crash", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse({}, false, 404))));

    renderAt("r1");

    await waitFor(() => expect(screen.getByText(/Chưa có bản ghi lại/)).toBeInTheDocument());
  });

  it("503: hiện thông báo không tải được lúc này", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse({}, false, 503))));

    renderAt("r1");

    await waitFor(() => expect(screen.getByText("Không tải được replay lúc này. Thử lại sau.")).toBeInTheDocument());
  });

  it("lỗi mạng: hiện thông báo lỗi chung, không crash", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("boom"))));

    renderAt("r1");

    await waitFor(() => expect(screen.getByText("Không tải được replay.")).toBeInTheDocument());
  });

  it("ván không có nước đi nào: hiện thông báo rỗng thay vì danh sách trống im lặng", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse({ ...replay, moves: [] }))));

    renderAt("r1");

    await waitFor(() => expect(screen.getByText(/chưa có nước đi nào/)).toBeInTheDocument());
  });
});
