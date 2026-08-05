import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import GameView from "./components/GameView";
import LoginPage from "./platform/LoginPage";
import { useAuthStore } from "./platform/authStore";
import ScrollToTop from "./platform/ScrollToTop";

export default function App() {
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
            <main className="flex-1 px-4 pb-6">
              <GameView />
            </main>
          )}
        </div>
      </div>
    </BrowserRouter>
  );
}
