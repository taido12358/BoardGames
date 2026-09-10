import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminPage from "./AdminPage";
import { useAdminStore, type AdminRoomRow, type AdminStats } from "../platform/adminStore";

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: () => Promise.resolve(body) } as Response;
}

/** Định tuyến fetch() giả theo URL — khớp với đúng path AdminController thật dùng. */
function stubFetch(handlers: { check?: unknown; rooms?: unknown; stats?: unknown }) {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      if (url.includes("/api/admin/check")) return Promise.resolve(jsonResponse(handlers.check ?? { isAdmin: false }));
      if (url.includes("/api/admin/rooms")) return Promise.resolve(jsonResponse(handlers.rooms ?? []));
      if (url.includes("/api/admin/stats")) return Promise.resolve(jsonResponse(handlers.stats ?? { byStatus: [], byGame: [], totalUsers: 0 }));
      return Promise.resolve(jsonResponse({}, false, 404));
    }),
  );
}

const room = (overrides: Partial<AdminRoomRow>): AdminRoomRow => ({
  id: "r1",
  gameKey: "vaybat",
  status: "Playing",
  winner: null,
  seatCount: 2,
  seats: ["An", "Bình"],
  ownerDisplayName: "An",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T01:00:00Z",
  ...overrides,
});

beforeEach(() => {
  useAdminStore.setState({ isAdmin: null, rooms: [], stats: null, loading: false, error: "" });
});

describe("AdminPage", () => {
  it("hiện thông báo đang kiểm tra quyền lúc mới vào trang", () => {
    stubFetch({ check: { isAdmin: false } });
    render(<AdminPage />);

    expect(screen.getByText("Đang kiểm tra quyền truy cập…")).toBeInTheDocument();
  });

  it("người dùng thường (không phải admin) thấy thông báo không có quyền, không gọi rooms/stats", async () => {
    stubFetch({ check: { isAdmin: false } });
    render(<AdminPage />);

    await waitFor(() => expect(screen.getByText("Bạn không có quyền truy cập trang này.")).toBeInTheDocument());

    const calledUrls = (fetch as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0] as string);
    expect(calledUrls.some((u) => u.includes("/api/admin/rooms"))).toBe(false);
  });

  it("admin thấy thống kê + bảng phòng sau khi tải xong", async () => {
    const stats: AdminStats = { byStatus: [{ status: "Playing", count: 3 }], byGame: [], totalUsers: 42 };
    stubFetch({
      check: { isAdmin: true },
      stats,
      rooms: [room({ gameKey: "bang", status: "Waiting" })],
    });
    render(<AdminPage />);

    await waitFor(() => expect(screen.getByText("🛠 QUẢN TRỊ")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("42")).toBeInTheDocument()); // tổng tài khoản
    expect(screen.getByText("3")).toBeInTheDocument(); // đếm theo trạng thái Playing
    expect(screen.getByText("bang")).toBeInTheDocument();
    // "Đang chờ" cũng là tên của 1 chip lọc luôn hiển thị — scope vào riêng dòng bảng để không
    // nhầm với chip lọc trùng nhãn.
    const row = screen.getByText("bang").closest("tr")!;
    expect(within(row).getByText("Đang chờ")).toBeInTheDocument(); // nhãn tiếng Việt của "Waiting"
  });

  it("hiện thông báo trống khi không có phòng nào khớp bộ lọc", async () => {
    stubFetch({ check: { isAdmin: true }, rooms: [] });
    render(<AdminPage />);

    await waitFor(() => expect(screen.getByText("Không có phòng nào khớp bộ lọc.")).toBeInTheDocument());
  });

  it("hiện lỗi khi tải danh sách phòng thất bại", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.includes("/api/admin/check")) return Promise.resolve(jsonResponse({ isAdmin: true }));
        if (url.includes("/api/admin/rooms")) return Promise.resolve(jsonResponse({}, false, 500));
        return Promise.resolve(jsonResponse({ byStatus: [], byGame: [], totalUsers: 0 }));
      }),
    );
    render(<AdminPage />);

    await waitFor(() => expect(screen.getByText("Không tải được danh sách phòng (500).")).toBeInTheDocument());
  });

  it("bấm chip lọc trạng thái gọi lại fetchRooms với đúng query status", async () => {
    const user = userEvent.setup();
    stubFetch({ check: { isAdmin: true }, rooms: [room({})] });
    render(<AdminPage />);

    await waitFor(() => expect(screen.getByText("🛠 QUẢN TRỊ")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Đang chờ" }));

    await waitFor(() => {
      const calledUrls = (fetch as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0] as string);
      expect(calledUrls.some((u) => u.includes("/api/admin/rooms?status=Waiting"))).toBe(true);
    });
  });
});
