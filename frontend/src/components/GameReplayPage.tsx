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

function moveSummary(move: unknown): string {
  if (!move || typeof move !== "object") return "Nước đi đã ghi nhận";
  const data = move as Record<string, unknown>;
  const type = typeof data.type === "string" ? data.type.replace(/_/g, "").toLowerCase() : "";
  switch (type) {
    case "playcard": return "Đánh bài";
    case "endturn": return "Kết thúc lượt";
    case "respond": return data.cardId ? "Dùng bài để phản hồi" : "Không dùng bài phản hồi";
    default: return "Nước đi đã ghi nhận";
  }
}

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
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setState("loading");
    setReplay(null);
    fetch(`/api/games/${roomId}/replay`, { credentials: "include", signal: controller.signal })
      .then(async (res) => {
        if (!active) return;
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
        if (!active) return;
        setReplay(body);
        setState("ok");
      })
      .catch(() => { if (active) setState("error"); });
    return () => { active = false; controller.abort(); };
  }, [roomId, attempt]);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-black tracking-wide text-amber-100">🎬 XEM LẠI VÁN ĐẤU</h1>
        <Link to="/history" className="text-sm text-amber-400/70 hover:text-amber-300 transition-colors">
          ← Lịch sử
        </Link>
      </div>

      {state === "loading" && <p role="status" className="text-slate-400 text-sm text-center py-10">Đang tải…</p>}

      {state === "not-found" && (
        <p className="text-slate-500 text-sm text-center py-10">Chưa có bản ghi lại cho ván này (ván chưa kết thúc hoặc không tồn tại).</p>
      )}

      {state === "unavailable" && (
        <div role="alert" className="rounded-xl p-2.5 text-center bg-red-900/40 text-red-300 text-sm">
          Không tải được replay lúc này. Thử lại sau.
        </div>
      )}

      {state === "error" && (
        <div role="alert" className="rounded-xl p-2.5 text-center bg-red-900/40 text-red-300 text-sm">Không tải được replay.</div>
      )}
      {(state === "error" || state === "unavailable") && <button onClick={() => setAttempt((value) => value + 1)} className="rounded-xl bg-amber-700 px-4 py-3 font-semibold text-white hover:bg-amber-600">Tải lại bản ghi</button>}

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
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-slate-200"><span className="text-amber-300">{/^P\d+$/.test(m.side) ? replay.seats[Number(m.side.slice(1))] ?? m.side : m.side}</span> · {moveSummary(m.move)}</p>
                      <details className="text-xs text-slate-400"><summary className="cursor-pointer py-1 hover:text-slate-200">Chi tiết nước đi</summary><code className="block break-all pt-1">{JSON.stringify(m.move)}</code></details>
                    </div>
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
