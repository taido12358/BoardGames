import { create } from "zustand";

export interface Greeting {
  id?: number;
  message: string;
  createdAt?: string;
}

interface HelloState {
  latest: string;
  source: string;
  feed: string[];
  loading: boolean;
  fetchLatest: () => Promise<void>;
  createGreeting: (message: string) => Promise<void>;
  pushFromHub: (message: string) => void;
}

export const useHelloStore = create<HelloState>((set, get) => ({
  latest: "",
  source: "",
  feed: [],
  loading: false,

  fetchLatest: async () => {
    set({ loading: true });
    const res = await fetch("/api/hello");
    const data = await res.json();
    set({ latest: data.message, source: data.source, loading: false });
  },

  createGreeting: async (message: string) => {
    set({ loading: true });
    await fetch("/api/hello", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    set({ loading: false });
    await get().fetchLatest();
  },

  pushFromHub: (message: string) =>
    set((state) => ({ feed: [message, ...state.feed].slice(0, 20) })),
}));
