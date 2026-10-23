import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

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

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("vi-VN");
  } catch {
    return iso;
  }
}

/**
 * Lịch sử ván đấu — tìm kiếm full-text qua OpenSearch (`GET /api/games/search?q=`), đã có sẵn ở
 * backend từ đầu (`GamesController.Search`/`OpenSearchService.SearchGamesAsync`, index theo
 * người thắng/tên người chơi/trạng thái) nhưng CHƯA từng có giao diện dùng tới — trang này lấp
 * đúng khoảng trống đó. Bất kỳ ai đã đăng nhập đều xem được (không phải tính năng quản trị),
 * chỉ đọc, không có thao tác thay đổi dữ liệu nào.
 */
export default function GameHistoryPage() {
  const [query, setQuery] = useState("");
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
        <h1 className="text-2xl sm:text-3xl font-black tracking-wide text-amber-100 [text-shadow:0_1px_0_rgba(255,255,255,0.15),0_2px_4px_rgba(0,0,0,0.9)]">📜 LỊCH SỬ VÁN ĐẤU</h1>
        <p className="text-sm text-slate-400">Tìm theo tên người chơi, người thắng, hoặc trạng thái ván.</p>
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
      {loading && <p role="status" className="text-slate-400 text-sm text-center py-4">Đang tải…</p>}

      {!loading && !error && records.length === 0 && (
        <div className="text-slate-400 text-sm text-center py-10 space-y-3">
          <p>Không tìm thấy ván đấu nào khớp.</p>
          {query.trim() && <button onClick={() => setQuery("")} className="rounded-lg bg-slate-700 px-4 py-2 text-slate-100 hover:bg-slate-600">Xóa tìm kiếm</button>}
        </div>
      )}

      {!loading && !error && records.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-amber-900/30">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-[#2b2013] to-[#1c150c] text-amber-400/70 text-xs uppercase border-b border-amber-900/30">
              <tr>
                <th className="text-left px-3 py-2.5">Game</th>
                <th className="text-left px-3 py-2.5">Người chơi</th>
                <th className="text-left px-3 py-2.5">Thắng</th>
                <th className="text-left px-3 py-2.5">Số nước đi</th>
                <th className="text-left px-3 py-2.5">Kết thúc lúc</th>
                <th className="text-left px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-900/20">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-amber-950/20">
                  <td className="px-3 py-2 font-medium text-slate-200">{r.gameKey}</td>
                  <td className="px-3 py-2 text-slate-300">{r.players || "—"}</td>
                  <td className="px-3 py-2 text-slate-400">{r.winner ?? "—"}</td>
                  <td className="px-3 py-2 text-slate-400">{r.moveCount}</td>
                  <td className="px-3 py-2 text-slate-500 text-xs">{formatTime(r.finishedAt)}</td>
                  <td className="px-3 py-2">
                    {r.status === "Finished" && (
                      <Link to={`/replay/${r.id}`} className="text-xs text-amber-400 hover:text-amber-300 whitespace-nowrap">
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
