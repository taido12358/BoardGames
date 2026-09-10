import { create } from "zustand";

export interface AdminRoomRow {
  id: string;
  gameKey: string;
  status: string;
  winner: string | null;
  seatCount: number;
  seats: (string | null)[];
  ownerDisplayName: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminStats {
  byStatus: { status: string; count: number }[];
  byGame: { gameKey: string; count: number }[];
  totalUsers: number;
}

interface AdminStore {
  /** null = chưa kiểm tra xong (đừng vội hiện/ẩn mục "Quản trị"). */
  isAdmin: boolean | null;
  rooms: AdminRoomRow[];
  stats: AdminStats | null;
  loading: boolean;
  error: string;

  checkAdmin: () => Promise<void>;
  fetchRooms: (filter?: { status?: string; gameKey?: string }) => Promise<void>;
  fetchStats: () => Promise<void>;
}

async function api(path: string): Promise<Response> {
  return fetch(`/api/admin/${path}`, { credentials: "include" });
}

export const useAdminStore = create<AdminStore>((set) => ({
  isAdmin: null,
  rooms: [],
  stats: null,
  loading: false,
  error: "",

  checkAdmin: async () => {
    try {
      const res = await api("check");
      if (!res.ok) { set({ isAdmin: false }); return; }
      const body = (await res.json()) as { isAdmin: boolean };
      set({ isAdmin: body.isAdmin });
    } catch {
      set({ isAdmin: false });
    }
  },

  fetchRooms: async (filter) => {
    set({ loading: true, error: "" });
    try {
      const qs = new URLSearchParams();
      if (filter?.status) qs.set("status", filter.status);
      if (filter?.gameKey) qs.set("gameKey", filter.gameKey);
      const res = await api(`rooms?${qs.toString()}`);
      if (!res.ok) {
        set({ error: `Không tải được danh sách phòng (${res.status}).`, loading: false });
        return;
      }
      const rooms = (await res.json()) as AdminRoomRow[];
      set({ rooms, loading: false });
    } catch {
      set({ error: "Không kết nối được máy chủ.", loading: false });
    }
  },

  fetchStats: async () => {
    try {
      const res = await api("stats");
      if (!res.ok) return;
      const stats = (await res.json()) as AdminStats;
      set({ stats });
    } catch {
      /* thống kê chỉ là phụ trợ — im lặng bỏ qua nếu lỗi, không chặn trang */
    }
  },
}));
