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
  /** null = đang khôi phục phiên từ cookie (chưa biết đã đăng nhập hay chưa) */
  checking: boolean;
  step: AuthStep;
  pendingEmail: string;
  loading: boolean;
  error: string;
  /** Đếm ngược (giây) trước khi được gửi lại mã */
  resendIn: number;

  restoreSession: () => Promise<void>;
  requestOtp: (email: string) => Promise<void>;
  verifyOtp: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  backToEmail: () => void;
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

function startResendCountdown(set: (partial: Partial<AuthStore>) => void, seconds: number) {
  if (resendTimer) clearInterval(resendTimer);
  let left = seconds;
  set({ resendIn: left });
  resendTimer = setInterval(() => {
    left -= 1;
    set({ resendIn: Math.max(0, left) });
    if (left <= 0 && resendTimer) clearInterval(resendTimer);
  }, 1000);
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  checking: true,
  step: "email",
  pendingEmail: "",
  loading: false,
  error: "",
  resendIn: 0,

  restoreSession: async () => {
    try {
      const res = await api("me");
      if (res.ok) {
        const user = (await res.json()) as AuthUser;
        syncPlayerName(user);
        set({ user, step: "done", checking: false });
        return;
      }
    } catch {
      /* mạng lỗi → coi như chưa đăng nhập, hiện form */
    }
    set({ checking: false });
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
      set({ user, step: "done", loading: false, error: "" });
    } catch {
      set({ error: "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.", loading: false });
    }
  },

  logout: async () => {
    try {
      await api("logout", { method: "POST" });
    } catch {
      /* cookie phía server sẽ hết hạn; client vẫn thoát phiên */
    }
    set({ user: null, step: "email", pendingEmail: "", error: "" });
  },

  backToEmail: () => set({ step: "email", error: "" }),
}));
