import { useGameStore } from "../platform/gameStore";
import { useGameRoomHub } from "../platform/useGameRoomHub";
import Lobby from "../platform/Lobby";
import VayBatBoard from "../games/vaybat/VayBatBoard";

/**
 * Container giữ kết nối SignalR; hiển thị Sảnh chờ hoặc bàn chơi của ĐÚNG game
 * theo room.gameKey. Thêm game mới = thêm 1 nhánh ở đây + 1 board component.
 */
export default function GameView() {
  const { joinRoom, makeMove, leaveRoom } = useGameRoomHub();
  const { room, setRoom, setMySide, setSelected, setError } = useGameStore();

  const handleJoin = (roomId: string) => {
    setError("");
    setSelected(null);
    joinRoom(roomId);
  };

  const handleLeave = () => {
    if (room) leaveRoom(room.id);
    setRoom(null);
    setMySide(null);
    setSelected(null);
    setError("");
  };

  if (!room) return <Lobby onJoin={handleJoin} />;

  switch (room.gameKey) {
    case "vaybat":
      return <VayBatBoard makeMove={makeMove} onLeave={handleLeave} />;
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
