import { useRef, useState } from "react";
import { useAuthStore } from "./authStore";

/**
 * Sửa tên hiển thị — dùng `PUT /api/auth/display-name` (đã có sẵn ở backend từ đầu dự án, đủ
 * validate rỗng/tối đa 30 ký tự + refresh claim JWT, xem AuthController.cs) nhưng CHƯA từng có
 * giao diện gọi tới. Bấm vào tên để sửa tại chỗ — không cần trang/modal riêng.
 */
export default function DisplayNameEditor({ displayName, email }: { displayName: string; email: string }) {
  const { updateDisplayName } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(displayName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const saveLock = useRef(false);

  function startEdit() {
    setDraft(displayName);
    setError("");
    setEditing(true);
  }

  function cancel() {
    if (saveLock.current) return;
    setEditing(false);
    setError("");
  }

  async function save() {
    if (saveLock.current) return;
    const trimmed = draft.trim();
    if (!trimmed) {
      setError("Tên hiển thị không được để trống.");
      return;
    }
    if (trimmed === displayName) {
      setEditing(false);
      return;
    }
    saveLock.current = true;
    setSaving(true);
    setError("");
    try {
      const ok = await updateDisplayName(trimmed);
      if (ok) setEditing(false);
      else setError(useAuthStore.getState().error || "Không đổi được tên.");
    } catch {
      setError("Không kết nối được máy chủ. Tên đang soạn được giữ lại để thử lại.");
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={startEdit}
        title="Bấm để đổi tên hiển thị"
        className="text-sm text-[#f5d09d]/80 hover:text-[#f5d09d] truncate max-w-[8rem] sm:max-w-none transition-colors"
      >
        {displayName} <span className="text-amber-800/60 text-xs">✏</span>
      </button>
    );
  }

  return (
    <div aria-busy={saving} className="flex flex-wrap items-center gap-1">
      <input
        type="text"
        disabled={saving}
        aria-invalid={!!error}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); save(); }
          if (e.key === "Escape") cancel();
        }}
        maxLength={30}
        autoFocus
        aria-label="Tên hiển thị mới"
        title={email}
        className="w-28 rounded-sm bg-[#1a100a]/90 border border-[#6b4421] px-2 py-1 text-sm text-[#fae4c8] shadow-[inset_0_2px_3px_rgba(0,0,0,0.7)] outline-none focus:border-[#d99748] focus:ring-1 focus:ring-[#d99748]/40"
      />
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="text-xs px-2.5 py-1 rounded-sm font-bold text-[#271206] bg-gradient-to-b from-[#fce295] via-[#df9031] to-[#87460e] border-t border-[#fff4d1] border-b-2 border-[#4d2506] shadow-[0_2px_6px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.2)] hover:brightness-110 active:translate-y-0.5 active:border-b-0 transition-all disabled:opacity-50"
      >
        {saving ? "Đang lưu…" : "Lưu"}
      </button>
      <button type="button" disabled={saving} onClick={cancel} className="text-xs px-1.5 py-1 rounded-sm border border-[#6b4725]/60 bg-[#22140c]/90 text-[#bba182] shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)] hover:border-[#b47a3c]/80 hover:text-[#f3d4a2] transition-all disabled:opacity-50">
        Huỷ
      </button>
      {error && <span role="alert" className="w-full text-xs text-red-400">{error}</span>}
    </div>
  );
}
