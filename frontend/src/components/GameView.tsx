import { Navigate, Route, Routes } from "react-router-dom";
import { useGameRoomHub } from "../platform/useGameRoomHub";
import { GameRoomHubProvider } from "../platform/GameRoomHubContext";
import GameLibrary from "./GameLibrary";
import GameDetails from "./GameDetails";
import RoomRoute from "./RoomRoute";

/**
 * Container giữ MỘT kết nối SignalR (useGameRoomHub) cho toàn bộ khu vực chơi game.
 *
 * Điều hướng hoàn toàn theo URL (không còn rẽ nhánh theo `gameStore.room` như trước —
 * điều đó khiến F5 giữa ván mất context vì URL không phản ánh đang ở phòng nào):
 * - `/games` — Thư viện trò chơi.
 * - `/games/:gameKey` — chi tiết game + tạo/vào phòng.
 * - `/games/:gameKey/room/:roomId` — đang ở trong một phòng cụ thể (RoomRoute tự
 *   fetch/join phòng theo roomId trên URL, kể cả sau khi F5).
 */
export default function GameView() {
  const hub = useGameRoomHub();

  return (
    <GameRoomHubProvider value={hub}>
      <Routes>
        <Route path="/" element={<Navigate to="/games" replace />} />
        <Route path="/games" element={<GameLibrary />} />
        <Route path="/games/:gameKey" element={<GameDetails />} />
        <Route path="/games/:gameKey/room/:roomId" element={<RoomRoute />} />
        <Route path="*" element={<Navigate to="/games" replace />} />
      </Routes>
    </GameRoomHubProvider>
  );
}
