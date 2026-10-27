import { useEffect, useState } from "react";
import type { CreateOptionsFormProps } from "../../platform/gameLibraryTypes";

/** UI tuỳ chọn tạo phòng riêng cho Vây Bắt — chuyển từ GameDetails.tsx (hard-code trước đây) sang đây. */
export default function VayBatCreateOptions({ value, onChange }: CreateOptionsFormProps) {
  const maxRedTurns = typeof value.maxRedTurns === "number" ? value.maxRedTurns : 15;
  const [draft, setDraft] = useState(String(maxRedTurns));
  useEffect(() => { setDraft(String(maxRedTurns)); }, [maxRedTurns]);
  return (
    <div>
      <label htmlFor="vaybat-max-red-turns" className="text-amber-700/60 text-[10px] font-bold uppercase tracking-widest">Giới hạn lượt Đỏ</label>
      <input
        id="vaybat-max-red-turns"
        type="number"
        min={1}
        step={1}
        inputMode="numeric"
        aria-describedby="vaybat-turns-hint"
        value={draft}
        onChange={(event) => {
          const raw = event.target.value;
          setDraft(raw);
          const parsed = Number(raw);
          if (raw !== "" && Number.isSafeInteger(parsed) && parsed >= 1)
            onChange({ ...value, maxRedTurns: parsed });
        }}
        onBlur={() => {
          const parsed = Number(draft);
          if (!Number.isSafeInteger(parsed) || parsed < 1) setDraft(String(maxRedTurns));
        }}
        className="create-option-input w-full mt-1.5 rounded-sm border border-amber-900/50 bg-[#120c08] px-3 py-2.5 text-sm text-amber-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.7)] outline-none transition-[border-color,box-shadow] duration-200 focus:border-amber-500/60 focus-visible:ring-2 focus-visible:ring-amber-500/40 focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.7),0_0_8px_rgba(217,119,6,0.2)] placeholder:text-amber-900/40"
      />
      <p id="vaybat-turns-hint" className="mt-1.5 text-xs text-amber-700/60">Nhập số nguyên từ 1. Nếu bỏ trống, giữ giới hạn trước đó.</p>
    </div>
  );
}
