import { useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useGameStore } from "../platform/gameStore";
import { useLobbyHub } from "../platform/useLobbyHub";
import { getGameMetadata } from "../platform/gameRegistry";
import type { GameMetadata } from "../platform/gameLibraryTypes";
import GameCard from "./GameCard";
import LobbyLoadStatus from "../platform/LobbyLoadStatus";

interface FilterChip {
  id: string;
  label: string;
}

function normalizeSearch(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d").trim();
}

function playerCountLabel(m: GameMetadata): string {
  return m.minPlayers === m.maxPlayers ? `${m.minPlayers} người` : `${m.minPlayers}–${m.maxPlayers} người`;
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-amber-900/30 bg-[#1a140c] overflow-hidden animate-pulse">
      <div className="h-40 sm:h-48 bg-amber-950/30" />
      <div className="p-4 space-y-2">
        <div className="h-4 w-2/3 bg-amber-950/40 rounded" />
        <div className="h-3 w-1/2 bg-amber-950/30 rounded" />
        <div className="h-3 w-full bg-amber-950/20 rounded" />
        <div className="h-8 w-full bg-amber-950/30 rounded-xl mt-3" />
        <div className="h-9 w-full bg-amber-950/40 rounded-xl" />
      </div>
    </div>
  );
}

export default function GameLibrary() {
  const navigate = useNavigate();
  const { engines, enginesLoading, enginesError, rooms, roomsLoading, roomsError, fetchEngines, fetchRooms } = useGameStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("q") ?? "";
  const filter = searchParams.get("filter") ?? "all";
  function updateSearch(key: string, value: string) {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      if (!value || (key === "filter" && value === "all")) next.delete(key);
      else next.set(key, value);
      return next;
    }, { replace: true });
  }
  const setSearch = (value: string) => updateSearch("q", value);
  const setFilter = (value: string) => updateSearch("filter", value);

  useLobbyHub();

  useEffect(() => {
    fetchEngines();
    // Chỉ paint lần đầu — cập nhật realtime sau đó qua useLobbyHub (group SignalR "lobby"), không polling.
    fetchRooms();
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
    const terms = normalizeSearch(search).split(/\s+/).filter(Boolean);
    return allMetadata.filter((m) => {
      if (terms.length > 0) {
        const haystack = normalizeSearch(`${m.title} ${m.subtitle} ${m.description} ${m.category.join(" ")}`);
        if (!terms.every((term) => haystack.includes(term))) return false;
      }
      if (filter === "all") return true;
      if (filter === "waiting") return (waitingCountByGame[m.gameKey] ?? 0) > 0;
      if (filter.startsWith("players:")) return playerCountLabel(m) === filter.slice("players:".length);
      if (filter.startsWith("cat:")) return m.category.includes(filter.slice("cat:".length));
      return true;
    });
  }, [allMetadata, search, filter, waitingCountByGame]);

  const clearFilters = () => setSearchParams((previous) => {
    const next = new URLSearchParams(previous);
    next.delete("q");
    next.delete("filter");
    return next;
  }, { replace: true });

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="text-center space-y-2 pt-2">
        <h1 className="text-2xl sm:text-3xl font-black tracking-wide text-amber-100 [text-shadow:0_1px_0_rgba(255,255,255,0.15),0_2px_4px_rgba(0,0,0,0.9)]">🎲 THƯ VIỆN TRÒ CHƠI</h1>
        <p className="text-sm text-amber-700/60">Chọn một trò chơi và bắt đầu cuộc phiêu lưu.</p>
        <div className="flex items-center justify-center gap-2 opacity-30 text-base">
          <span>─────</span><span>✦</span><span>─────</span>
        </div>
      </div>

      {/* Saloon divider */}
      <div className="relative flex items-center justify-center">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-600/40 to-transparent" />
        <div className="absolute flex items-center justify-center bg-[#0d0a07] px-3">
          <span className="h-2 w-2 rotate-45 border border-amber-500/60 bg-amber-900/60 shadow-[0_0_6px_rgba(245,158,11,0.3)]" />
        </div>
      </div>

      {/* Tìm kiếm & bộ lọc */}
      <div className="space-y-3">
        <div className="relative">
          <svg className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-700/50" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm trò chơi..."
            aria-label="Tìm kiếm trò chơi"
            className="w-full rounded-md border border-amber-900/40 bg-[#120c08] pl-10 pr-4 py-2.5 text-amber-100 placeholder-amber-900/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] outline-none transition-colors focus:border-amber-500/70 focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.6),0_0_10px_rgba(217,119,6,0.15)] text-sm placeholder:text-amber-900/40"
          />
        </div>
        {search && <button type="button" onClick={() => setSearch("")} className="rounded-lg border border-amber-950/80 bg-[#140e0b]/90 px-3 py-2 text-xs text-amber-700/70 hover:border-amber-700/60 hover:bg-[#1a120d] hover:text-amber-400">Xóa từ khóa</button>}
        <div className="flex flex-wrap gap-2">
          {filterChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setFilter(chip.id)}
              aria-pressed={filter === chip.id}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors ${
                filter === chip.id
                  ? "bg-gradient-to-b from-amber-600 to-amber-800 border-amber-500/60 text-amber-50 shadow-[0_2px_0_0_#451a03]"
                  : "rounded-md border border-amber-950/80 bg-[#140e0b]/90 text-amber-700/80 shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)] hover:border-amber-700/60 hover:bg-[#1a120d] hover:text-amber-400 hover:shadow-[0_2px_8px_rgba(0,0,0,0.5)] active:scale-95 uppercase tracking-wider"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Trạng thái lỗi */}
      <LobbyLoadStatus loading={roomsLoading} error={roomsError} onRetry={() => fetchRooms()} />
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
      {!enginesLoading && !enginesError && filtered.length === 0 && (filter !== "waiting" || (!roomsLoading && !roomsError)) && (
        <div className="rounded-2xl border border-amber-900/30 bg-[#1a1208]/40 p-10 text-center space-y-3">
          <div className="text-3xl">🔍</div>
          <p className="text-amber-300/70 font-medium">Không tìm thấy trò chơi</p>
          <p className="text-amber-700/50 text-sm italic">Thử thay đổi từ khóa hoặc bộ lọc.</p>
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-xl border border-amber-950/80 bg-[#140e0b]/90 hover:border-amber-700/60 hover:bg-[#1a120d] px-4 py-2 text-sm font-medium text-amber-700/70 hover:text-amber-400 transition-colors"
          >
            XÓA BỘ LỌC
          </button>
        </div>
      )}

      {/* Lưới thẻ game */}
      {!enginesLoading && !enginesError && filtered.length > 0 && (
        <div role="status" className="flex items-center gap-3 py-1 text-xs uppercase tracking-widest text-amber-600/70">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-900/40 to-amber-900/20" />
          <div className="flex items-center gap-1.5">
            <span>Tìm thấy{" "}</span>
            <span className="rounded border border-amber-800/40 bg-amber-950/60 px-1.5 py-0.5 font-mono text-xs font-bold text-amber-300 shadow-[inset_0_1px_2px_rgba(0,0,0,0.7)]">{filtered.length}</span>
            {" "}<span>trò chơi</span>
          </div>
          <span className="h-px flex-1 bg-gradient-to-l from-transparent via-amber-900/40 to-amber-900/20" />
        </div>
      )}
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
