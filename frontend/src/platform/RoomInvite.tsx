import { useState } from "react";
import { useLocation } from "react-router-dom";

/** Liên kết tới đúng phòng; vẫn cho chọn/copy thủ công nếu trình duyệt chặn clipboard. */
export default function RoomInvite() {
  const { pathname } = useLocation();
  const url = new URL(pathname, window.location.origin).href;
  const [copying, setCopying] = useState(false);
  const [notice, setNotice] = useState("");
  const copied = notice.startsWith("Đã sao chép");

  async function copy() {
    setCopying(true);
    setNotice("");
    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(url);
      setNotice("Đã sao chép liên kết. Gửi cho bạn bè để vào cùng phòng.");
    } catch {
      setNotice("Chưa sao chép được. Bạn có thể chọn liên kết bên dưới và sao chép thủ công.");
    } finally {
      setCopying(false);
    }
  }

  return (
    <section aria-label="Mời bạn vào phòng" className="animate-game-action-enter mx-auto w-full max-w-2xl space-y-2 rounded-sm border border-amber-900/40 bg-amber-950/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-amber-200">Mời bạn vào cùng phòng</p>
        <button type="button" disabled={copying} aria-busy={copying} onClick={copy} className={`room-invite-copy-button rounded-sm font-bold text-xs px-3 py-1.5 border-t shadow-[0_2px_6px_rgba(0,0,0,0.6)] active:translate-y-0.5 active:border-b-0 transition-all disabled:opacity-50 ${copied ? "border-lime-200/50 border-b-2 border-lime-950/70 bg-gradient-to-b from-lime-300 via-lime-500 to-lime-700 text-lime-950" : "border-[#f5d09d]/50 border-b-2 border-[#3a1f06] bg-gradient-to-b from-[#d4a853] via-[#a0672a] to-[#6b3e10] text-[#271206] hover:brightness-110"}`}>{copying && <span aria-hidden="true" className="activity-spinner is-spinning mr-1.5 align-[-2px]" />}{copying ? "Đang sao chép…" : copied ? "Đã sao chép" : "Sao chép liên kết"}</button>
      </div>
      <input aria-label="Liên kết phòng" readOnly value={url} onFocus={(event) => event.currentTarget.select()} className="w-full min-w-0 rounded-sm border border-amber-900/50 bg-[#120c08] px-3 py-2 text-xs text-amber-300/70 shadow-[inset_0_2px_3px_rgba(0,0,0,0.7)] outline-none focus:border-amber-500/60" />
      {notice && (
        <p key={notice} role="status" aria-live="polite" className={`animate-game-action-enter flex items-start gap-1.5 text-xs ${copied ? "text-lime-200" : "text-amber-200/80"}`}>
          {copied && <span aria-hidden="true" className="inline-grid h-4 w-4 shrink-0 place-items-center rounded-full border border-lime-300/50 bg-lime-400/15 font-bold">{"\u2713"}</span>}
          <span>{notice}</span>
        </p>
      )}
    </section>
  );
}
