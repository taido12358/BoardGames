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
      <div className="min-h-screen bg-[#0d1117] text-slate-100" style={{ backgroundImage: "radial-gradient(ellipse at 20% 10%, rgba(30,20,10,0.5) 0%, transparent 60%), radial-gradient(ellipse at 80% 90%, rgba(20,10,5,0.4) 0%, transparent 60%)" }}>
        {/* max-w rộng hơn max-w-lg cũ — Thư viện trò chơi cần chỗ cho lưới 3-4 thẻ/hàng
            trên desktop (xem GameLibrary/GameDetails). Nội dung hẹp hơn (bàn cờ, form
            đăng nhập) tự căn giữa bên trong, không bị ảnh hưởng. */}
        <div className="w-full max-w-6xl mx-auto flex flex-col min-h-screen">
          <header className="px-4 pt-4 pb-3 mb-1 shrink-0 flex items-center justify-between border-b border-slate-800/60">
            <Link to="/games" className="text-2xl font-bold tracking-tight hover:text-amber-200 transition-colors">🎲 BoardGame</Link>
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
