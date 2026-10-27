import type { CreateOptionsFormProps } from "../../platform/gameLibraryTypes";

/** UI tuỳ chọn tạo phòng riêng cho BANG! — chuyển từ GameDetails.tsx (hard-code trước đây) sang đây. */
export default function BangCreateOptions({ value, onChange }: CreateOptionsFormProps) {
  const seatCount = typeof value.seatCount === "number" ? value.seatCount : 4;
  return (
    <div>
      {/* Nhóm nút chọn 1-trong-N, không phải input đơn lẻ — dùng role="group" + aria-labelledby
          thay vì <label> (label không có "for" chỏ tới input thì screen reader bỏ qua). */}
      <span id="bang-seat-count-label" className="text-[#bba182] text-[10px] font-bold uppercase tracking-widest">Số người tối đa</span>
      <div role="group" aria-labelledby="bang-seat-count-label" className="mt-1.5 grid grid-cols-5 gap-1.5">
        {[4, 5, 6, 7, 8].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange({ ...value, seatCount: n })}
            aria-pressed={seatCount === n}
            className={`game-option-button relative rounded-sm py-2 text-sm font-bold transition-all hover:-translate-y-0.5 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 ${
              seatCount === n
                ? "font-extrabold text-[#241106] bg-gradient-to-b from-[#f3c87f] via-[#d49445] to-[#99581a] border-t border-[#ffebbe] border-b-2 border-[#542a07] shadow-[0_2px_8px_rgba(217,119,6,0.35),0_1px_0_rgba(0,0,0,0.8)]"
                : "border border-[#6b4725]/60 bg-[#22140c]/90 text-[#bba182] shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)] hover:border-[#b47a3c]/80 hover:bg-[#2c1a10] hover:text-[#f3d4a2]"
            }`}
          >
            {seatCount === n && <span aria-hidden="true" className="game-option-selection-mark">✓</span>}
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
