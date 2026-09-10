import { useState } from "react";
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

  function startEdit() {
    setDraft(displayName);
    setError("");
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setError("");
  }

  async function save() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === displayName) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const ok = await updateDisplayName(trimmed);
    setSaving(false);
    if (ok) {
      setEditing(false);
    } else {
      setError(useAuthStore.getState().error || "Không đổi được tên.");
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={startEdit}
        title="Bấm để đổi tên hiển thị"
        className="text-sm text-slate-400 hover:text-slate-200 truncate max-w-[8rem] sm:max-w-none"
      >
        {displayName} <span className="text-slate-600">✏️</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") cancel();
        }}
        maxLength={30}
        autoFocus
        aria-label="Tên hiển thị mới"
        title={email}
        className="w-28 rounded-lg bg-slate-800 border border-slate-600 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-amber-500"
      />
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="text-xs px-1.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white"
      >
        Lưu
      </button>
      <button type="button" onClick={cancel} className="text-xs px-1.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300">
        Huỷ
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
