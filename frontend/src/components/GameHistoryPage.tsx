import { useEffect, useState } from "react";

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

  useEffect(() => {
    const handle = setTimeout(() => {
      setLoading(true);
      setError("");
      const qs = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
      fetch(`/api/games/search${qs}`, { credentials: "include" })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((body: GameRecord[]) => setRecords(body))
        .catch(() => setError("Không tải được lịch sử ván đấu."))
        .finally(() => setLoading(false));
    }, 300); // debounce — tránh gọi API mỗi phím gõ

    return () => clearTimeout(handle);
  }, [query]);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5">
      <div className="text-center space-y-1 pt-1">
        <h1 className="text-2xl sm:text-3xl font-black tracking-wide text-amber-100">📜 LỊCH SỬ VÁN ĐẤU</h1>
        <p className="text-sm text-slate-400">Tìm theo tên người chơi, người thắng, hoặc trạng thái ván.</p>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Tìm theo tên người chơi, người thắng…"
        aria-label="Tìm kiếm lịch sử ván đấu"
        className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500 placeholder:text-slate-500"
      />

      {error && <div className="rounded-xl p-2.5 text-center bg-red-900/40 text-red-300 text-sm">{error}</div>}
      {loading && <p className="text-slate-500 text-sm text-center py-4">Đang tải…</p>}

      {!loading && !error && records.length === 0 && (
        <p className="text-slate-500 text-sm text-center py-10">Không tìm thấy ván đấu nào khớp.</p>
      )}

      {!loading && records.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/80 text-slate-400 text-xs uppercase">
              <tr>
                <th className="text-left px-3 py-2">Game</th>
                <th className="text-left px-3 py-2">Người chơi</th>
                <th className="text-left px-3 py-2">Thắng</th>
                <th className="text-left px-3 py-2">Số nước đi</th>
                <th className="text-left px-3 py-2">Kết thúc lúc</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-slate-800/40">
                  <td className="px-3 py-2 font-medium text-slate-200">{r.gameKey}</td>
                  <td className="px-3 py-2 text-slate-300">{r.players || "—"}</td>
                  <td className="px-3 py-2 text-slate-400">{r.winner ?? "—"}</td>
                  <td className="px-3 py-2 text-slate-400">{r.moveCount}</td>
                  <td className="px-3 py-2 text-slate-500 text-xs">{formatTime(r.finishedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
