import type { GameMetadata } from "../platform/gameLibraryTypes";
import { ARTWORK_BG } from "../platform/artworkTheme";
import AnimatedNumber from "./AnimatedNumber";

interface Props {
  metadata: GameMetadata;
  /** Số phòng đang chờ CỦA GAME NÀY — chỉ truyền khi có dữ liệu backend thật, không bịa số liệu. */
  waitingRooms?: number;
  disabled?: boolean;
  onViewDetails: () => void;
  onPlayNow: () => void;
}

const ACCENT_RING: Record<GameMetadata["accent"], string> = {
  western: "group-hover:ring-amber-500/60 group-hover:shadow-amber-900/40",
  graph: "group-hover:ring-indigo-400/60 group-hover:shadow-indigo-900/40",
  folk: "group-hover:ring-lime-500/60 group-hover:shadow-lime-900/40",
  zodiac: "group-hover:ring-purple-500/60 group-hover:shadow-purple-900/40",
  kittens: "group-hover:ring-pink-500/60 group-hover:shadow-pink-900/40",
  default: "group-hover:ring-slate-400/50 group-hover:shadow-slate-900/40",
};

function StarRating({ count }: { count: number }) {
  if (count <= 0) return <span className="text-amber-900/50 text-xs">Chưa đánh giá</span>;
  return (
    <span className="text-amber-400 text-sm tracking-tight" aria-label={`Độ khó ${count} trên 5 sao`}>
      {"★".repeat(count)}
      <span className="text-amber-900/40">{"★".repeat(5 - count)}</span>
    </span>
  );
}

export default function GameCard({ metadata: m, waitingRooms, disabled = false, onViewDetails, onPlayNow }: Props) {
  return (
    <div
      role="group"
      aria-label={m.title}
      className={`game-library-card group relative flex flex-col rounded-sm border border-[#69421f]/70 bg-gradient-to-b from-[#1e1810] to-[#141009]
        shadow-[inset_0_1px_0_rgba(255,205,130,0.1),0_12px_24px_rgba(0,0,0,0.85)] transition-all duration-300 ease-out overflow-hidden
        hover:-translate-y-2 hover:rotate-1 hover:scale-[1.01] hover:border-[#c88a42] hover:shadow-[0_16px_32px_rgba(0,0,0,0.9),0_0_15px_rgba(200,138,66,0.25)] ${ACCENT_RING[m.accent]}`}
    >
      {/* Weathered edge highlight — ánh sáng đèn dầu hắt vào mép */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/30 to-transparent z-10" />
      {/* Card glare — ánh đèn chùm hắt vào góc trên-trái */}
      <div className="pointer-events-none absolute -left-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br from-amber-400/20 via-amber-500/5 to-transparent blur-xl z-10" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-amber-200/[0.03] to-amber-300/[0.07] z-10" />
      {/* Brass rivets — đinh tán đồng thau 4 góc */}
      <span className="pointer-events-none absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-gradient-to-br from-[#e0b070] to-[#603b15] shadow-[0_1px_2px_rgba(0,0,0,0.8)] z-20" />
      <span className="pointer-events-none absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-gradient-to-br from-[#e0b070] to-[#603b15] shadow-[0_1px_2px_rgba(0,0,0,0.8)] z-20" />
      <span className="pointer-events-none absolute bottom-2 left-2 w-1.5 h-1.5 rounded-full bg-gradient-to-br from-[#e0b070] to-[#603b15] shadow-[0_1px_2px_rgba(0,0,0,0.8)] z-20" />
      <span className="pointer-events-none absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full bg-gradient-to-br from-[#e0b070] to-[#603b15] shadow-[0_1px_2px_rgba(0,0,0,0.8)] z-20" />
      {/* Artwork — chiếm ~50% chiều cao thẻ */}
      <button
        type="button"
        onClick={onViewDetails}
        disabled={disabled}
        aria-label={`Xem hướng dẫn ${m.title}`}
        className={`relative h-36 sm:h-48 w-full flex items-center justify-center overflow-hidden border-b border-[#573517] ${ARTWORK_BG[m.accent]} shadow-[inset_0_2px_8px_rgba(0,0,0,0.85)]`}
      >
        {/* Corner bracket nẹp kim loại giả lập đóng khung */}
        <span className="pointer-events-none absolute top-1.5 left-1.5 w-3 h-3 border-t border-l border-[#c8924b]/40 z-20" />
        <span className="pointer-events-none absolute top-1.5 right-1.5 w-3 h-3 border-t border-r border-[#c8924b]/40 z-20" />
        <span className="pointer-events-none absolute bottom-1.5 left-1.5 w-3 h-3 border-b border-l border-[#c8924b]/40 z-20" />
        <span className="pointer-events-none absolute bottom-1.5 right-1.5 w-3 h-3 border-b border-r border-[#c8924b]/40 z-20" />
        <span
          className="game-library-card-emblem text-7xl sm:text-8xl transition-all duration-300 ease-out group-hover:scale-110 drop-shadow-[0_8px_20px_rgba(0,0,0,0.9)] group-hover:drop-shadow-[0_12px_28px_rgba(0,0,0,0.95)] relative z-0"
          aria-hidden="true"
        >
          {m.emblem}
        </span>
        {/* Vignette đèn dầu + gradient dưới */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.65)_100%)] pointer-events-none z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 z-10" />
        {waitingRooms !== undefined && waitingRooms > 0 && (
          <span className="game-library-waiting-badge absolute top-2 right-2 rounded-full bg-amber-900/80 border border-amber-600/50 px-2.5 py-1 text-[11px] font-semibold text-amber-200">
            🕯 <AnimatedNumber value={waitingRooms} durationMs={320} /> phòng đang chờ
          </span>
        )}
      </button>

      {/* Nội dung */}
      <div className="flex flex-col gap-2 p-4 flex-1">
        <div>
          <h3 className="font-serif text-lg font-black tracking-widest text-[#fae1be] group-hover:text-[#ffd693] uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] transition-colors">{m.title}</h3>
          <p className="text-[11px] font-serif font-bold uppercase tracking-[0.22em] text-[#c99a5e] mt-0.5">{m.subtitle}</p>
        </div>

        <p className="text-sm text-[#d4b996]/75 leading-snug line-clamp-2">{m.description}</p>

        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="rounded-sm border border-[#8b5a2b]/50 bg-[#3a2012]/80 px-2 py-0.5 text-[10px] text-[#e8c07e] shadow-inner">
            👥 {m.minPlayers === m.maxPlayers ? `${m.minPlayers} người` : `${m.minPlayers}–${m.maxPlayers} người`}
          </span>
          <span className="rounded-sm border border-[#8b5a2b]/50 bg-[#3a2012]/80 px-2 py-0.5 text-[10px] text-[#e8c07e] shadow-inner">
            ⏱ {m.duration}
          </span>
          <span className="rounded-sm border border-[#8b5a2b]/50 bg-[#3a2012]/80 px-2 py-0.5 text-[10px] text-[#e8c07e] shadow-inner">
            <StarRating count={m.difficultyStars} /> <span className="text-[#b47a3c]/80">{m.difficulty}</span>
          </span>
        </div>

        {m.category.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {m.category.map((c) => (
              <span key={c} className="rounded-sm border border-[#8b5a2b]/40 bg-[#2a1608]/70 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-[#b47a3c]/80">
                {c}
              </span>
            ))}
          </div>
        )}

        {/* Nút hành động — xếp chồng trên mobile, cạnh nhau trên desktop rộng hơn */}
        <div className="mt-auto pt-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={onViewDetails}
            disabled={disabled}
            className="w-full rounded-sm border border-[#6b4725]/60 bg-[#22140c]/90 hover:border-[#b47a3c]/80 hover:bg-[#2c1a10] px-3 py-2.5 text-xs font-semibold text-[#bba182] hover:text-[#f3d4a2] transition-colors shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]"
          >
            📖 XEM HƯỚNG DẪN
          </button>
          <button
            type="button"
            onClick={onPlayNow}
            disabled={disabled}
            className="w-full rounded-sm font-bold text-sm text-[#271206] bg-gradient-to-b from-[#fce295] via-[#df9031] to-[#87460e] px-3 py-2.5 border-t border-[#fff4d1] border-b-4 border-[#4d2506] shadow-[0_4px_12px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.3)] hover:brightness-110 active:translate-y-1 active:border-b-0 active:shadow-[0_1px_4px_rgba(0,0,0,0.8)] transition-all duration-150"
          >
            CHƠI NGAY
          </button>
        </div>
      </div>
    </div>
  );
}
