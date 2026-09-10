import { create } from "zustand";
import type { ChatMessageDto, EngineInfo, RoomDto, RoomSummaryDto } from "./types";

/** Giới hạn số tin nhắn giữ trong bộ nhớ — chat không lưu DB, chỉ cần đủ để cuộn lại gần đây. */
const MAX_CHAT_MESSAGES = 200;

function loadPlayerName(): string {
  const saved = localStorage.getItem("playerName");
  if (saved) return saved;
  const name = "Player-" + Math.random().toString(36).slice(2, 6);
  localStorage.setItem("playerName", name);
  return name;
}

function sortRooms(byId: Record<string, RoomSummaryDto>): RoomSummaryDto[] {
  return Object.values(byId).sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
}

export type ConnectionState = "connected" | "reconnecting" | "disconnected";

interface GameStore {
  playerName: string;
  engines: EngineInfo[];
  enginesLoading: boolean;
  /** Lỗi tải danh sách game — rỗng nghĩa là không có lỗi (khác `error` dùng cho lỗi trong ván/hub). */
  enginesError: string;
  /** Nguồn sự thật cho danh sách sảnh — cập nhật realtime qua SignalR (xem useLobbyHub), không polling. */
  roomsById: Record<string, RoomSummaryDto>;
  /** Mảng dẫn xuất từ roomsById, sắp theo createdAt giảm dần — tiện cho component filter/render như trước. */
  rooms: RoomSummaryDto[];
  room: RoomDto | null;
  // "RED"/"WHITE" (VayBat) hoặc "P0".."P7" (Bang — ghế generic); null = khán giả.
  mySide: string | null;
  selected: string | null;  // pieceId / ô đang chọn (tuỳ game)
  error: string;
  connectionState: ConnectionState;
  /** Chat phòng hiện tại — chỉ trong bộ nhớ (không lưu DB), xoá khi rời phòng (xem RoomRoute). */
  chatMessages: ChatMessageDto[];

  setPlayerName: (name: string) => void;
  setRoom: (room: RoomDto | null) => void;
  setMySide: (side: string | null) => void;
  setSelected: (sel: string | null) => void;
  setError: (msg: string) => void;
  setConnectionState: (s: ConnectionState) => void;
  addChatMessage: (msg: ChatMessageDto) => void;
  clearChat: () => void;

  fetchEngines: () => Promise<void>;
  /** Chỉ dùng để paint lần đầu — cập nhật realtime sau đó qua useLobbyHub, không polling. */
  fetchRooms: (gameKey?: string) => Promise<void>;
  upsertRoom: (room: RoomSummaryDto) => void;
  removeRoom: (roomId: string) => void;
  createRoom: (gameKey: string, options: Record<string, unknown>) => Promise<RoomDto | null>;
  /** Huỷ phòng do chính mình tạo (chỉ khi còn "Waiting") — server tự kiểm tra quyền theo JWT. */
  cancelRoom: (roomId: string) => Promise<boolean>;
  /** Ghép vào phòng "Waiting" còn ghế trống gần nhất theo gameKey, hết thì server tự tạo phòng mới. */
  quickMatch: (gameKey: string) => Promise<RoomDto | null>;
}

export const useGameStore = create<GameStore>((set, get) => ({
  playerName: loadPlayerName(),
  engines: [],
  enginesLoading: false,
  enginesError: "",
  roomsById: {},
  rooms: [],
  room: null,
  mySide: null,
  selected: null,
  error: "",
  connectionState: "connected",
  chatMessages: [],

  setPlayerName: (name) => {
    localStorage.setItem("playerName", name);
    set({ playerName: name });
  },
  setRoom: (room) => set({ room }),
  setMySide: (mySide) => set({ mySide }),
  setSelected: (selected) => set({ selected }),
  setError: (error) => set({ error }),
  setConnectionState: (connectionState) => set({ connectionState }),
  addChatMessage: (msg) =>
    set((s) => ({ chatMessages: [...s.chatMessages, msg].slice(-MAX_CHAT_MESSAGES) })),
  clearChat: () => set({ chatMessages: [] }),

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
      const list = (await res.json()) as RoomSummaryDto[];
      const byId = { ...get().roomsById };
      for (const r of list) byId[r.id] = r;
      set({ roomsById: byId, rooms: sortRooms(byId) });
    } catch {
      // Danh sách phòng lần đầu chỉ là "best effort" — cập nhật realtime tiếp theo qua useLobbyHub.
    }
  },

  upsertRoom: (room) => {
    // "LobbyUpdated" là broadcast dùng chung cho cả nhóm "lobby" — server không biết
    // đang gửi cho ai nên luôn trả isMine=false (xem báo cáo backend). Chỉ REST
    // (GET /api/games, tạo/ghép phòng) mới trả isMine đúng theo từng người gọi.
    // Không bao giờ hạ isMine true -> false chỉ vì một sự kiện broadcast đến sau.
    const prev = get().roomsById[room.id];
    const merged = prev?.isMine && !room.isMine ? { ...room, isMine: true } : room;
    const byId = { ...get().roomsById, [room.id]: merged };
    set({ roomsById: byId, rooms: sortRooms(byId) });
  },

  removeRoom: (roomId) => {
    const byId = { ...get().roomsById };
    delete byId[roomId];
    set({ roomsById: byId, rooms: sortRooms(byId) });
  },

  createRoom: async (gameKey, options) => {
    // Tên người chơi trong phòng do SERVER gán từ JWT (Context.User) — không gửi
    // playerName từ client nữa, xem GamesController.Create.
    const res = await fetch("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameKey, options }),
    });
    if (!res.ok) {
      set({ error: "Không tạo được phòng" });
      return null;
    }
    return (await res.json()) as RoomDto;
  },

  cancelRoom: async (roomId) => {
    const res = await fetch(`/api/games/${roomId}/cancel`, { method: "POST" });
    if (!res.ok) {
      set({ error: "Không huỷ được phòng." });
      return false;
    }
    return true;
  },

  quickMatch: async (gameKey) => {
    const res = await fetch("/api/games/quick-match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameKey }),
    });
    if (!res.ok) {
      set({ error: "Không tìm được trận phù hợp." });
      return null;
    }
    return (await res.json()) as RoomDto;
  },
}));
