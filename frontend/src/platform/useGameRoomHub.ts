import { useEffect, useRef } from "react";
import { HubConnection, HubConnectionBuilder } from "@microsoft/signalr";
import { useGameStore } from "./gameStore";
import type { RoomDto, RoomSummaryDto } from "./types";

/**
 * Kết nối SignalR tới GameHub (GENERIC cho mọi game). makeMove gửi payload
 * dạng JSON tuỳ game; server validate bằng đúng engine rồi broadcast lại.
 */
export function useGameRoomHub() {
  const connRef = useRef<HubConnection | null>(null);

  useEffect(() => {
    const conn = new HubConnectionBuilder()
      .withUrl("/hubs/game")
      // Danh sách delay tường minh thay vì mặc định — dễ kiểm soát/log khi debug reconnect.
      .withAutomaticReconnect([0, 2000, 5000, 10000, 10000])
      .build();

    conn.on("GameStateUpdated", (room: RoomDto) => useGameStore.getState().setRoom(room));
    conn.on("Seated", (info: { side: string | null }) => useGameStore.getState().setMySide(info.side));
    conn.on("Error", (msg: string) => useGameStore.getState().setError(msg));
    conn.on("LobbyUpdated", (room: RoomSummaryDto) => useGameStore.getState().upsertRoom(room));

    conn.onreconnecting(() => useGameStore.getState().setConnectionState("reconnecting"));

    // Sau khi SignalR tự nối lại, ConnectionId đổi → server không còn biết ta đang ở phòng/sảnh
    // nào (map connectionId→user chỉ được set lúc JoinRoom/SubscribeLobby) — phải gọi lại đúng
    // method đó, đọc state MỚI NHẤT (không dùng closure cũ chụp lúc mount) để không bỏ sót
    // trường hợp người dùng đã chuyển phòng ngay trước khi mất kết nối.
    conn.onreconnected(async () => {
      useGameStore.getState().setConnectionState("connected");
      try {
        const roomId = useGameStore.getState().room?.id;
        if (roomId) {
          await conn.invoke("JoinRoom", roomId);
        } else {
          await conn.invoke("SubscribeLobby");
        }
      } catch (err) {
        console.error("Không re-đăng ký được sau khi reconnect:", err);
      }
    });

    conn.onclose(() => useGameStore.getState().setConnectionState("disconnected"));

    // Đăng nhập hết hạn giữa chừng → hub từ chối connection (Hub yêu cầu [Authorize]) —
    // phải báo lên UI, không chỉ console, để người dùng biết cần đăng nhập lại.
    conn.start().catch((err) => {
      console.error("SignalR error:", err);
      useGameStore.getState().setError("Không kết nối được máy chủ trò chơi — thử tải lại trang hoặc đăng nhập lại.");
    });
    connRef.current = conn;

    return () => {
      conn.stop();
      connRef.current = null;
    };
  }, []);

  // Lỗi invoke phải hiện lên UI — nếu chỉ console.error, người chơi thấy
  // "không đi được quân" mà không biết vì sao (vd. mất kết nối SignalR).
  const surface = (err: unknown) => {
    console.error(err);
    useGameStore.getState().setError(err instanceof Error ? `Mất kết nối tới server: ${err.message}` : "Mất kết nối tới server");
  };

  // Danh tính lấy từ cookie JWT ở server (Context.User trong GameHub) — không còn gửi
  // playerName từ client nữa (bài học bảo mật 2026-08-05: xem rules/history/decisions.md).
  const joinRoom = (roomId: string) => {
    return connRef.current?.invoke("JoinRoom", roomId).catch(surface);
  };

  /** move: payload tuỳ game (vd. Vây Bắt = { pieceId, to }). */
  const makeMove = (roomId: string, move: unknown) => {
    connRef.current?.invoke("MakeMove", roomId, JSON.stringify(move)).catch(surface);
  };

  const leaveRoom = (roomId: string) => {
    connRef.current?.invoke("LeaveRoom", roomId).catch(console.error);
  };

  const subscribeLobby = () => {
    return connRef.current?.invoke("SubscribeLobby").catch(console.error);
  };

  const unsubscribeLobby = () => {
    return connRef.current?.invoke("UnsubscribeLobby").catch(console.error);
  };

  return { joinRoom, makeMove, leaveRoom, subscribeLobby, unsubscribeLobby };
}
