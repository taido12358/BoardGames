import type { CreateOptionsFormProps } from "../../platform/gameLibraryTypes";

/** UI tuỳ chọn tạo phòng riêng cho BANG! — chuyển từ GameDetails.tsx (hard-code trước đây) sang đây. */
export default function BangCreateOptions({ value, onChange }: CreateOptionsFormProps) {
  const seatCount = typeof value.seatCount === "number" ? value.seatCount : 4;
  return (
    <div>
      {/* Nhóm nút chọn 1-trong-N, không phải input đơn lẻ — dùng role="group" + aria-labelledby
          thay vì <label> (label không có "for" chỏ tới input thì screen reader bỏ qua). */}
      <span id="bang-seat-count-label" className="text-slate-400 text-xs uppercase tracking-wide">Số người tối đa</span>
      <div role="group" aria-labelledby="bang-seat-count-label" className="mt-1 grid grid-cols-5 gap-1.5">
        {[4, 5, 6, 7, 8].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange({ ...value, seatCount: n })}
            aria-pressed={seatCount === n}
            className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
              seatCount === n ? "bg-amber-700 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
