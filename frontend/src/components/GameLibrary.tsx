import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGameStore } from "../platform/gameStore";
import { getGameMetadata } from "../platform/gameRegistry";
import type { GameMetadata } from "../platform/gameLibraryTypes";
import GameCard from "./GameCard";

interface FilterChip {
  id: string;
  label: string;
}

function playerCountLabel(m: GameMetadata): string {
  return m.minPlayers === m.maxPlayers ? `${m.minPlayers} người` : `${m.minPlayers}–${m.maxPlayers} người`;
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#1a140c] overflow-hidden animate-pulse">
      <div className="h-40 sm:h-48 bg-slate-800/60" />
      <div className="p-4 space-y-2">
        <div className="h-4 w-2/3 bg-slate-800 rounded" />
        <div className="h-3 w-1/2 bg-slate-800/70 rounded" />
        <div className="h-3 w-full bg-slate-800/50 rounded" />
        <div className="h-8 w-full bg-slate-800/60 rounded-xl mt-3" />
        <div className="h-9 w-full bg-slate-800/80 rounded-xl" />
      </div>
    </div>
  );
}

export default function GameLibrary() {
  const navigate = useNavigate();
  const { engines, enginesLoading, enginesError, rooms, fetchEngines, fetchRooms } = useGameStore();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchEngines();
    fetchRooms();
    const t = setInterval(() => fetchRooms(), 4000);
    return () => clearInterval(t);
  }, [fetchEngines, fetchRooms]);

  const allMetadata = useMemo(() => engines.map(getGameMetadata), [engines]);

  const waitingCountByGame = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of rooms) {
      if (r.status === "Waiting") counts[r.gameKey] = (counts[r.gameKey] ?? 0) + 1;
    }
    return counts;
  }, [rooms]);

  // Chip tạo TỪ metadata thật (không hard-code danh sách thể loại/số người chơi) — thêm game mới tự động có chip tương ứng.
  const filterChips: FilterChip[] = useMemo(() => {
    const chips: FilterChip[] = [
      { id: "all", label: "Tất cả" },
      { id: "waiting", label: "Đang có người chơi" },
    ];
    const players = new Set<string>();
    const categories = new Set<string>();
    for (const m of allMetadata) {
      players.add(playerCountLabel(m));
      m.category.forEach((c) => categories.add(c));
    }
    [...players].sort().forEach((p) => chips.push({ id: `players:${p}`, label: p }));
    [...categories].sort().forEach((c) => chips.push({ id: `cat:${c}`, label: c }));
    return chips;
  }, [allMetadata]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allMetadata.filter((m) => {
      if (q) {
        const haystack = `${m.title} ${m.subtitle} ${m.description} ${m.category.join(" ")}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (filter === "all") return true;
      if (filter === "waiting") return (waitingCountByGame[m.gameKey] ?? 0) > 0;
      if (filter.startsWith("players:")) return playerCountLabel(m) === filter.slice("players:".length);
      if (filter.startsWith("cat:")) return m.category.includes(filter.slice("cat:".length));
      return true;
    });
  }, [allMetadata, search, filter, waitingCountByGame]);

  const clearFilters = () => { setSearch(""); setFilter("all"); };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="text-center space-y-1 pt-1">
        <h1 className="text-2xl sm:text-3xl font-black tracking-wide text-amber-100">🎲 THƯ VIỆN TRÒ CHƠI</h1>
        <p className="text-sm text-slate-400">Chọn một trò chơi và bắt đầu cuộc phiêu lưu.</p>
      </div>

      {/* Tìm kiếm & bộ lọc */}
      <div className="space-y-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm kiếm trò chơi..."
          aria-label="Tìm kiếm trò chơi"
          className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500 placeholder:text-slate-500"
        />
        <div className="flex flex-wrap gap-2">
          {filterChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setFilter(chip.id)}
              aria-pressed={filter === chip.id}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors ${
                filter === chip.id
                  ? "bg-amber-700 border-amber-600 text-white"
                  : "bg-slate-800/70 border-slate-700 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Trạng thái lỗi */}
      {enginesError && !enginesLoading && (
        <div className="rounded-2xl border border-red-800/50 bg-red-950/30 p-6 text-center space-y-3">
          <p className="text-red-300 text-sm">{enginesError}</p>
          <button
            type="button"
            onClick={() => fetchEngines()}
            className="rounded-xl bg-red-800 hover:bg-red-700 px-4 py-2 text-sm font-semibold text-white"
          >
            THỬ LẠI
          </button>
        </div>
      )}

      {/* Skeleton lúc tải */}
      {enginesLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Trống sau lọc */}
      {!enginesLoading && !enginesError && filtered.length === 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-10 text-center space-y-3">
          <div className="text-3xl">🔍</div>
          <p className="text-slate-300 font-medium">Không tìm thấy trò chơi</p>
          <p className="text-slate-500 text-sm">Thử thay đổi từ khóa hoặc bộ lọc.</p>
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-xl bg-slate-700 hover:bg-slate-600 px-4 py-2 text-sm font-medium"
          >
            XÓA BỘ LỌC
          </button>
        </div>
      )}

      {/* Lưới thẻ game */}
      {!enginesLoading && !enginesError && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m) => (
            <GameCard
              key={m.gameKey}
              metadata={m}
              waitingRooms={waitingCountByGame[m.gameKey]}
              onViewDetails={() => navigate(`/games/${m.gameKey}`)}
              onPlayNow={() => navigate(`/games/${m.gameKey}?play=1`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
