import { useState } from "react";
import { useLocation } from "react-router-dom";

/** Liên kết tới đúng phòng; vẫn cho chọn/copy thủ công nếu trình duyệt chặn clipboard. */
export default function RoomInvite() {
  const { pathname } = useLocation();
  const url = new URL(pathname, window.location.origin).href;
  const [copying, setCopying] = useState(false);
  const [notice, setNotice] = useState("");

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
    <section aria-label="Mời bạn vào phòng" className="mx-auto w-full max-w-2xl space-y-2 rounded-sm border border-amber-900/40 bg-amber-950/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-amber-200">Mời bạn vào cùng phòng</p>
        <button type="button" disabled={copying} onClick={copy} className="rounded-sm bg-amber-800 px-3 py-2 text-sm text-white hover:bg-amber-700 disabled:opacity-50">{copying ? "Đang sao chép…" : "Sao chép liên kết"}</button>
      </div>
      <input aria-label="Liên kết phòng" readOnly value={url} onFocus={(event) => event.currentTarget.select()} className="w-full min-w-0 rounded-sm border border-amber-900/50 bg-[#120c08] px-3 py-2 text-xs text-amber-300/70 shadow-[inset_0_2px_3px_rgba(0,0,0,0.7)] outline-none focus:border-amber-500/60" />
      {notice && <p role="status" className="text-xs text-amber-200/80">{notice}</p>}
    </section>
  );
}
