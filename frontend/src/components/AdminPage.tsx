import { useEffect, useState } from "react";
import { useAdminStore } from "../platform/adminStore";

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  Waiting: { label: "Đang chờ", color: "text-amber-300 bg-amber-900/30" },
  Playing: { label: "Đang chơi", color: "text-emerald-300 bg-emerald-900/30" },
  Finished: { label: "Đã kết thúc", color: "text-slate-300 bg-slate-800" },
  Cancelled: { label: "Đã huỷ", color: "text-slate-400 bg-slate-800/60" },
  Abandoned: { label: "Bỏ hoang", color: "text-red-300 bg-red-900/30" },
};

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("vi-VN");
  } catch {
    return iso;
  }
}

/**
 * Trang quản trị READ-ONLY — tổng quan phòng/ván trên toàn hệ thống. Chỉ hiện với tài khoản
 * nằm trong ADMIN_EMAILS (server tự chặn 403 nếu không phải — trang này chỉ ẩn/hiện UI cho
 * gọn, KHÔNG phải lớp bảo mật). Không có nút huỷ/xoá phòng — xem lý do trong AdminController.cs.
 */
export default function AdminPage() {
  const { isAdmin, rooms, stats, loading, error, checkAdmin, fetchRooms, fetchStats } = useAdminStore();
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    checkAdmin();
  }, [checkAdmin]);

  useEffect(() => {
    if (isAdmin) {
      fetchRooms({ status: statusFilter || undefined });
      fetchStats();
    }
  }, [isAdmin, statusFilter, fetchRooms, fetchStats]);

  if (isAdmin === null) {
    return <p className="text-slate-500 text-sm text-center py-10">Đang kiểm tra quyền truy cập…</p>;
  }

  if (!isAdmin) {
    return (
      <div className="w-full max-w-md mx-auto rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center space-y-2">
        <div className="text-3xl">🔒</div>
        <p className="text-slate-300 font-medium">Bạn không có quyền truy cập trang này.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5">
      <div className="text-center space-y-1 pt-1">
        <h1 className="text-2xl sm:text-3xl font-black tracking-wide text-amber-100">🛠 QUẢN TRỊ</h1>
        <p className="text-sm text-slate-400">Tổng quan phòng/ván trên toàn hệ thống (chỉ đọc).</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl bg-slate-800/60 border border-slate-700 p-3 text-center">
            <div className="text-xl font-bold text-amber-200">{stats.totalUsers}</div>
            <div className="text-xs text-slate-400">Tài khoản</div>
          </div>
          {stats.byStatus.map((s) => (
            <div key={s.status} className="rounded-xl bg-slate-800/60 border border-slate-700 p-3 text-center">
              <div className="text-xl font-bold text-amber-200">{s.count}</div>
              <div className="text-xs text-slate-400">{STATUS_LABEL[s.status]?.label ?? s.status}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStatusFilter("")}
          className={`rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors ${
            statusFilter === "" ? "bg-amber-700 border-amber-600 text-white" : "bg-slate-800/70 border-slate-700 text-slate-300 hover:bg-slate-700"
          }`}
        >
          Tất cả
        </button>
        {Object.entries(STATUS_LABEL).map(([key, { label }]) => (
          <button
            key={key}
            type="button"
            onClick={() => setStatusFilter(key)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors ${
              statusFilter === key ? "bg-amber-700 border-amber-600 text-white" : "bg-slate-800/70 border-slate-700 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <div className="rounded-xl p-2.5 text-center bg-red-900/40 text-red-300 text-sm">{error}</div>}
      {loading && <p className="text-slate-500 text-sm text-center py-4">Đang tải…</p>}

      {!loading && rooms.length === 0 && !error && (
        <p className="text-slate-500 text-sm text-center py-10">Không có phòng nào khớp bộ lọc.</p>
      )}

      {!loading && rooms.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/80 text-slate-400 text-xs uppercase">
              <tr>
                <th className="text-left px-3 py-2">Game</th>
                <th className="text-left px-3 py-2">Trạng thái</th>
                <th className="text-left px-3 py-2">Người chơi</th>
                <th className="text-left px-3 py-2">Chủ phòng</th>
                <th className="text-left px-3 py-2">Thắng</th>
                <th className="text-left px-3 py-2">Cập nhật</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rooms.map((r) => {
                const status = STATUS_LABEL[r.status] ?? { label: r.status, color: "text-slate-300 bg-slate-800" };
                return (
                  <tr key={r.id} className="hover:bg-slate-800/40">
                    <td className="px-3 py-2 font-medium text-slate-200">{r.gameKey}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>{status.label}</span>
                    </td>
                    <td className="px-3 py-2 text-slate-300">
                      {r.seats.filter(Boolean).length}/{r.seatCount} — {r.seats.filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-400">{r.ownerDisplayName}</td>
                    <td className="px-3 py-2 text-slate-400">{r.winner ?? "—"}</td>
                    <td className="px-3 py-2 text-slate-500 text-xs">{formatTime(r.updatedAt)}</td>
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
