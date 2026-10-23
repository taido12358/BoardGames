import type { GameMetadata } from "../platform/gameLibraryTypes";
import { ARTWORK_BG } from "../platform/artworkTheme";

interface Props {
  metadata: GameMetadata;
  /** Số phòng đang chờ CỦA GAME NÀY — chỉ truyền khi có dữ liệu backend thật, không bịa số liệu. */
  waitingRooms?: number;
  onViewDetails: () => void;
  onPlayNow: () => void;
}

const ACCENT_RING: Record<GameMetadata["accent"], string> = {
  western: "group-hover:ring-amber-500/60 group-hover:shadow-amber-900/40",
  graph: "group-hover:ring-indigo-400/60 group-hover:shadow-indigo-900/40",
  folk: "group-hover:ring-lime-500/60 group-hover:shadow-lime-900/40",
  zodiac: "group-hover:ring-purple-500/60 group-hover:shadow-purple-900/40",
  default: "group-hover:ring-slate-400/50 group-hover:shadow-slate-900/40",
};

function StarRating({ count }: { count: number }) {
  if (count <= 0) return <span className="text-slate-500 text-xs">Chưa đánh giá</span>;
  return (
    <span className="text-amber-400 text-sm tracking-tight" aria-label={`Độ khó ${count} trên 5 sao`}>
      {"★".repeat(count)}
      <span className="text-slate-600">{"★".repeat(5 - count)}</span>
    </span>
  );
}

export default function GameCard({ metadata: m, waitingRooms, onViewDetails, onPlayNow }: Props) {
  return (
    <div
      role="group"
      aria-label={m.title}
      className={`group relative flex flex-col rounded-2xl border border-[#3a2c18]/80 bg-gradient-to-b from-[#1e1810] to-[#141009]
        shadow-lg transition-all duration-300 ease-out overflow-hidden
        hover:-translate-y-2 hover:rotate-1 hover:scale-[1.01] hover:ring-2 hover:shadow-2xl ${ACCENT_RING[m.accent]}`}
    >
      {/* Weathered edge highlight — ánh sáng đèn dầu hắt vào mép */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/30 to-transparent z-10" />
      {/* Card glare — ánh đèn chùm hắt vào góc trên-trái */}
      <div className="pointer-events-none absolute -left-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br from-amber-400/20 via-amber-500/5 to-transparent blur-xl z-10" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-amber-200/[0.03] to-amber-300/[0.07] z-10" />
      {/* Artwork — chiếm ~50% chiều cao thẻ */}
      <button
        type="button"
        onClick={onViewDetails}
        aria-label={`Xem hướng dẫn ${m.title}`}
        className={`relative h-40 sm:h-48 w-full flex items-center justify-center overflow-hidden ${ARTWORK_BG[m.accent]}`}
      >
        <span
          className="text-7xl sm:text-8xl transition-transform duration-300 ease-out group-hover:scale-110 drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
          aria-hidden="true"
        >
          {m.emblem}
        </span>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
        {waitingRooms !== undefined && waitingRooms > 0 && (
          <span className="absolute top-2 right-2 rounded-full bg-emerald-900/80 border border-emerald-600/50 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
            🟢 {waitingRooms} phòng đang chờ
          </span>
        )}
      </button>

      {/* Nội dung */}
      <div className="flex flex-col gap-2 p-4 flex-1">
        <div>
          <h3 className="text-lg font-black tracking-wide text-amber-100">{m.title}</h3>
          <p className="text-xs text-amber-200/60">{m.subtitle}</p>
        </div>

        <p className="text-sm text-slate-300/90 leading-snug line-clamp-2">{m.description}</p>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300">
          <span>👥 {m.minPlayers === m.maxPlayers ? `${m.minPlayers} người` : `${m.minPlayers}–${m.maxPlayers} người`}</span>
          <span>⏱ {m.duration}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <StarRating count={m.difficultyStars} />
          <span className="text-xs text-slate-400">{m.difficulty}</span>
        </div>

        {m.category.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {m.category.map((c) => (
              <span key={c} className="rounded-full bg-slate-800/80 border border-slate-700 px-2 py-0.5 text-[10px] text-slate-400">
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
            className="w-full rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 px-3 py-2.5 text-xs font-semibold text-slate-200 transition-colors"
          >
            XEM HƯỚNG DẪN
          </button>
          <button
            type="button"
            onClick={onPlayNow}
            className="relative w-full rounded-lg bg-gradient-to-b from-amber-600 via-amber-700 to-amber-800 px-3 py-2.5 text-sm font-bold text-amber-50 border-t border-amber-400/50 shadow-[0_4px_0_0_#451a03,0_8px_16px_rgba(0,0,0,0.5)] transition-all hover:brightness-110 active:top-[2px] active:shadow-[0_2px_0_0_#451a03]"
          >
            CHƠI NGAY
          </button>
        </div>
      </div>
    </div>
  );
}
