import { useEffect } from "react";
import { BrowserRouter, Link } from "react-router-dom";
import GameView from "./components/GameView";
import LoginPage from "./platform/LoginPage";
import { useAuthStore } from "./platform/authStore";
import { useAdminStore } from "./platform/adminStore";
import ScrollToTop from "./platform/ScrollToTop";
import DisplayNameEditor from "./platform/DisplayNameEditor";

export default function App() {
  const { user, checking, restoreSession, logout } = useAuthStore();
  const { isAdmin, checkAdmin } = useAdminStore();

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    if (user) checkAdmin();
  }, [user, checkAdmin]);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <div className="min-h-screen bg-[#0d0a07] text-slate-100" style={{ backgroundImage: "radial-gradient(ellipse 80% 80% at 50% -20%, rgba(217,119,6,0.12), rgba(13,10,7,0.95))" }}>
        {/* Noise texture overlay — mix-blend-overlay hòa tan grain vào nền tối (gợi ý Gemini #3) */}
        <div className="pointer-events-none fixed inset-0 opacity-[0.035] mix-blend-overlay z-0" style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC44IiBudW1PY3RhdmVzPSIzIiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbHRlcj0idXJsKCNuKSIgb3BhY2l0eT0iMSIvPjwvc3ZnPg==')" }} />
        {/* max-w rộng hơn max-w-lg cũ — Thư viện trò chơi cần chỗ cho lưới 3-4 thẻ/hàng
            trên desktop (xem GameLibrary/GameDetails). Nội dung hẹp hơn (bàn cờ, form
            đăng nhập) tự căn giữa bên trong, không bị ảnh hưởng. */}
        <div className="relative z-10 w-full max-w-6xl mx-auto flex flex-col min-h-screen">
          <header className="px-4 pt-4 pb-3 mb-1 shrink-0 flex items-center justify-between border-b border-slate-800/60">
            <Link to="/games" className="text-2xl font-western tracking-wide text-amber-100 hover:text-amber-300 transition-colors drop-shadow-sm">🎲 BoardGame</Link>
            {user && (
              <div className="flex items-center gap-2 min-w-0">
                <DisplayNameEditor displayName={user.displayName} email={user.email} />
                <Link
                  to="/history"
                  className="shrink-0 text-xs px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300"
                >
                  📜 Lịch sử
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="shrink-0 text-xs px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300"
                  >
                    🛠 Quản trị
                  </Link>
                )}
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
            <main className="flex-1 px-4 pb-6">
              <GameView />
            </main>
          )}
        </div>
      </div>
    </BrowserRouter>
  );
}
