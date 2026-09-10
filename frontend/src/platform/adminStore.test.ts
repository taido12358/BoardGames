import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAdminStore } from "./adminStore";

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: () => Promise.resolve(body) } as Response;
}

beforeEach(() => {
  useAdminStore.setState({ isAdmin: null, rooms: [], stats: null, loading: false, error: "" });
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

  it("lỗi mạng → coi như không phải admin, không throw", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("boom"))));

    await expect(useAdminStore.getState().checkAdmin()).resolves.toBeUndefined();
    expect(useAdminStore.getState().isAdmin).toBe(false);
  });
});

describe("fetchRooms", () => {
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
  it("thành công → set stats", async () => {
    const stats = { byStatus: [{ status: "Waiting", count: 2 }], byGame: [{ gameKey: "vaybat", count: 2 }], totalUsers: 5 };
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse(stats))));

    await useAdminStore.getState().fetchStats();

    expect(useAdminStore.getState().stats).toEqual(stats);
  });

  it("server lỗi → im lặng bỏ qua, không set error, không đổi stats", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse({}, false, 500))));

    await useAdminStore.getState().fetchStats();

    expect(useAdminStore.getState().stats).toBeNull();
    expect(useAdminStore.getState().error).toBe("");
  });

  it("lỗi mạng → im lặng bỏ qua, không throw, không set error", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("boom"))));

    await expect(useAdminStore.getState().fetchStats()).resolves.toBeUndefined();
    expect(useAdminStore.getState().stats).toBeNull();
    expect(useAdminStore.getState().error).toBe("");
  });
});
