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
        className="text-sm text-amber-200/70 hover:text-amber-100 truncate max-w-[8rem] sm:max-w-none transition-colors"
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
        className="w-28 rounded-lg bg-[#120c08] border border-amber-900/50 px-2 py-1 text-sm text-amber-100 shadow-[inset_0_2px_3px_rgba(0,0,0,0.7)] outline-none focus:border-amber-500/60 focus:shadow-[inset_0_2px_3px_rgba(0,0,0,0.7),0_0_8px_rgba(217,119,6,0.2)]"
      />
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="relative text-xs px-2 py-1 rounded-md bg-gradient-to-b from-amber-600 to-amber-800 border-t border-amber-400/40 shadow-[0_2px_0_0_#451a03] transition-all hover:brightness-110 active:top-[1px] active:shadow-none disabled:opacity-50 text-amber-50 font-semibold"
      >
        {saving ? "Đang lưu…" : "Lưu"}
      </button>
      <button type="button" disabled={saving} onClick={cancel} className="text-xs px-1.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 disabled:opacity-50">
        Huỷ
      </button>
      {error && <span role="alert" className="w-full text-xs text-red-400">{error}</span>}
    </div>
  );
}
