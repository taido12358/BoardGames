import { useEffect } from "react";
import { useGameRoomHubActions } from "./GameRoomHubContext";

/**
 * Đăng ký nhận cập nhật realtime của sảnh (group SignalR "lobby") thay cho polling.
 * Việc cập nhật `gameStore.roomsById` khi có sự kiện "LobbyUpdated" đã được xử lý ngay
 * trong useGameRoomHub (nơi duy nhất giữ kết nối/đăng ký event) — hook này chỉ lo vòng
 * đời subscribe/unsubscribe group, dùng ở bất kỳ trang nào cần danh sách phòng realtime
 * (GameLibrary, GameDetails).
 */
export function useLobbyHub() {
  const { subscribeLobby, unsubscribeLobby } = useGameRoomHubActions();

  useEffect(() => {
    subscribeLobby();
    return () => {
      unsubscribeLobby();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
