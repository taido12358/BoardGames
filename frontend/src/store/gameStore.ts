import { create } from "zustand";
import type { RoomDto } from "../game/engineClient";

function loadPlayerName(): string {
  const saved = localStorage.getItem("playerName");
  if (saved) return saved;
  const name = "Player-" + Math.random().toString(36).slice(2, 6);
  localStorage.setItem("playerName", name);
  return name;
}

interface GameStore {
  playerName: string;
  rooms: RoomDto[];
  room: RoomDto | null;     // phòng đang chơi
  mySide: "RED" | "WHITE" | null;
  selected: string | null;  // pieceId đang chọn
  error: string;

  setPlayerName: (name: string) => void;
  setRooms: (rooms: RoomDto[]) => void;
  setRoom: (room: RoomDto | null) => void;
  setMySide: (side: "RED" | "WHITE" | null) => void;
  setSelected: (pieceId: string | null) => void;
  setError: (msg: string) => void;

  fetchRooms: () => Promise<void>;
  createRoom: (maxRedTurns: number) => Promise<RoomDto | null>;
}

export const useGameStore = create<GameStore>((set, get) => ({
  playerName: loadPlayerName(),
  rooms: [],
  room: null,
  mySide: null,
  selected: null,
  error: "",

  setPlayerName: (name) => {
    localStorage.setItem("playerName", name);
    set({ playerName: name });
  },
  setRooms: (rooms) => set({ rooms }),
  setRoom: (room) => set({ room }),
  setMySide: (mySide) => set({ mySide }),
  setSelected: (selected) => set({ selected }),
  setError: (error) => set({ error }),

  fetchRooms: async () => {
    const res = await fetch("/api/games");
    set({ rooms: await res.json() });
  },

  createRoom: async (maxRedTurns) => {
    const res = await fetch("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ maxRedTurns, playerName: get().playerName }),
    });
    if (!res.ok) {
      set({ error: "Không tạo được phòng" });
      return null;
    }
    return (await res.json()) as RoomDto;
  },
}));
