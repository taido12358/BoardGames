import { useEffect, useState } from "react";
import { useGameStore } from "./gameStore";

interface Props {
  onJoin: (roomId: string) => void;
}

export default function Lobby({ onJoin }: Props) {
  const { playerName, setPlayerName, engines, rooms, fetchEngines, fetchRooms, createRoom } =
    useGameStore();
  const [gameKey, setGameKey] = useState("vaybat");
  const [maxTurns, setMaxTurns] = useState(15);

  useEffect(() => {
    fetchEngines();
    fetchRooms();
    const t = setInterval(() => fetchRooms(), 2500);
    return () => clearInterval(t);
  }, [fetchEngines, fetchRooms]);

  const handleCreate = async () => {
    const options = gameKey === "vaybat" ? { maxRedTurns: maxTurns } : {};
    const room = await createRoom(gameKey, options);
    if (room) onJoin(room.id);
  };

  return (
    <div className="space-y-4">

      {/* Form tạo phòng */}
      <div className="bg-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
        <h2 className="text-base font-semibold">🎲 Sảnh chờ</h2>

        <div>
          <label className="text-slate-400 text-xs uppercase tracking-wide">Tên người chơi</label>
          <input
            className="w-full mt-1 rounded-xl bg-slate-700 px-3 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />
        </div>

        <div>
          <label className="text-slate-400 text-xs uppercase tracking-wide">Game</label>
          <select
            className="w-full mt-1 rounded-xl bg-slate-700 px-3 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            value={gameKey}
            onChange={(e) => setGameKey(e.target.value)}
          >
            {engines.length === 0 && <option value="vaybat">Vây Bắt Trên Đồ Thị</option>}
            {engines.map((e) => (
              <option key={e.key} value={e.key}>{e.displayName}</option>
            ))}
          </select>
        </div>

        {gameKey === "vaybat" && (
          <div>
            <label className="text-slate-400 text-xs uppercase tracking-wide">
              Giới hạn lượt Đỏ
            </label>
            <input
              type="number" min={1}
              className="w-full mt-1 rounded-xl bg-slate-700 px-3 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              value={maxTurns}
              onChange={(e) => setMaxTurns(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>
        )}

        <button
          onClick={handleCreate}
          className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 px-4 py-3 font-semibold text-sm transition-colors"
        >
          ➕ Tạo phòng mới
        </button>
      </div>

      {/* Danh sách phòng */}
      <div className="bg-slate-800 rounded-2xl p-4 shadow-lg">
        <h3 className="text-xs text-slate-400 uppercase tracking-wide mb-3">
          Phòng đang mở {rooms.length > 0 && <span className="ml-1 text-slate-300">({rooms.length})</span>}
        </h3>
        {rooms.length === 0 && (
          <p className="text-slate-500 text-sm text-center py-4">Chưa có phòng nào…</p>
        )}
        <ul className="space-y-2">
          {rooms.map((r) => (
            <li key={r.id} className="bg-slate-700/60 rounded-xl p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-600/50 text-indigo-300">
                      {r.gameKey}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      r.status === "Waiting" ? "bg-amber-700/50 text-amber-300" : "bg-emerald-800/50 text-emerald-300"
                    }`}>
                      {r.status === "Waiting" ? "Chờ" : "Đang chơi"}
                    </span>
                  </div>
                  <div className="text-sm mt-1 text-slate-300 truncate">
                    🔴 {r.redPlayer ?? "—"} vs ⚪ {r.whitePlayer ?? "—"}
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">{r.id.slice(0, 12)}…</div>
                </div>
                <button
                  onClick={() => onJoin(r.id)}
                  className="shrink-0 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 px-4 py-2.5 text-sm font-semibold transition-colors"
                >
                  Vào
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
