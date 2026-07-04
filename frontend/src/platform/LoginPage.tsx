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
    <div className="bg-slate-800 rounded-2xl p-5 shadow-lg space-y-4 mt-8">
      <div className="text-center space-y-1">
        <h2 className="text-lg font-semibold">🔐 Đăng nhập</h2>
        <p className="text-slate-400 text-sm">
          {step === "email"
            ? "Nhập Gmail của bạn — chúng tôi sẽ gửi mã đăng nhập 6 số."
            : <>Mã 6 số đã gửi đến <span className="text-slate-200 font-medium">{pendingEmail}</span>. Kiểm tra cả mục Spam.</>}
        </p>
      </div>

      {step === "email" ? (
        <form onSubmit={submitEmail} className="space-y-3">
          <div>
            <label htmlFor="login-email" className="text-slate-400 text-xs uppercase tracking-wide">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              autoFocus
              className="w-full mt-1 rounded-xl bg-slate-700 px-3 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              placeholder="ban@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 px-4 py-3 font-semibold text-sm transition-colors"
          >
            {loading ? "Đang gửi mã…" : "📧 Gửi mã đăng nhập"}
          </button>
        </form>
      ) : (
        <form onSubmit={submitCode} className="space-y-3">
          <div>
            <label htmlFor="login-code" className="text-slate-400 text-xs uppercase tracking-wide">
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
              className="w-full mt-1 rounded-xl bg-slate-700 px-3 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 text-center text-2xl tracking-[0.5em] font-mono"
              placeholder="······"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 px-4 py-3 font-semibold text-sm transition-colors"
          >
            {loading ? "Đang kiểm tra…" : "✅ Đăng nhập"}
          </button>
          <div className="flex justify-between text-sm">
            <button type="button" onClick={backToEmail} className="text-slate-400 hover:text-slate-200">
              ← Đổi email
            </button>
            <button
              type="button"
              disabled={resendIn > 0 || loading}
              onClick={() => requestOtp(pendingEmail)}
              className="text-emerald-400 hover:text-emerald-300 disabled:text-slate-500"
            >
              {resendIn > 0 ? `Gửi lại mã (${resendIn}s)` : "Gửi lại mã"}
            </button>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-300 bg-red-900/40 rounded-xl px-3 py-2">
          ⚠️ {error}
        </p>
      )}
    </div>
  );
}
