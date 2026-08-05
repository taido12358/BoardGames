import type { GameMetadata } from "../platform/gameLibraryTypes";

interface Props {
  metadata: GameMetadata;
  /** Số phòng đang chờ CỦA GAME NÀY — chỉ truyền khi có dữ liệu backend thật, không bịa số liệu. */
  waitingRooms?: number;
  onViewDetails: () => void;
  onPlayNow: () => void;
}

/** Nền "artwork" theo accent — không có ảnh thật, dùng gradient + hoạ tiết CSS để tránh vi phạm bản quyền artwork gốc. */
const ARTWORK_BG: Record<GameMetadata["accent"], string> = {
  western: "bg-[radial-gradient(circle_at_30%_20%,#5c3a1e_0%,#2b1a0d_60%,#160d06_100%)]",
  graph: "bg-[radial-gradient(circle_at_30%_20%,#2a3a6b_0%,#151d3d_60%,#0a0e1f_100%)]",
  default: "bg-[radial-gradient(circle_at_30%_20%,#334155_0%,#1e293b_60%,#0f172a_100%)]",
};

const ACCENT_RING: Record<GameMetadata["accent"], string> = {
  western: "group-hover:ring-amber-500/60 group-hover:shadow-amber-900/40",
  graph: "group-hover:ring-indigo-400/60 group-hover:shadow-indigo-900/40",
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
      className={`group relative flex flex-col rounded-2xl border border-[#3a2c18]/60 bg-[#1a140c]
        shadow-lg transition-all duration-300 ease-out overflow-hidden
        hover:-translate-y-1.5 hover:ring-2 hover:shadow-2xl ${ACCENT_RING[m.accent]}`}
    >
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
            className="w-full rounded-xl bg-amber-700 hover:bg-amber-600 active:bg-amber-800 px-3 py-2.5 text-sm font-bold text-white transition-colors shadow-md"
          >
            CHƠI NGAY
          </button>
        </div>
      </div>
    </div>
  );
}
