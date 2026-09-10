import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import GameHistoryPage from "./GameHistoryPage";

// Trang giờ có <Link to="/replay/:id"> ở mỗi dòng (mới 2026-09-11) — cần <MemoryRouter> bao
// ngoài, không thì react-router-dom throw ngay lúc render.
function renderPage() {
  return render(
    <MemoryRouter>
      <GameHistoryPage />
    </MemoryRouter>,
  );
}

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: () => Promise.resolve(body) } as Response;
}

const record = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "r1", gameKey: "bang", status: "Finished", winner: "Sheriff", moveCount: 42,
  players: "An, Bình, Chi, Dung", createdAt: "2026-01-01T00:00:00Z", finishedAt: "2026-01-01T01:00:00Z",
  ...overrides,
});

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  // KHÔNG dùng vi.unstubAllGlobals() — xem bài học rules/coding/testing.md (revert nhầm stub
  // localStorage dùng chung của test-setup.ts). Mỗi test tự stubGlobal("fetch", ...) đè lại.
});

describe("GameHistoryPage", () => {
  it("tải danh sách lúc mount (query rỗng), hiện đúng dữ liệu", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse([record()]))));
    renderPage();

    await vi.advanceTimersByTimeAsync(300);

    await waitFor(() => expect(screen.getByText("An, Bình, Chi, Dung")).toBeInTheDocument());
    expect(screen.getByText("Sheriff")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("gõ từ khoá gọi đúng query sau debounce, không gọi ngay lập tức", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => Promise.resolve(jsonResponse([])));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();
    await vi.advanceTimersByTimeAsync(300); // lượt tải rỗng lúc mount

    await user.type(screen.getByLabelText("Tìm kiếm lịch sử ván đấu"), "An");

    // Chưa hết debounce (300ms) thì KHÔNG được gọi thêm lần nào cho "An" — chỉ có lần mount.
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(300);

    await waitFor(() => {
      const calls = fetchMock.mock.calls;
      const lastCall = calls[calls.length - 1][0] as string;
      expect(lastCall).toBe("/api/games/search?q=An");
    });
  });

  it("query rỗng thì gọi API không kèm ?q=", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(jsonResponse([])));
    vi.stubGlobal("fetch", fetchMock);
    renderPage();

    await vi.advanceTimersByTimeAsync(300);

    expect(fetchMock).toHaveBeenCalledWith("/api/games/search", { credentials: "include" });
  });

  it("không có kết quả: hiện thông báo không tìm thấy", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse([]))));
    renderPage();

    await vi.advanceTimersByTimeAsync(300);

    await waitFor(() => expect(screen.getByText(/Không tìm thấy ván đấu nào/)).toBeInTheDocument());
  });

  it("lỗi HTTP: hiện thông báo lỗi, không crash", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse({}, false, 500))));
    renderPage();

    await vi.advanceTimersByTimeAsync(300);

    await waitFor(() => expect(screen.getByText("Không tải được lịch sử ván đấu.")).toBeInTheDocument());
  });

  it("ván chưa có winner hiện dấu gạch ngang thay vì rỗng/undefined", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse([record({ winner: null, finishedAt: null })]))));
    renderPage();

    await vi.advanceTimersByTimeAsync(300);

    await waitFor(() => {
      const cells = screen.getAllByText("—");
      expect(cells.length).toBeGreaterThanOrEqual(2); // winner + finishedAt
    });
  });
});
