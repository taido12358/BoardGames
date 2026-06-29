import { useGameStore } from "../store/gameStore";
import { useGameRoomHub } from "../hooks/useGameRoomHub";
import Lobby from "./Lobby";
import GameBoard from "./GameBoard";

/** Container giữ kết nối SignalR; hiển thị Sảnh chờ hoặc Bàn chơi. */
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

  return room
    ? <GameBoard makeMove={makeMove} onLeave={handleLeave} />
    : <Lobby onJoin={handleJoin} />;
}
