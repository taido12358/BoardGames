import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

interface MoveEntry {
  moveNumber: number;
  side: string;
  move: unknown;
}

interface Replay {
  id: string;
  gameKey: string;
  winner: string | null;
  seats: (string | null)[];
  moves: MoveEntry[];
}

type LoadState = "loading" | "ok" | "not-found" | "unavailable" | "error";

/**
 * Xem lại diễn biến 1 ván đã kết thúc — `GET /api/games/:roomId/replay` đọc artifact đã lưu ở
 * MinIO lúc ván kết thúc (xem `GameHub.FinishGame`) nhưng CHƯA từng có giao diện gọi tới trước
 * 2026-09-11 (`MinioStorageService` trước đó chỉ ghi, không có cách đọc lại). Chỉ hiện tóm tắt +
 * danh sách nước đi theo thứ tự — KHÔNG dựng lại bàn cờ từng bước (cần engine hỗ trợ tái tạo state
 * ban đầu từ 1 map cố định, hiện chưa có, để dành làm sau nếu cần).
 */
export default function GameReplayPage() {
  const { roomId = "" } = useParams();
  const [state, setState] = useState<LoadState>("loading");
  const [replay, setReplay] = useState<Replay | null>(null);

  useEffect(() => {
    setState("loading");
    fetch(`/api/games/${roomId}/replay`, { credentials: "include" })
      .then(async (res) => {
        if (res.status === 404) {
          setState("not-found");
          return;
        }
        if (res.status === 503) {
          setState("unavailable");
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as Replay;
        setReplay(body);
        setState("ok");
      })
      .catch(() => setState("error"));
  }, [roomId]);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-black tracking-wide text-amber-100">🎬 XEM LẠI VÁN ĐẤU</h1>
        <Link to="/history" className="text-sm text-slate-400 hover:text-slate-200">
          ← Lịch sử
        </Link>
      </div>

      {state === "loading" && <p className="text-slate-500 text-sm text-center py-10">Đang tải…</p>}

      {state === "not-found" && (
        <p className="text-slate-500 text-sm text-center py-10">Chưa có bản ghi lại cho ván này (ván chưa kết thúc hoặc không tồn tại).</p>
      )}

      {state === "unavailable" && (
        <div className="rounded-xl p-2.5 text-center bg-red-900/40 text-red-300 text-sm">
          Không tải được replay lúc này. Thử lại sau.
        </div>
      )}

      {state === "error" && (
        <div className="rounded-xl p-2.5 text-center bg-red-900/40 text-red-300 text-sm">Không tải được replay.</div>
      )}

      {state === "ok" && replay && (
        <>
          <div className="rounded-2xl border border-slate-800 bg-slate-800/40 p-4 space-y-1 text-sm">
            <p>
              <span className="text-slate-500">Game:</span> <span className="text-slate-200 font-medium">{replay.gameKey}</span>
            </p>
            <p>
              <span className="text-slate-500">Người chơi:</span>{" "}
              <span className="text-slate-300">{replay.seats.filter(Boolean).join(", ") || "—"}</span>
            </p>
            <p>
              <span className="text-slate-500">Thắng:</span> <span className="text-slate-300">{replay.winner ?? "—"}</span>
            </p>
            <p>
              <span className="text-slate-500">Số nước đi:</span> <span className="text-slate-300">{replay.moves.length}</span>
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 overflow-hidden">
            <div className="bg-slate-800/80 text-slate-400 text-xs uppercase px-3 py-2">Diễn biến</div>
            {replay.moves.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">Ván này chưa có nước đi nào được ghi lại.</p>
            ) : (
              <ul className="divide-y divide-slate-800 max-h-[28rem] overflow-y-auto">
                {replay.moves.map((m) => (
                  <li key={m.moveNumber} className="px-3 py-2 text-sm flex gap-3">
                    <span className="text-slate-500 w-8 shrink-0 text-right">{m.moveNumber + 1}.</span>
                    <span className="text-amber-300 shrink-0">{m.side}</span>
                    <code className="text-slate-400 text-xs break-all">{JSON.stringify(m.move)}</code>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
