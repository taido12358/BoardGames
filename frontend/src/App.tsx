import { useEffect } from "react";
import { BrowserRouter, Link } from "react-router-dom";
import GameView from "./components/GameView";
import LoginPage from "./platform/LoginPage";
import { useAuthStore } from "./platform/authStore";
import { useAdminStore } from "./platform/adminStore";
import ScrollToTop from "./platform/ScrollToTop";
import DisplayNameEditor from "./platform/DisplayNameEditor";

export default function App() {
  const { user, checking, sessionError, restoreSession, logout, loggingOut, logoutError } = useAuthStore();
  const { isAdmin, checkAdmin } = useAdminStore();

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    if (user) checkAdmin();
  }, [user, checkAdmin]);

  return (
    <BrowserRouter>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-amber-200 focus:px-4 focus:py-3 focus:font-semibold focus:text-slate-950">Bỏ qua đến nội dung</a>
      <ScrollToTop />
      <div className="min-h-screen bg-[#0d0a07] text-amber-100" style={{ backgroundImage: "radial-gradient(ellipse 80% 80% at 50% -20%, rgba(217,119,6,0.12), rgba(13,10,7,0.95))" }}>
        {/* Noise texture overlay — mix-blend-overlay hòa tan grain vào nền tối (gợi ý Gemini #3) */}
        <div className="pointer-events-none fixed inset-0 opacity-[0.035] mix-blend-overlay z-0" style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC44IiBudW1PY3RhdmVzPSIzIiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbHRlcj0idXJsKCNuKSIgb3BhY2l0eT0iMSIvPjwvc3ZnPg==')" }} />
        {/* max-w rộng hơn max-w-lg cũ — Thư viện trò chơi cần chỗ cho lưới 3-4 thẻ/hàng
            trên desktop (xem GameLibrary/GameDetails). Nội dung hẹp hơn (bàn cờ, form
            đăng nhập) tự căn giữa bên trong, không bị ảnh hưởng. */}
        <div className="relative z-10 w-full max-w-6xl mx-auto flex flex-col min-h-screen">
          <header className="sticky top-0 z-50 relative px-4 pt-4 pb-3 mb-1 shrink-0 flex flex-wrap gap-3 items-center justify-between border-b border-amber-950/80 bg-gradient-to-b from-[#1a110a] via-[#140d08] to-[#0e0805] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.9)]">
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-500/35 to-transparent" />
            <Link to="/games" className="text-2xl font-western tracking-wide text-amber-100 hover:text-amber-300 transition-colors [text-shadow:0_1px_0_rgba(255,255,255,0.12),0_2px_4px_rgba(0,0,0,0.8)]">🎲 BoardGame</Link>
            {user && (
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <DisplayNameEditor displayName={user.displayName} email={user.email} />
                <Link
                  to="/history"
                  className="shrink-0 text-xs px-2.5 py-1.5 rounded-lg border border-amber-950/80 bg-[#140e0b]/90 text-amber-700/70 shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)] hover:border-amber-700/60 hover:bg-[#1a120d] hover:text-amber-400 transition-all uppercase tracking-wider"
                >
                  📜 Lịch sử
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="shrink-0 text-xs px-2.5 py-1.5 rounded-lg border border-amber-950/80 bg-[#140e0b]/90 text-amber-700/70 shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)] hover:border-amber-700/60 hover:bg-[#1a120d] hover:text-amber-400 transition-all uppercase tracking-wider"
                  >
                    🛠 Quản trị
                  </Link>
                )}
                <button
                  onClick={logout}
                  disabled={loggingOut}
                  className="shrink-0 text-xs px-2.5 py-1.5 rounded-lg border border-amber-950/80 bg-[#140e0b]/90 text-amber-700/70 shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)] hover:border-amber-700/60 hover:bg-[#1a120d] hover:text-amber-400 transition-all uppercase tracking-wider disabled:opacity-40"
                >
                  {loggingOut ? "Đang đăng xuất…" : "Đăng xuất"}
                </button>
              </div>
            )}
          </header>
          {user && logoutError && <p role="alert" className="mx-4 mb-3 rounded-xl bg-red-950/50 p-3 text-sm text-red-300">{logoutError}</p>}

          {checking ? (
            <main id="main-content" tabIndex={-1} className="flex-1 px-4 pb-6 flex items-center justify-center">
              <p role="status" className="text-amber-700/60 text-sm italic">Đang kiểm tra phiên đăng nhập…</p>
            </main>
          ) : sessionError ? (
            <main id="main-content" tabIndex={-1} className="flex-1 px-4 py-10">
              <div className="mx-auto max-w-md space-y-4 text-center">
                <p role="alert" className="rounded-xl bg-red-950/50 p-3 text-sm text-red-300">{sessionError}</p>
                <button onClick={restoreSession} className="rounded-xl bg-amber-700 px-4 py-3 font-semibold text-white hover:bg-amber-600">Kiểm tra lại phiên</button>
              </div>
            </main>
          ) : !user ? (
            <main id="main-content" tabIndex={-1} className="flex-1 px-4 pb-6">
              <LoginPage />
            </main>
          ) : (
            <main id="main-content" tabIndex={-1} className="flex-1 px-4 pb-6">
              <GameView />
            </main>
          )}
        </div>
      </div>
    </BrowserRouter>
  );
}
