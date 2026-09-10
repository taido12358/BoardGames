import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "./authStore";
import { useGameStore } from "./gameStore";

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: () => Promise.resolve(body) } as Response;
}

/** Định tuyến fetch() giả theo path — khớp đúng path AuthController thật dùng (xem authStore.ts `api()`). */
function stubFetch(handlers: { me?: unknown; requestOtp?: unknown; verifyOtp?: unknown; logout?: unknown }) {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      if (url.includes("/api/auth/me")) return Promise.resolve(handlers.me ?? jsonResponse({}, false, 401));
      if (url.includes("/api/auth/request-otp")) return Promise.resolve(handlers.requestOtp ?? jsonResponse({}));
      if (url.includes("/api/auth/verify-otp")) return Promise.resolve(handlers.verifyOtp ?? jsonResponse({}));
      if (url.includes("/api/auth/logout")) return Promise.resolve(handlers.logout ?? jsonResponse({}));
      return Promise.resolve(jsonResponse({}, false, 404));
    }),
  );
}

const user = { id: "u1", email: "a@b.com", displayName: "An" };

beforeEach(() => {
  useAuthStore.setState({ user: null, checking: true, step: "email", pendingEmail: "", loading: false, error: "", resendIn: 0 });
  useGameStore.setState({ playerName: "" });
});

afterEach(() => {
  // KHÔNG dùng vi.unstubAllGlobals() ở đây — nó sẽ revert LUÔN cả stub `localStorage` dùng
  // chung toàn bộ bộ test (test-setup.ts), không chỉ `fetch` của riêng file này, khiến
  // `setPlayerName` (gọi `localStorage.setItem`) throw ở các test CHẠY SAU trong cùng file
  // (bài học tự bắt được: test đầu qua, các test verifyOtp sau đó random fail vì lỗi mạng giả —
  // hoá ra do mất `localStorage` chứ không phải lỗi thật ở authStore.ts). Mỗi test tự gọi lại
  // `stubFetch()`/`vi.stubGlobal("fetch", ...)` nên không cần unstub `fetch` giữa các lần.
  vi.useRealTimers();
});

describe("restoreSession", () => {
  it("có phiên hợp lệ → đăng nhập luôn, đồng bộ playerName sang gameStore", async () => {
    stubFetch({ me: jsonResponse(user) });

    await useAuthStore.getState().restoreSession();

    expect(useAuthStore.getState().user).toEqual(user);
    expect(useAuthStore.getState().step).toBe("done");
    expect(useAuthStore.getState().checking).toBe(false);
    expect(useGameStore.getState().playerName).toBe("An");
  });

  it("chưa đăng nhập (401) → checking=false, không set user", async () => {
    stubFetch({ me: jsonResponse({}, false, 401) });

    await useAuthStore.getState().restoreSession();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().checking).toBe(false);
  });

  it("lỗi mạng → coi như chưa đăng nhập, không throw", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("network down"))));

    await expect(useAuthStore.getState().restoreSession()).resolves.toBeUndefined();
    expect(useAuthStore.getState().checking).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });
});

describe("requestOtp", () => {
  it("thành công → chuyển sang bước 'code', lưu pendingEmail, bắt đầu đếm ngược 60s", async () => {
    vi.useFakeTimers();
    stubFetch({ requestOtp: jsonResponse({ expiresInSeconds: 300 }) });

    await useAuthStore.getState().requestOtp("a@b.com");

    expect(useAuthStore.getState().step).toBe("code");
    expect(useAuthStore.getState().pendingEmail).toBe("a@b.com");
    expect(useAuthStore.getState().loading).toBe(false);
    expect(useAuthStore.getState().resendIn).toBe(60);
  });

  it("đếm ngược giảm dần theo thời gian rồi dừng ở 0", async () => {
    vi.useFakeTimers();
    stubFetch({ requestOtp: jsonResponse({ expiresInSeconds: 300 }) });

    await useAuthStore.getState().requestOtp("a@b.com");
    vi.advanceTimersByTime(3000);

    expect(useAuthStore.getState().resendIn).toBe(57);
  });

  it("server trả lỗi (vd rate limit) → hiện đúng message lỗi, KHÔNG chuyển bước", async () => {
    stubFetch({ requestOtp: jsonResponse({ error: "Vui lòng đợi 42 giây rồi yêu cầu mã mới." }, false, 429) });

    await useAuthStore.getState().requestOtp("a@b.com");

    expect(useAuthStore.getState().error).toBe("Vui lòng đợi 42 giây rồi yêu cầu mã mới.");
    expect(useAuthStore.getState().step).toBe("email");
    expect(useAuthStore.getState().loading).toBe(false);
  });

  it("lỗi mạng → hiện thông báo không kết nối được, không throw", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("boom"))));

    await useAuthStore.getState().requestOtp("a@b.com");

    expect(useAuthStore.getState().error).toBe("Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.");
  });
});

describe("verifyOtp", () => {
  it("mã đúng → đăng nhập, đồng bộ playerName, xoá lỗi cũ", async () => {
    useAuthStore.setState({ pendingEmail: "a@b.com", error: "lỗi cũ" });
    stubFetch({ verifyOtp: jsonResponse(user) });

    await useAuthStore.getState().verifyOtp("123456");

    expect(useAuthStore.getState().user).toEqual(user);
    expect(useAuthStore.getState().step).toBe("done");
    expect(useAuthStore.getState().error).toBe("");
    expect(useGameStore.getState().playerName).toBe("An");
  });

  it("mã sai → hiện lỗi, KHÔNG đăng nhập", async () => {
    useAuthStore.setState({ pendingEmail: "a@b.com" });
    stubFetch({ verifyOtp: jsonResponse({ error: "Mã không đúng. Còn 3 lần thử." }, false, 400) });

    await useAuthStore.getState().verifyOtp("000000");

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().error).toBe("Mã không đúng. Còn 3 lần thử.");
  });

  it("gửi đúng pendingEmail đã lưu từ bước trước, không phải email khác", async () => {
    useAuthStore.setState({ pendingEmail: "saved@b.com" });
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => Promise.resolve(jsonResponse(user)));
    vi.stubGlobal("fetch", fetchMock);

    await useAuthStore.getState().verifyOtp("123456");

    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toEqual({ email: "saved@b.com", code: "123456" });
  });
});

describe("logout", () => {
  it("xoá user/pendingEmail, quay về bước 'email' kể cả khi request logout lỗi", async () => {
    useAuthStore.setState({ user, step: "done", pendingEmail: "a@b.com" });
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("network"))));

    await useAuthStore.getState().logout();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().step).toBe("email");
    expect(useAuthStore.getState().pendingEmail).toBe("");
  });
});

describe("backToEmail", () => {
  it("quay lại bước 'email', xoá lỗi hiện tại", () => {
    useAuthStore.setState({ step: "code", error: "mã hết hạn" });

    useAuthStore.getState().backToEmail();

    expect(useAuthStore.getState().step).toBe("email");
    expect(useAuthStore.getState().error).toBe("");
  });
});

describe("updateDisplayName", () => {
  it("thành công: cập nhật user + đồng bộ playerName sang gameStore, trả true", async () => {
    useAuthStore.setState({ user });
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse({ ...user, displayName: "Tên mới" }))));

    const ok = await useAuthStore.getState().updateDisplayName("Tên mới");

    expect(ok).toBe(true);
    expect(useAuthStore.getState().user?.displayName).toBe("Tên mới");
    expect(useGameStore.getState().playerName).toBe("Tên mới");
  });

  it("gửi đúng displayName trong body PUT", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => Promise.resolve(jsonResponse(user)));
    vi.stubGlobal("fetch", fetchMock);

    await useAuthStore.getState().updateDisplayName("Bình mới");

    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe("/api/auth/display-name");
    expect((call[1] as RequestInit).method).toBe("PUT");
    expect(JSON.parse((call[1] as RequestInit).body as string)).toEqual({ displayName: "Bình mới" });
  });

  it("thất bại (vd tên quá dài): set lỗi, trả false, KHÔNG đổi user", async () => {
    useAuthStore.setState({ user });
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse({ error: "Tên hiển thị tối đa 30 ký tự." }, false, 400))));

    const ok = await useAuthStore.getState().updateDisplayName("x".repeat(31));

    expect(ok).toBe(false);
    expect(useAuthStore.getState().error).toBe("Tên hiển thị tối đa 30 ký tự.");
    expect(useAuthStore.getState().user).toEqual(user);
  });

  it("lỗi mạng: trả false, hiện thông báo không kết nối được", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("boom"))));

    const ok = await useAuthStore.getState().updateDisplayName("Tên mới");

    expect(ok).toBe(false);
    expect(useAuthStore.getState().error).toBe("Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.");
  });
});
