import { useEffect, useState } from "react";
import type { BangPublicPlayer } from "../types";

interface Props {
  roomId: string;
  players: BangPublicPlayer[];
}

/**
 * Debug panel BANG! (van-de.md §51) — chỉ hiện khi backend xác nhận đã bật (dev-only, xem
 * BangDebugController.cs). Gọi thẳng REST /api/debug/bang/*, không qua SignalR — board tự cập
 * nhật qua GameStateUpdated bình thường sau khi backend broadcast, không cần tự refetch ở đây.
 */
export default function BangDebugPanel({ roomId, players }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(players[0]?.id ?? "");
  const [rawState, setRawState] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/debug/bang/enabled", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { enabled: false }))
      .then((body: { enabled: boolean }) => setEnabled(body.enabled))
      .catch(() => setEnabled(false));
  }, []);

  if (!enabled) return null;

  const call = async (path: string, body?: unknown) => {
    setBusy(true);
    try {
      await fetch(`/api/debug/bang/${roomId}/${path}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const inspectState = async () => {
    const res = await fetch(`/api/debug/bang/${roomId}/state`, { credentials: "include" });
    setRawState(res.ok ? JSON.stringify(await res.json(), null, 2) : `Lỗi ${res.status}`);
  };

  return (
    <div className="rounded-xl border border-dashed border-red-500/50 bg-red-950/20 text-xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-3 py-1.5 text-left text-red-300 font-semibold"
      >
        🐞 DEBUG PANEL {open ? "▲" : "▼"}
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full rounded bg-slate-800 text-slate-200 px-2 py-1"
          >
            {players.map((p) => (
              <option key={p.id} value={p.id}>{p.id} — {p.name}</option>
            ))}
          </select>
          <div className="flex flex-wrap gap-1.5">
            <button disabled={busy} onClick={() => call("force-draw", { playerId: selectedId, count: 1 })}
              className="rounded bg-slate-700 hover:bg-slate-600 px-2 py-1 disabled:opacity-40">+1 lá</button>
            <button disabled={busy} onClick={() => call("force-draw", { playerId: selectedId, count: 3 })}
              className="rounded bg-slate-700 hover:bg-slate-600 px-2 py-1 disabled:opacity-40">+3 lá</button>
            <button disabled={busy} onClick={() => call("force-damage", { playerId: selectedId, amount: 1 })}
              className="rounded bg-slate-700 hover:bg-slate-600 px-2 py-1 disabled:opacity-40">-1 HP</button>
            <button disabled={busy} onClick={() => call("force-damage", { playerId: selectedId, amount: 99 })}
              className="rounded bg-slate-700 hover:bg-slate-600 px-2 py-1 disabled:opacity-40">Loại ngay</button>
            <button disabled={busy} onClick={() => call("force-end-turn")}
              className="rounded bg-slate-700 hover:bg-slate-600 px-2 py-1 disabled:opacity-40">Ép kết thúc lượt</button>
            <button disabled={busy} onClick={inspectState}
              className="rounded bg-slate-700 hover:bg-slate-600 px-2 py-1 disabled:opacity-40">Xem state đầy đủ</button>
          </div>
          {rawState && (
            <pre className="max-h-48 overflow-auto rounded bg-slate-900 p-2 text-[10px] text-slate-300 whitespace-pre-wrap">{rawState}</pre>
          )}
        </div>
      )}
    </div>
  );
}
