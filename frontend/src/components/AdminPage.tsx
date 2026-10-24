import { useEffect, useState } from "react";
import { useAdminStore } from "../platform/adminStore";
import { formatTimestamp as formatTime } from "../platform/formatTimestamp";

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  Waiting: { label: "Đang chờ", color: "text-amber-300 bg-amber-900/30" },
  Playing: { label: "Đang chơi", color: "text-amber-300 bg-amber-900/30" },
  Finished: { label: "Đã kết thúc", color: "text-amber-700/70 bg-amber-950/40" },
  Cancelled: { label: "Đã huỷ", color: "text-amber-900/60 bg-[#1a1208]" },
  Abandoned: { label: "Bỏ hoang", color: "text-red-300 bg-red-900/30" },
};

/**
 * Trang quản trị READ-ONLY — tổng quan phòng/ván trên toàn hệ thống. Chỉ hiện với tài khoản
 * nằm trong ADMIN_EMAILS (server tự chặn 403 nếu không phải — trang này chỉ ẩn/hiện UI cho
 * gọn, KHÔNG phải lớp bảo mật). Không có nút huỷ/xoá phòng — xem lý do trong AdminController.cs.
 */
export default function AdminPage() {
  const { isAdmin, accessError, rooms, stats, statsLoading, statsError, loading, error, checkAdmin, fetchRooms, fetchStats } = useAdminStore();
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    checkAdmin();
  }, [checkAdmin]);

  useEffect(() => {
    if (isAdmin) {
      fetchRooms({ status: statusFilter || undefined });
    }
  }, [isAdmin, statusFilter, fetchRooms]);

  useEffect(() => { if (isAdmin) fetchStats(); }, [isAdmin, fetchStats]);

  if (accessError) {
    return <div className="mx-auto max-w-md space-y-3 py-10 text-center">
      <p role="alert" className="text-sm text-red-300">{accessError}</p>
      <button type="button" onClick={checkAdmin} className="rounded-sm bg-amber-800 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-700">Kiểm tra lại quyền</button>
    </div>;
  }
  if (isAdmin === null) {
    return <p className="text-amber-700/60 text-sm text-center py-10 italic">Đang kiểm tra quyền truy cập…</p>;
  }

  if (!isAdmin) {
    return (
      <div className="w-full max-w-md mx-auto rounded-sm border border-amber-900/30 bg-[#1a1208]/40 p-8 text-center space-y-2">
        <div className="text-3xl">🔒</div>
        <p className="text-amber-700/60 font-medium">Bạn không có quyền truy cập trang này.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5">
      <div className="text-center space-y-2 pt-2">
        <h1 className="text-2xl sm:text-3xl font-black tracking-widest uppercase bg-gradient-to-b from-[#fff3db] via-[#f7cb85] to-[#c7883a] bg-clip-text text-transparent drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">🛠 QUẢN TRỊ</h1>
        <p className="text-sm text-amber-600/70">Tổng quan phòng/ván trên toàn hệ thống (chỉ đọc).</p>
        <div className="flex items-center justify-center gap-2 opacity-30 text-base">
          <span>─────</span><span>✦</span><span>─────</span>
        </div>
      </div>

      {statsLoading && <p role="status" className="text-center text-sm text-amber-200/80">Đang cập nhật thống kê…</p>}
      {statsError && !statsLoading && <div className="rounded-sm border border-amber-800/50 bg-amber-950/30 p-3 text-sm text-amber-200">
        <p role="alert">{statsError}</p>
        <button type="button" onClick={fetchStats} className="mt-2 rounded-sm bg-amber-800 px-3 py-2 text-white hover:bg-amber-700">Tải lại thống kê</button>
      </div>}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-sm bg-gradient-to-b from-[#2b2013] to-[#1c150c] border border-amber-900/40 p-3 text-center">
            <div className="text-xl font-bold text-[#fcebd6]">{stats.totalUsers}</div>
            <div className="text-xs text-amber-700/70">Tài khoản</div>
          </div>
          {stats.byStatus.map((s) => (
            <div key={s.status} className="relative overflow-hidden rounded-sm border border-amber-900/40 bg-gradient-to-b from-[#1c130d] to-[#120b07] p-3 text-center shadow-[inset_0_1px_0_rgba(245,158,11,0.15)]">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
              <div className="text-xl font-bold text-[#fcebd6]">{s.count}</div>
              <div className="text-xs text-amber-700/70">{STATUS_LABEL[s.status]?.label ?? s.status}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStatusFilter("")}
          aria-pressed={statusFilter === ""}
          className={`rounded-sm px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider border transition-all duration-150 ${
            statusFilter === "" ? "text-[#241106] bg-gradient-to-b from-[#f3c87f] via-[#d49445] to-[#99581a] border-t border-[#ffebbe] border-b-2 border-[#542a07] shadow-[0_2px_10px_rgba(217,119,6,0.35),0_1px_2px_rgba(0,0,0,0.8)]" : "text-[#bba182] bg-[#22140c]/90 border-[#6b4725]/60 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)] hover:border-[#b47a3c]/80 hover:text-[#f3d4a2] hover:bg-[#2c1a10] active:scale-95"
          }`}
        >
          Tất cả
        </button>
        {Object.entries(STATUS_LABEL).map(([key, { label }]) => (
          <button
            key={key}
            type="button"
            onClick={() => setStatusFilter(key)}
            aria-pressed={statusFilter === key}
            className={`rounded-sm px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider border transition-all duration-150 ${
              statusFilter === key ? "text-[#241106] bg-gradient-to-b from-[#f3c87f] via-[#d49445] to-[#99581a] border-t border-[#ffebbe] border-b-2 border-[#542a07] shadow-[0_2px_10px_rgba(217,119,6,0.35),0_1px_2px_rgba(0,0,0,0.8)]" : "text-[#bba182] bg-[#22140c]/90 border-[#6b4725]/60 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)] hover:border-[#b47a3c]/80 hover:text-[#f3d4a2] hover:bg-[#2c1a10] active:scale-95"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <div className="rounded-sm p-3 text-center bg-red-900/40 text-red-300 text-sm space-y-3"><p role="alert">{error}</p><button onClick={() => fetchRooms({ status: statusFilter || undefined })} className="rounded-sm bg-red-800 px-4 py-2 text-white hover:bg-red-700">Tải lại danh sách</button></div>}
      {loading && <p role="status" className="text-amber-700/60 text-sm text-center py-4 italic">Đang tải…</p>}

      {!loading && rooms.length === 0 && !error && (
        <p className="text-amber-700/50 text-sm text-center py-10 italic">Không có phòng nào khớp bộ lọc.</p>
      )}

      {!loading && !error && rooms.length > 0 && (
        <div className="overflow-x-auto rounded-sm border border-amber-900/30">
          <table className="w-full text-sm">
            <thead className="border-b border-amber-900/60 bg-[#120b07] text-[11px] font-western uppercase tracking-widest text-amber-700/80">
              <tr>
                <th className="text-left px-3 py-3">Game</th>
                <th className="text-left px-3 py-3">Trạng thái</th>
                <th className="text-left px-3 py-3">Người chơi</th>
                <th className="text-left px-3 py-3">Chủ phòng</th>
                <th className="text-left px-3 py-3">Thắng</th>
                <th className="text-left px-3 py-3">Cập nhật</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-950/40">
              {rooms.map((r) => {
                const status = STATUS_LABEL[r.status] ?? { label: r.status, color: "text-amber-700/70 bg-amber-950/40" };
                return (
                  <tr key={r.id} className="group odd:bg-[#140e0a] even:bg-[#18110c] transition-colors duration-150 hover:bg-gradient-to-r hover:from-amber-950/30 hover:via-amber-900/20 hover:to-transparent">
                    <td className="px-3 py-2 font-medium text-amber-200">{r.gameKey}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>{status.label}</span>
                    </td>
                    <td className="px-3 py-2 text-amber-300/70">
                      {r.seats.filter(Boolean).length}/{r.seatCount} — {r.seats.filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-3 py-2 text-amber-400/60">{r.ownerDisplayName}</td>
                    <td className="px-3 py-2 text-amber-400/60">{r.winner ?? "—"}</td>
                    <td className="px-3 py-2 text-amber-700/50 text-xs font-mono">{formatTime(r.updatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
