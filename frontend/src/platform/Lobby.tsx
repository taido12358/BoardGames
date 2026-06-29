import { useEffect, useState } from "react";
import { useGameStore } from "./gameStore";

interface Props {
  onJoin: (roomId: string) => void;
}

/** Sảnh chờ GENERIC: chọn game, đặt tên, tạo/vào phòng. */
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
    // options tuỳ game; hiện chỉ Vây Bắt dùng maxRedTurns.
    const options = gameKey === "vaybat" ? { maxRedTurns: maxTurns } : {};
    const room = await createRoom(gameKey, options);
    if (room) onJoin(room.id);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <h2 className="text-lg font-semibold">🎲 Sảnh chờ</h2>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-slate-400 text-sm">Tên người chơi</label>
            <input
              className="w-full mt-1 rounded-lg bg-slate-700 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-slate-400 text-sm">Game</label>
            <select
              className="w-full mt-1 rounded-lg bg-slate-700 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              value={gameKey}
              onChange={(e) => setGameKey(e.target.value)}
            >
              {engines.length === 0 && <option value="vaybat">Vây Bắt Trên Đồ Thị</option>}
              {engines.map((e) => (
                <option key={e.key} value={e.key}>{e.displayName}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-end gap-3">
          {gameKey === "vaybat" && (
            <div className="flex-1">
              <label className="text-slate-400 text-sm">Giới hạn lượt Đỏ (X)</label>
              <input
                type="number"
                min={1}
                className="w-full mt-1 rounded-lg bg-slate-700 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                value={maxTurns}
                onChange={(e) => setMaxTurns(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
          )}
          <button
            onClick={handleCreate}
            className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 font-medium"
          >
            ➕ Tạo phòng
          </button>
        </div>
      </div>

      <div className="bg-slate-800 rounded-2xl p-6 shadow-lg">
        <h3 className="text-sm text-slate-400 mb-3">Phòng đang mở</h3>
        {rooms.length === 0 && <p className="text-slate-500 text-sm">Chưa có phòng nào…</p>}
        <ul className="space-y-2">
          {rooms.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between bg-slate-700/50 rounded-lg px-3 py-2"
            >
              <div className="text-sm">
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-600/40 mr-1">{r.gameKey}</span>
                <span className="font-mono text-xs text-slate-400">{r.id.slice(0, 8)}</span>{" "}
                · 🔴 {r.redPlayer ?? "—"} vs ⚪ {r.whitePlayer ?? "—"}{" "}
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-600">{r.status}</span>
              </div>
              <button
                onClick={() => onJoin(r.id)}
                className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1 text-sm font-medium"
              >
                Vào
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
