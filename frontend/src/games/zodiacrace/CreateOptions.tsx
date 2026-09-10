import type { CreateOptionsFormProps } from "../../platform/gameLibraryTypes";

/** UI tuỳ chọn tạo phòng riêng cho Đua Xe Hoàng Đạo — chọn số người chơi (2-6), theo đúng khuôn BangCreateOptions. */
export default function ZodiacRaceCreateOptions({ value, onChange }: CreateOptionsFormProps) {
  const seatCount = typeof value.seatCount === "number" ? value.seatCount : 4;
  return (
    <div>
      <label className="text-slate-400 text-xs uppercase tracking-wide">Số người chơi</label>
      <div className="mt-1 grid grid-cols-5 gap-1.5">
        {[2, 3, 4, 5, 6].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange({ ...value, seatCount: n })}
            aria-pressed={seatCount === n}
            className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
              seatCount === n ? "bg-purple-700 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
