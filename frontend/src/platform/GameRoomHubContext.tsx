import { createContext, useContext } from "react";

/** Chữ ký khớp với giá trị trả về của useGameRoomHub() — xem useGameRoomHub.ts. */
export interface GameRoomHubActions {
  joinRoom: (roomId: string) => void;
  makeMove: (roomId: string, move: unknown) => void;
  leaveRoom: (roomId: string) => void;
}

// useGameRoomHub() mở MỘT kết nối SignalR (useEffect trong hook) — không được gọi hook
// này ở nhiều nơi cùng lúc (sẽ tạo nhiều connection). GameView gọi nó MỘT LẦN ở gốc cây,
// rồi cấp joinRoom/makeMove/leaveRoom cho các trang con (GameDetails…) qua context này.
const GameRoomHubContext = createContext<GameRoomHubActions | null>(null);

export const GameRoomHubProvider = GameRoomHubContext.Provider;

export function useGameRoomHubActions(): GameRoomHubActions {
  const ctx = useContext(GameRoomHubContext);
  if (!ctx) throw new Error("useGameRoomHubActions phải dùng bên trong <GameRoomHubProvider> (xem GameView.tsx)");
  return ctx;
}
