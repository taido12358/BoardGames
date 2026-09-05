import type { CreateOptionsFormProps } from "../../platform/gameLibraryTypes";

/** UI tuỳ chọn tạo phòng riêng cho Vây Bắt — chuyển từ GameDetails.tsx (hard-code trước đây) sang đây. */
export default function VayBatCreateOptions({ value, onChange }: CreateOptionsFormProps) {
  const maxRedTurns = typeof value.maxRedTurns === "number" ? value.maxRedTurns : 15;
  return (
    <div>
      <label className="text-slate-400 text-xs uppercase tracking-wide">Giới hạn lượt Đỏ</label>
      <input
        type="number"
        min={1}
        value={maxRedTurns}
        onChange={(e) => onChange({ ...value, maxRedTurns: Math.max(1, parseInt(e.target.value) || 1) })}
        className="w-full mt-1 rounded-xl bg-slate-800 border border-slate-700 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500"
      />
    </div>
  );
}
