import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAdminStore } from "./adminStore";

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: () => Promise.resolve(body) } as Response;
}

beforeEach(() => {
  useAdminStore.setState({ isAdmin: null, accessError: "", rooms: [], stats: null, statsLoading: false, statsError: "", loading: false, error: "" });
});

describe("checkAdmin", () => {
  it("isAdmin=true → set đúng", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse({ isAdmin: true }))));

    await useAdminStore.getState().checkAdmin();

    expect(useAdminStore.getState().isAdmin).toBe(true);
  });

  it("isAdmin=false → set đúng", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse({ isAdmin: false }))));

    await useAdminStore.getState().checkAdmin();

    expect(useAdminStore.getState().isAdmin).toBe(false);
  });

  it("server lỗi (vd 401 chưa đăng nhập) → coi như không phải admin, không throw", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse({}, false, 401))));

    await useAdminStore.getState().checkAdmin();

    expect(useAdminStore.getState().isAdmin).toBe(false);
  });

  it("lỗi mạng → giữ quyền chưa xác định và báo lỗi có thể thử lại", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("boom"))));

    await expect(useAdminStore.getState().checkAdmin()).resolves.toBeUndefined();
    expect(useAdminStore.getState().isAdmin).toBe(null);
    expect(useAdminStore.getState().accessError).not.toBe("");
  });

  it("thử lại sau lỗi mạng có thể xác nhận quyền quản trị", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(jsonResponse({ isAdmin: true })));
    await useAdminStore.getState().checkAdmin();
    expect(useAdminStore.getState().isAdmin).toBe(null);
    expect(useAdminStore.getState().accessError).not.toBe("");

    await useAdminStore.getState().checkAdmin();
    expect(useAdminStore.getState().isAdmin).toBe(true);
    expect(useAdminStore.getState().accessError).toBe("");
  });
});

describe("fetchRooms", () => {
  it("phản hồi bộ lọc cũ không ghi đè kết quả mới", async () => {
    let finishOld!: (response: Response) => void;
    const oldRequest = new Promise<Response>((resolve) => { finishOld = resolve; });
    vi.stubGlobal("fetch", vi.fn().mockReturnValueOnce(oldRequest).mockResolvedValueOnce(jsonResponse([])));
    const first = useAdminStore.getState().fetchRooms({ status: "Waiting" });
    await useAdminStore.getState().fetchRooms({ status: "Playing" });
    finishOld(jsonResponse({}, false, 500));
    await first;
    expect(useAdminStore.getState().error).toBe("");
    expect(useAdminStore.getState().loading).toBe(false);
    expect(useAdminStore.getState().rooms).toEqual([]);
  });
  it("thành công → set rooms, tắt loading", async () => {
    const rooms = [{ id: "r1", gameKey: "vaybat", status: "Waiting", winner: null, seatCount: 2, seats: [null, null], ownerDisplayName: "An", createdAt: "", updatedAt: "" }];
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse(rooms))));

    await useAdminStore.getState().fetchRooms();

    expect(useAdminStore.getState().rooms).toEqual(rooms);
    expect(useAdminStore.getState().loading).toBe(false);
    expect(useAdminStore.getState().error).toBe("");
  });

  it("gửi đúng query string status + gameKey khi có filter", async () => {
    const fetchMock = vi.fn((_url: string) => Promise.resolve(jsonResponse([])));
    vi.stubGlobal("fetch", fetchMock);

    await useAdminStore.getState().fetchRooms({ status: "Waiting", gameKey: "bang" });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/api/admin/rooms?");
    expect(url).toContain("status=Waiting");
    expect(url).toContain("gameKey=bang");
  });

  it("không có filter → không gửi query string param nào", async () => {
    const fetchMock = vi.fn((_url: string) => Promise.resolve(jsonResponse([])));
    vi.stubGlobal("fetch", fetchMock);

    await useAdminStore.getState().fetchRooms();

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toBe("/api/admin/rooms?");
  });

  it("server lỗi (vd 403 không phải Admin) → set lỗi kèm mã status, không đổi rooms", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse({}, false, 403))));

    await useAdminStore.getState().fetchRooms();

    expect(useAdminStore.getState().error).toBe("Không tải được danh sách phòng (403).");
    expect(useAdminStore.getState().rooms).toEqual([]);
    expect(useAdminStore.getState().loading).toBe(false);
  });

  it("lỗi mạng → hiện thông báo không kết nối được", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("boom"))));

    await useAdminStore.getState().fetchRooms();

    expect(useAdminStore.getState().error).toBe("Không kết nối được máy chủ.");
    expect(useAdminStore.getState().loading).toBe(false);
  });
});

describe("fetchStats", () => {
  it("thử lại sau lỗi giữ số cũ rồi cập nhật và xóa cảnh báo", async () => {
    const oldStats = { byStatus: [], byGame: [], totalUsers: 2 };
    const newStats = { ...oldStats, totalUsers: 3 };
    useAdminStore.setState({ stats: oldStats });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(jsonResponse(newStats)));
    await useAdminStore.getState().fetchStats();
    expect(useAdminStore.getState().stats).toEqual(oldStats);
    expect(useAdminStore.getState().statsError).not.toBe("");
    await useAdminStore.getState().fetchStats();
    expect(useAdminStore.getState().stats).toEqual(newStats);
    expect(useAdminStore.getState().statsError).toBe("");
  });
  it("thành công → set stats", async () => {
    const stats = { byStatus: [{ status: "Waiting", count: 2 }], byGame: [{ gameKey: "vaybat", count: 2 }], totalUsers: 5 };
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse(stats))));

    await useAdminStore.getState().fetchStats();

    expect(useAdminStore.getState().stats).toEqual(stats);
  });

  it("server lỗi → báo lỗi thống kê riêng, không chặn danh sách phòng", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse({}, false, 500))));

    await useAdminStore.getState().fetchStats();

    expect(useAdminStore.getState().stats).toBeNull();
    expect(useAdminStore.getState().error).toBe("");
    expect(useAdminStore.getState().statsError).toContain("Chưa cập nhật được");
    expect(useAdminStore.getState().statsLoading).toBe(false);
  });

  it("lỗi mạng → không throw, báo lỗi thống kê riêng", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("boom"))));

    await expect(useAdminStore.getState().fetchStats()).resolves.toBeUndefined();
    expect(useAdminStore.getState().stats).toBeNull();
    expect(useAdminStore.getState().error).toBe("");
    expect(useAdminStore.getState().statsError).not.toBe("");
  });
});
