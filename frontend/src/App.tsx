import { useEffect, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { useHelloStore } from "./store/helloStore";
import { useGameHub } from "./hooks/useGameHub";
import GameView from "./components/GameView";
import LoginPage from "./platform/LoginPage";
import { useAuthStore } from "./platform/authStore";
import ScrollToTop from "./platform/ScrollToTop";

type Tab = "game" | "hello";

export default function App() {
  const [tab, setTab] = useState<Tab>("game");
  const { user, checking, restoreSession, logout } = useAuthStore();

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <div className="min-h-screen bg-slate-900 text-slate-100">
        {/* max-w rộng hơn max-w-lg cũ — Thư viện trò chơi cần chỗ cho lưới 3-4 thẻ/hàng
            trên desktop (xem GameLibrary/GameDetails). Nội dung hẹp hơn (bàn cờ, form
            đăng nhập) tự căn giữa bên trong, không bị ảnh hưởng. */}
        <div className="w-full max-w-6xl mx-auto flex flex-col min-h-screen">
          <header className="px-4 pt-4 pb-2 shrink-0 flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">🎲 BoardGame</h1>
            {user && (
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm text-slate-400 truncate" title={user.email}>
                  {user.displayName}
                </span>
                <button
                  onClick={logout}
                  className="shrink-0 text-xs px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300"
                >
                  Đăng xuất
                </button>
              </div>
            )}
          </header>

          {checking ? (
            <main className="flex-1 px-4 pb-6 flex items-center justify-center">
              <p className="text-slate-500 text-sm">Đang kiểm tra phiên đăng nhập…</p>
            </main>
          ) : !user ? (
            <main className="flex-1 px-4 pb-6">
              <LoginPage />
            </main>
          ) : (
            <>
              <nav className="flex px-4 pb-3 gap-2 shrink-0">
                <TabButton active={tab === "game"} onClick={() => setTab("game")}>🎯 Game</TabButton>
                <TabButton active={tab === "hello"} onClick={() => setTab("hello")}>👋 Hello</TabButton>
              </nav>

              <main className="flex-1 px-4 pb-6">
                {tab === "game" ? <GameView /> : <HelloPanel />}
              </main>
            </>
          )}
        </div>
      </div>
    </BrowserRouter>
  );
}

function TabButton({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick}
      className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-colors ${
        active ? "bg-emerald-600" : "bg-slate-700 hover:bg-slate-600 active:bg-slate-500"
      }`}>
      {children}
    </button>
  );
}

function HelloPanel() {
  const { latest, source, feed, loading, fetchLatest, createGreeting } = useHelloStore();
  const [draft, setDraft] = useState("Hello, World!");

  useGameHub();
  useEffect(() => { fetchLatest(); }, [fetchLatest]);

  return (
    <div className="space-y-4">
      <div className="bg-slate-800 rounded-2xl p-4 shadow-lg space-y-4">
        <div>
          <span className="text-slate-400 text-sm">Latest greeting</span>
          <p className="text-2xl font-semibold">{latest || "…"}</p>
          {source && (
            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-emerald-600/30 text-emerald-300">
              served from {source}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-xl bg-slate-700 px-3 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a greeting…"
          />
          <button disabled={loading} onClick={() => createGreeting(draft)}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-2.5 font-medium text-sm">
            Send
          </button>
        </div>
      </div>

      <div className="bg-slate-800 rounded-2xl p-4 shadow-lg">
        <h2 className="text-xs text-slate-400 mb-2 uppercase tracking-wide">Realtime feed (SignalR ← RabbitMQ)</h2>
        <ul className="space-y-1 max-h-48 overflow-auto">
          {feed.length === 0 && <li className="text-slate-500 text-sm">No events yet…</li>}
          {feed.map((m, i) => (
            <li key={i} className="text-sm bg-slate-700/50 rounded px-2 py-1">{m}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
