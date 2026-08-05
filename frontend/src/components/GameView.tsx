import { Navigate, Route, Routes } from "react-router-dom";
import { useGameStore } from "../platform/gameStore";
import { useGameRoomHub } from "../platform/useGameRoomHub";
import { GameRoomHubProvider } from "../platform/GameRoomHubContext";
import VayBatBoard from "../games/vaybat/VayBatBoard";
import BangBoard from "../games/bang/BangBoard";
import GameLibrary from "./GameLibrary";
import GameDetails from "./GameDetails";

/**
 * Container giữ MỘT kết nối SignalR (useGameRoomHub) cho toàn bộ khu vực chơi game.
 *
 * - Có `room` (đã tạo/vào phòng) → hiển thị ĐÚNG bàn chơi theo `room.gameKey`. Thêm
 *   game mới = thêm 1 nhánh case ở đây + 1 board component (không đổi từ trước).
 * - Chưa có `room` → hiển thị Thư viện trò chơi (`/games`) hoặc trang chi tiết một
 *   game (`/games/:gameKey`) qua React Router. Cả hai trang lấy joinRoom từ
 *   GameRoomHubProvider — dùng chung kết nối này, KHÔNG tự mở connection riêng.
 */
export default function GameView() {
  const hub = useGameRoomHub();
  const { room, setRoom, setMySide, setSelected, setError } = useGameStore();

  const handleLeave = () => {
    if (room) hub.leaveRoom(room.id);
    setRoom(null);
    setMySide(null);
    setSelected(null);
    setError("");
  };

  if (room) {
    switch (room.gameKey) {
      case "vaybat":
        return <VayBatBoard makeMove={hub.makeMove} onLeave={handleLeave} />;
      case "bang":
        return <BangBoard makeMove={hub.makeMove} onLeave={handleLeave} />;
      default:
        return (
          <div className="bg-slate-800 rounded-2xl p-6 text-center space-y-4">
            <p>Game "{room.gameKey}" chưa có giao diện.</p>
            <button onClick={handleLeave}
              className="rounded-lg bg-slate-700 hover:bg-slate-600 px-4 py-2 font-medium">
              ← Rời phòng
            </button>
          </div>
        );
    }
  }

  return (
    <GameRoomHubProvider value={hub}>
      <Routes>
        <Route path="/" element={<Navigate to="/games" replace />} />
        <Route path="/games" element={<GameLibrary />} />
        <Route path="/games/:gameKey" element={<GameDetails />} />
        <Route path="*" element={<Navigate to="/games" replace />} />
      </Routes>
    </GameRoomHubProvider>
  );
}
