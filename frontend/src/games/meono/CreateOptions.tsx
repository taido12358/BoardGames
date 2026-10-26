import type { CreateOptionsFormProps } from "../../platform/gameLibraryTypes";

export default function MeoNoCreateOptions({ value, onChange }: CreateOptionsFormProps) {
  const seatCount = typeof value.seatCount === "number" ? value.seatCount : 3;
  return (
    <div>
      <span id="meono-seat-label" className="text-[#e879a4] text-[10px] font-bold uppercase tracking-widest">
        Số người chơi
      </span>
      <div role="group" aria-labelledby="meono-seat-label" className="mt-1.5 grid grid-cols-5 gap-1.5">
        {[2, 3, 4, 5, 6].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange({ ...value, seatCount: n })}
            aria-pressed={seatCount === n}
            className={`game-option-button relative rounded-sm py-2 text-sm font-bold transition-all hover:-translate-y-0.5 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-300 ${
              seatCount === n
                ? "font-extrabold text-white bg-gradient-to-b from-[#f472b6] via-[#ec4899] to-[#be185d] border-t border-pink-300 border-b-2 border-pink-900 shadow-[0_2px_8px_rgba(236,72,153,0.4)]"
                : "border border-pink-900/60 bg-black/40 text-pink-300 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)] hover:border-pink-500/80 hover:text-pink-100"
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
