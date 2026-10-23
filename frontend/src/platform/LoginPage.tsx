import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "./authStore";

/**
 * Đăng nhập không mật khẩu: nhập email → nhận mã 6 số qua email → nhập mã.
 */
export default function LoginPage() {
  const { step, pendingEmail, loading, error, resendIn, requestOtp, verifyOtp, backToEmail } =
    useAuthStore();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const codeInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCode("");
    if (step === "code") codeInput.current?.focus();
  }, [step, pendingEmail]);

  const resendCode = async () => {
    await requestOtp(pendingEmail);
    if (!useAuthStore.getState().error) {
      setCode("");
      codeInput.current?.focus();
    }
  };

  const submitEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loading && email.trim()) requestOtp(email.trim());
  };

  const submitCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loading && code.trim().length === 6) verifyOtp(code.trim());
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6" style={{ backgroundImage: "radial-gradient(circle, rgba(180,120,30,0.06) 1px, transparent 1px)", backgroundSize: "28px 28px" }}>
      {/* Brand header */}
      <div className="text-center space-y-2">
        <div className="text-5xl animate-bounce" style={{ animationDuration: "2.5s", animationTimingFunction: "ease-in-out" }}>🎲</div>
        <h1 className="text-3xl font-western tracking-wide text-amber-100">BoardGame</h1>
        <p className="text-slate-400 text-sm">Chơi board game cùng bạn bè — mọi lúc, mọi nơi.</p>
      </div>

      {/* Login card — double border theo gợi ý Gemini */}
      <div className="w-full max-w-sm rounded-xl border border-amber-500/20 bg-stone-900/80 p-1 shadow-2xl backdrop-blur-sm">
      <div className="rounded-lg border border-amber-500/30 p-6 bg-gradient-to-b from-[#241a14] to-[#1a120c] space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-base font-bold text-slate-100">
            {step === "email" ? "🔐 Đăng nhập" : "📬 Nhập mã xác nhận"}
          </h2>
          <p className="text-slate-400 text-sm leading-snug">
            {step === "email"
              ? "Nhập email của bạn — chúng tôi sẽ gửi mã đăng nhập 6 số."
              : <>Mã 6 số đã gửi đến{" "}
                  <span className="text-amber-300 font-medium break-all">{pendingEmail}</span>.
                  <br /><span className="text-slate-400 text-xs">Mã có hiệu lực 5 phút. Kiểm tra cả mục Spam.</span>
                </>}
          </p>
        </div>

        {step === "email" ? (
          <form onSubmit={submitEmail} aria-busy={loading} className="space-y-3">
            <div>
              <label htmlFor="login-email" className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                disabled={loading}
                required
                autoFocus
                className="w-full mt-1.5 rounded-md border border-amber-900/60 bg-[#120c08] px-4 py-2.5 text-amber-100 placeholder-amber-900/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] outline-none transition-colors focus:border-amber-500/80 focus:bg-[#170f0a] focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(217,119,6,0.2)] text-sm"
                placeholder="ban@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="relative w-full rounded-lg bg-gradient-to-b from-amber-600 via-amber-700 to-amber-800 px-4 py-3 font-bold text-sm text-amber-50 border-t border-amber-400/50 shadow-[0_4px_0_0_#451a03,0_8px_16px_rgba(0,0,0,0.5)] transition-all hover:brightness-110 active:top-[2px] active:shadow-[0_2px_0_0_#451a03] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Đang gửi mã…" : "📧 Gửi mã đăng nhập"}
            </button>
          </form>
        ) : (
          <form onSubmit={submitCode} aria-busy={loading} className="space-y-3">
            <div>
              <label htmlFor="login-code" className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                Mã xác nhận
              </label>
              <input
                id="login-code"
                ref={codeInput}
                type="text"
                disabled={loading}
                aria-describedby="login-code-hint"
                aria-invalid={!!error}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                autoFocus
                className="w-full mt-1.5 rounded-md border border-amber-900/60 bg-[#120c08] px-4 py-2.5 text-amber-100 placeholder-amber-900/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] outline-none transition-colors focus:border-amber-500/80 focus:bg-[#170f0a] focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(217,119,6,0.2)] text-center text-2xl tracking-[0.5em] font-mono"
                placeholder="······"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                onPaste={(e) => {
                  const pasted = e.clipboardData.getData("text");
                  const digits = pasted.replace(/[\s-]/g, "");
                  if (/^\d{6}$/.test(digits)) {
                    e.preventDefault();
                    setCode(digits);
                  }
                }}
              />
              <p id="login-code-hint" className="mt-2 text-xs text-slate-400">Nhập hoặc dán mã 6 số từ email mới nhất.</p>
            </div>
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="relative w-full rounded-lg bg-gradient-to-b from-amber-600 via-amber-700 to-amber-800 px-4 py-3 font-bold text-sm text-amber-50 border-t border-amber-400/50 shadow-[0_4px_0_0_#451a03,0_8px_16px_rgba(0,0,0,0.5)] transition-all hover:brightness-110 active:top-[2px] active:shadow-[0_2px_0_0_#451a03] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Đang kiểm tra…" : "✅ Đăng nhập"}
            </button>
            <div className="flex justify-between text-sm">
              <button type="button" disabled={loading} onClick={backToEmail} className="text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50">
                ← Đổi email
              </button>
              <button
                type="button"
                disabled={resendIn > 0 || loading}
                onClick={resendCode}
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
      </div>

      {/* Games preview */}
      <div className="flex items-center gap-4 text-3xl">
        {["🤠","♟️","🎲","🏹","🎯"].map((icon, i) => (
          <span
            key={i}
            className="opacity-30 hover:opacity-70 transition-all duration-300 hover:scale-125 cursor-default"
          >{icon}</span>
        ))}
      </div>
    </div>
  );
}
