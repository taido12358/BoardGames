import { create } from "zustand";
import type { EngineInfo, RoomDto } from "./types";

function loadPlayerName(): string {
  const saved = localStorage.getItem("playerName");
  if (saved) return saved;
  const name = "Player-" + Math.random().toString(36).slice(2, 6);
  localStorage.setItem("playerName", name);
  return name;
}

interface GameStore {
  playerName: string;
  engines: EngineInfo[];
  enginesLoading: boolean;
  /** Lỗi tải danh sách game — rỗng nghĩa là không có lỗi (khác `error` dùng cho lỗi trong ván/hub). */
  enginesError: string;
  rooms: RoomDto[];
  room: RoomDto | null;
  // "RED"/"WHITE" (VayBat) hoặc "P0".."P7" (Bang — ghế generic); null = khán giả.
  mySide: string | null;
  selected: string | null;  // pieceId / ô đang chọn (tuỳ game)
  error: string;

  setPlayerName: (name: string) => void;
  setRoom: (room: RoomDto | null) => void;
  setMySide: (side: string | null) => void;
  setSelected: (sel: string | null) => void;
  setError: (msg: string) => void;

  fetchEngines: () => Promise<void>;
  fetchRooms: (gameKey?: string) => Promise<void>;
  createRoom: (gameKey: string, options: Record<string, unknown>) => Promise<RoomDto | null>;
}

export const useGameStore = create<GameStore>((set, get) => ({
  playerName: loadPlayerName(),
  engines: [],
  enginesLoading: false,
  enginesError: "",
  rooms: [],
  room: null,
  mySide: null,
  selected: null,
  error: "",

  setPlayerName: (name) => {
    localStorage.setItem("playerName", name);
    set({ playerName: name });
  },
  setRoom: (room) => set({ room }),
  setMySide: (mySide) => set({ mySide }),
  setSelected: (selected) => set({ selected }),
  setError: (error) => set({ error }),

  fetchEngines: async () => {
    set({ enginesLoading: true, enginesError: "" });
    try {
      const res = await fetch("/api/games/engines");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      set({ engines: await res.json(), enginesLoading: false });
    } catch {
      set({ enginesLoading: false, enginesError: "Không thể tải danh sách trò chơi." });
    }
  },

  fetchRooms: async (gameKey?: string) => {
    try {
      const url = gameKey ? `/api/games?gameKey=${gameKey}` : "/api/games";
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      set({ rooms: await res.json() });
    } catch {
      // Danh sách phòng chỉ là "best effort" hiển thị — không chặn UI, thử lại ở lần poll sau.
    }
  },

  createRoom: async (gameKey, options) => {
    const res = await fetch("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameKey, options, playerName: get().playerName }),
    });
    if (!res.ok) {
      set({ error: "Không tạo được phòng" });
      return null;
    }
    return (await res.json()) as RoomDto;
  },
}));
