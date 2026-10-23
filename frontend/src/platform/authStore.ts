import { create } from "zustand";
import { useGameStore } from "./gameStore";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

type AuthStep = "email" | "code" | "done";

interface AuthStore {
  user: AuthUser | null;
  /** true = đang khôi phục phiên từ cookie */
  checking: boolean;
  sessionError: string;
  step: AuthStep;
  pendingEmail: string;
  loading: boolean;
  loggingOut: boolean;
  logoutError: string;
  error: string;
  /** Đếm ngược (giây) trước khi được gửi lại mã */
  resendIn: number;

  restoreSession: () => Promise<void>;
  requestOtp: (email: string) => Promise<void>;
  verifyOtp: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  backToEmail: () => void;
  /** Đổi tên hiển thị — trả true/false để component tự quyết định đóng form edit hay không. */
  updateDisplayName: (name: string) => Promise<boolean>;
}

/** Token nằm trong cookie HttpOnly nên mọi request chỉ cần credentials — JS không giữ token. */
async function api(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`/api/auth/${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    if (body.error) return body.error;
  } catch {
    /* body không phải JSON — dùng message mặc định */
  }
  return `Lỗi máy chủ (${res.status}). Thử lại sau.`;
}

/** Đồng bộ tên hiển thị của tài khoản sang gameStore (playerName dùng khắp lobby/ván). */
function syncPlayerName(user: AuthUser) {
  useGameStore.getState().setPlayerName(user.displayName);
}

let resendTimer: ReturnType<typeof setInterval> | null = null;

function stopResendCountdown() {
  if (resendTimer) clearInterval(resendTimer);
  resendTimer = null;
}

function startResendCountdown(set: (partial: Partial<AuthStore>) => void, seconds: number) {
  stopResendCountdown();
  const deadline = Date.now() + seconds * 1000;
  set({ resendIn: seconds });
  resendTimer = setInterval(() => {
    const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    set({ resendIn: left });
    if (left === 0) stopResendCountdown();
  }, 1000);
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  checking: true,
  sessionError: "",
  step: "email",
  pendingEmail: "",
  loading: false,
  loggingOut: false,
  logoutError: "",
  error: "",
  resendIn: 0,

  restoreSession: async () => {
    set({ checking: true, sessionError: "" });
    try {
      const res = await api("me");
      if (res.ok) {
        const user = (await res.json()) as AuthUser;
        syncPlayerName(user);
        set({ user, step: "done", checking: false });
        return;
      }
      if (res.status !== 401) throw new Error(`HTTP ${res.status}`);
      set({ user: null, step: "email", checking: false });
    } catch {
      set({ checking: false, sessionError: "Chưa kiểm tra được phiên đăng nhập. Kiểm tra kết nối rồi thử lại." });
    }
  },

  requestOtp: async (email: string) => {
    set({ loading: true, error: "" });
    try {
      const res = await api("request-otp", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        set({ error: await readError(res), loading: false });
        return;
      }
      set({ step: "code", pendingEmail: email, loading: false });
      startResendCountdown(set, 60);
    } catch {
      set({ error: "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.", loading: false });
    }
  },

  verifyOtp: async (code: string) => {
    set({ loading: true, error: "" });
    try {
      const res = await api("verify-otp", {
        method: "POST",
        body: JSON.stringify({ email: get().pendingEmail, code }),
      });
      if (!res.ok) {
        set({ error: await readError(res), loading: false });
        return;
      }
      const user = (await res.json()) as AuthUser;
      syncPlayerName(user);
      stopResendCountdown();
      set({ user, step: "done", loading: false, error: "", resendIn: 0 });
    } catch {
      set({ error: "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.", loading: false });
    }
  },

  logout: async () => {
    if (get().loggingOut) return;
    set({ loggingOut: true, logoutError: "" });
    try {
      const res = await api("logout", { method: "POST" });
      if (!res.ok && res.status !== 401) {
        set({ logoutError: "Chưa đăng xuất được. Vui lòng thử lại." });
        return;
      }
      stopResendCountdown();
      useGameStore.setState({ room: null, mySide: null, selected: null, roomsById: {}, rooms: [], chatMessages: [], rematchInvite: null, error: "" });
      set({ user: null, step: "email", pendingEmail: "", error: "", resendIn: 0 });
    } catch {
      set({ logoutError: "Không kết nối được máy chủ để đăng xuất. Vui lòng thử lại." });
    } finally {
      set({ loggingOut: false });
    }
  },

  backToEmail: () => set({ step: "email", error: "" }),

  updateDisplayName: async (name: string) => {
    set({ error: "" });
    try {
      const res = await api("display-name", { method: "PUT", body: JSON.stringify({ displayName: name }) });
      if (!res.ok) {
        set({ error: await readError(res) });
        return false;
      }
      const user = (await res.json()) as AuthUser;
      syncPlayerName(user);
      set({ user });
      return true;
    } catch {
      set({ error: "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại." });
      return false;
    }
  },
}));
