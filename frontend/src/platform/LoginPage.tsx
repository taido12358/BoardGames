import { useState } from "react";
import { useAuthStore } from "./authStore";

/**
 * Đăng nhập không mật khẩu: nhập email Gmail → nhận mã 6 số qua email → nhập mã.
 */
export default function LoginPage() {
  const { step, pendingEmail, loading, error, resendIn, requestOtp, verifyOtp, backToEmail } =
    useAuthStore();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  const submitEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loading && email.trim()) requestOtp(email.trim());
  };

  const submitCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loading && code.trim().length === 6) verifyOtp(code.trim());
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6">
      {/* Brand header */}
      <div className="text-center space-y-2">
        <div className="text-5xl">🎲</div>
        <h1 className="text-3xl font-black tracking-tight text-slate-100">BoardGame</h1>
        <p className="text-slate-400 text-sm">Chơi board game cùng bạn bè — mọi lúc, mọi nơi.</p>
      </div>

      {/* Login card */}
      <div className="w-full max-w-sm bg-slate-800/80 rounded-2xl border border-slate-700 p-6 shadow-xl space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-base font-bold text-slate-100">
            {step === "email" ? "🔐 Đăng nhập" : "📬 Nhập mã xác nhận"}
          </h2>
          <p className="text-slate-400 text-sm leading-snug">
            {step === "email"
              ? "Nhập Gmail của bạn — chúng tôi sẽ gửi mã đăng nhập 6 số."
              : <>Mã 6 số đã gửi đến{" "}
                  <span className="text-amber-300 font-medium">{pendingEmail}</span>.
                  <br /><span className="text-slate-500 text-xs">Kiểm tra cả mục Spam.</span>
                </>}
          </p>
        </div>

        {step === "email" ? (
          <form onSubmit={submitEmail} className="space-y-3">
            <div>
              <label htmlFor="login-email" className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                autoFocus
                className="w-full mt-1.5 rounded-xl bg-slate-700 border border-slate-600 px-3 py-2.5 outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm transition-colors"
                placeholder="ban@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full rounded-xl bg-amber-700 hover:bg-amber-600 active:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 font-bold text-sm transition-colors shadow-md"
            >
              {loading ? "Đang gửi mã…" : "📧 Gửi mã đăng nhập"}
            </button>
          </form>
        ) : (
          <form onSubmit={submitCode} className="space-y-3">
            <div>
              <label htmlFor="login-code" className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                Mã xác nhận
              </label>
              <input
                id="login-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                autoFocus
                className="w-full mt-1.5 rounded-xl bg-slate-700 border border-slate-600 px-3 py-2.5 outline-none focus:ring-2 focus:ring-amber-500 text-center text-2xl tracking-[0.5em] font-mono transition-colors"
                placeholder="······"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full rounded-xl bg-amber-700 hover:bg-amber-600 active:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 font-bold text-sm transition-colors shadow-md"
            >
              {loading ? "Đang kiểm tra…" : "✅ Đăng nhập"}
            </button>
            <div className="flex justify-between text-sm">
              <button type="button" onClick={backToEmail} className="text-slate-400 hover:text-slate-200 transition-colors">
                ← Đổi email
              </button>
              <button
                type="button"
                disabled={resendIn > 0 || loading}
                onClick={() => requestOtp(pendingEmail)}
                className="text-amber-400 hover:text-amber-300 disabled:text-slate-500 transition-colors"
              >
                {resendIn > 0 ? `Gửi lại mã (${resendIn}s)` : "Gửi lại mã"}
              </button>
            </div>
          </form>
        )}

        {error && (
          <p role="alert" className="text-sm text-red-300 bg-red-900/40 border border-red-800/40 rounded-xl px-3 py-2">
            ⚠️ {error}
          </p>
        )}
      </div>

      {/* Games preview */}
      <div className="flex items-center gap-3 text-2xl opacity-40">
        <span>🤠</span><span>♟️</span><span>🎲</span><span>🏹</span><span>🎯</span>
      </div>
    </div>
  );
}
