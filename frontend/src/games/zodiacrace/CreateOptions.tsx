import type { CreateOptionsFormProps } from "../../platform/gameLibraryTypes";

/** UI tuỳ chọn tạo phòng riêng cho Đua Xe Hoàng Đạo — chọn số người chơi (2-6), theo đúng khuôn BangCreateOptions. */
export default function ZodiacRaceCreateOptions({ value, onChange }: CreateOptionsFormProps) {
  const seatCount = typeof value.seatCount === "number" ? value.seatCount : 4;
  return (
    <div>
      {/* Nhóm nút chọn 1-trong-N, không phải input đơn lẻ — dùng role="group" + aria-labelledby
          thay vì <label> (label không có "for" chỏ tới input thì screen reader bỏ qua). */}
      <span id="zodiacrace-seat-count-label" className="text-amber-700/60 text-[10px] font-bold uppercase tracking-widest">Số Người Chơi</span>
      <div role="group" aria-labelledby="zodiacrace-seat-count-label" className="mt-1.5 grid grid-cols-5 gap-1.5">
        {[2, 3, 4, 5, 6].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange({ ...value, seatCount: n })}
            aria-pressed={seatCount === n}
            className={`relative rounded-lg py-2 text-sm font-bold transition-all ${
              seatCount === n
                ? "bg-gradient-to-b from-amber-600 to-amber-800 border-t border-amber-400/40 text-amber-50 shadow-[0_3px_0_0_#451a03]"
                : "border border-amber-950/80 bg-[#140e0b]/90 text-amber-700/70 shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)] hover:border-amber-700/60 hover:bg-[#1a120d] hover:text-amber-400"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
