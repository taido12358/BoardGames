import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getGameTitle } from "../platform/gameRegistry";
import { formatTimestamp as formatTime } from "../platform/formatTimestamp";

interface GameRecord {
  id: string;
  gameKey: string;
  status: string;
  winner: string | null;
  moveCount: number;
  players: string;
  createdAt: string;
  finishedAt: string | null;
}

/**
 * Lịch sử ván đấu — tìm kiếm full-text qua OpenSearch (`GET /api/games/search?q=`), đã có sẵn ở
 * backend từ đầu (`GamesController.Search`/`OpenSearchService.SearchGamesAsync`, index theo
 * người thắng/tên người chơi/trạng thái) nhưng CHƯA từng có giao diện dùng tới — trang này lấp
 * đúng khoảng trống đó. Bất kỳ ai đã đăng nhập đều xem được (không phải tính năng quản trị),
 * chỉ đọc, không có thao tác thay đổi dữ liệu nào.
 */
export default function GameHistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const setQuery = (value: string) => setSearchParams((previous) => {
    const next = new URLSearchParams(previous);
    if (value) next.set("q", value);
    else next.delete("q");
    return next;
  }, { replace: true });
  const [records, setRecords] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const handle = setTimeout(() => {
      setLoading(true);
      setError("");
      const qs = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
      fetch(`/api/games/search${qs}`, { credentials: "include", signal: controller.signal })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((body: GameRecord[]) => { if (active) setRecords(body); })
        .catch(() => { if (active) setError("Không tải được lịch sử ván đấu."); })
        .finally(() => { if (active) setLoading(false); });
    }, 300); // debounce — tránh gọi API mỗi phím gõ

    return () => { active = false; clearTimeout(handle); controller.abort(); };
  }, [query, attempt]);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5">
      <div className="text-center space-y-2 pt-2">
        <h1 className="text-2xl sm:text-3xl font-black tracking-wide text-[#f5d09d] [text-shadow:0_1px_0_rgba(255,255,255,0.15),0_2px_4px_rgba(0,0,0,0.9)]">📜 LỊCH SỬ VÁN ĐẤU</h1>
        <p className="text-sm text-amber-600/70">Tìm theo tên người chơi, người thắng, hoặc trạng thái ván.</p>
        <div className="flex items-center justify-center gap-2 opacity-30 text-base">
          <span>─────</span><span>✦</span><span>─────</span>
        </div>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Tìm theo tên người chơi, người thắng…"
        aria-label="Tìm kiếm lịch sử ván đấu"
        className="w-full rounded-md border border-amber-900/40 bg-[#120c08] px-4 py-2.5 text-amber-100 placeholder-amber-900/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] outline-none transition-colors focus:border-amber-500/70 focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.6),0_0_10px_rgba(217,119,6,0.15)] text-sm placeholder:text-amber-900/40"
      />

      {error && <div className="rounded-xl p-3 text-center bg-red-900/40 text-red-300 text-sm space-y-3">
        <p role="alert">{error}</p>
        <button onClick={() => setAttempt((value) => value + 1)} className="rounded-lg bg-red-800 px-4 py-2 font-semibold text-white hover:bg-red-700">Thử lại</button>
      </div>}
      {loading && <p role="status" className="text-amber-700/60 text-sm text-center py-4 italic">Đang tải…</p>}

      {!loading && !error && records.length === 0 && (
        <div className="text-amber-700/50 text-sm text-center py-10 space-y-3 italic">
          <p>Không tìm thấy ván đấu nào khớp.</p>
          {query.trim() && <button onClick={() => setQuery("")} className="rounded-lg border border-amber-950/80 bg-[#140e0b]/90 px-4 py-2 text-amber-700/70 hover:border-amber-700/60 hover:text-amber-400 transition-all not-italic">Xóa tìm kiếm</button>}
        </div>
      )}

      {!loading && !error && records.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-amber-900/30">
          <table className="w-full text-sm">
            <thead className="border-b border-amber-900/60 bg-[#120b07] text-[11px] font-western uppercase tracking-widest text-amber-700/80 [text-shadow:0_1px_0_rgba(255,255,255,0.04)]">
              <tr>
                <th className="text-left px-3 py-3">Game</th>
                <th className="text-left px-3 py-3">Người chơi</th>
                <th className="text-left px-3 py-3">Thắng</th>
                <th className="text-left px-3 py-3">Số nước đi</th>
                <th className="text-left px-3 py-3">Kết thúc lúc</th>
                <th className="text-left px-3 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-950/40">
              {records.map((r) => (
                <tr key={r.id} className="group odd:bg-[#140e0a] even:bg-[#18110c] transition-colors duration-150 hover:bg-gradient-to-r hover:from-amber-950/30 hover:via-amber-900/20 hover:to-transparent">
                  <td className="px-3 py-2 font-medium text-amber-200">{getGameTitle(r.gameKey)}</td>
                  <td className="px-3 py-2 text-amber-300/70">{r.players || "—"}</td>
                  <td className="px-3 py-2">
                    {r.winner
                      ? <span className="text-amber-300 font-semibold drop-shadow-[0_0_6px_rgba(245,158,11,0.3)]">{r.winner}</span>
                      : <span className="text-red-600/70">—</span>
                    }
                  </td>
                  <td className="px-3 py-2 text-amber-400/60 font-mono">{r.moveCount}</td>
                  <td className="px-3 py-2 text-amber-700/50 text-xs font-mono">{formatTime(r.finishedAt)}</td>
                  <td className="px-3 py-2">
                    {r.status === "Finished" && (
                      <Link to={`/replay/${r.id}`} state={{ historySearch: searchParams.toString() }} className="text-xs text-amber-400 hover:text-amber-300 whitespace-nowrap">
                        🎬 Xem lại
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
