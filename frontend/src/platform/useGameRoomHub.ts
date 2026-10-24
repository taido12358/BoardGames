import { useEffect, useRef } from "react";
import { HubConnection, HubConnectionBuilder, HubConnectionState, HttpTransportType } from "@microsoft/signalr";
import { useGameStore } from "./gameStore";
import type { ChatMessageDto, RematchInviteDto, RoomDto, RoomSummaryDto } from "./types";

/**
 * Kết nối SignalR tới GameHub (GENERIC cho mọi game). makeMove gửi payload
 * dạng JSON tuỳ game; server validate bằng đúng engine rồi broadcast lại.
 */
export function useGameRoomHub() {
  const connRef = useRef<HubConnection | null>(null);
  const readyRef = useRef<Promise<void> | null>(null);
  const lobbyWanted = useRef(false);

  useEffect(() => {
    let active = true;
    useGameStore.getState().setConnectionState("connecting");
    const conn = new HubConnectionBuilder()
      .withUrl("/hubs/game", {
        // WebSocket không hoạt động qua Vite dev proxy — skip thẳng vào SSE để tránh
        // timeout negotiate và "Failed to select transport before stop() was called".
        // Production build không có Vite proxy nên WebSocket sẽ hoạt động bình thường.
        transport: import.meta.env.DEV
          ? HttpTransportType.ServerSentEvents | HttpTransportType.LongPolling
          : HttpTransportType.WebSockets | HttpTransportType.ServerSentEvents | HttpTransportType.LongPolling,
      })
      // Danh sách delay tường minh thay vì mặc định — dễ kiểm soát/log khi debug reconnect.
      .withAutomaticReconnect([0, 2000, 5000, 10000, 10000])
      .build();

    conn.on("GameStateUpdated", (room: RoomDto) => { if (active) useGameStore.getState().setRoom(room); });
    conn.on("Seated", (info: { side: string | null }) => { if (active) useGameStore.getState().setMySide(info.side); });
    conn.on("Error", (msg: string) => { if (active) useGameStore.getState().setError(msg); });
    conn.on("LobbyUpdated", (room: RoomSummaryDto) => { if (active) useGameStore.getState().upsertRoom(room); });
    conn.on("ChatMessageReceived", (msg: ChatMessageDto) => { if (active) useGameStore.getState().addChatMessage(msg); });
    conn.on("RematchAvailable", (invite: RematchInviteDto) => { if (active) useGameStore.getState().setRematchInvite(invite); });

    conn.onreconnecting(() => { if (active) useGameStore.getState().setConnectionState("reconnecting"); });

    // Sau khi SignalR tự nối lại, ConnectionId đổi → server không còn biết ta đang ở phòng/sảnh
    // nào (map connectionId→user chỉ được set lúc JoinRoom/SubscribeLobby) — phải gọi lại đúng
    // method đó, đọc state MỚI NHẤT (không dùng closure cũ chụp lúc mount) để không bỏ sót
    // trường hợp người dùng đã chuyển phòng ngay trước khi mất kết nối.
    conn.onreconnected(async () => {
      if (!active) return;
      useGameStore.getState().setConnectionState("reconnecting");
      try {
        const roomId = useGameStore.getState().room?.id;
        if (roomId) {
          await conn.invoke("JoinRoom", roomId);
        } else {
          await conn.invoke("SubscribeLobby");
        }
        if (active) useGameStore.getState().setConnectionState("connected");
      } catch (err) {
        console.error("Không re-đăng ký được sau khi reconnect:", err);
        if (active) {
          useGameStore.getState().setConnectionState("disconnected");
          useGameStore.getState().setError("Chưa khôi phục được kết nối phòng. Vui lòng tải lại trang.");
        }
      }
    });

    conn.onclose(() => { if (active) useGameStore.getState().setConnectionState("disconnected"); });

    // Đăng nhập hết hạn giữa chừng → hub từ chối connection (Hub yêu cầu [Authorize]) —
    // phải báo lên UI, không chỉ console, để người dùng biết cần đăng nhập lại.
    const started = conn.start();
    readyRef.current = started;
    started.then(async () => {
      if (!active) return;
      if (lobbyWanted.current) {
        await conn.invoke("SubscribeLobby");
      } else {
        // Sau khi kết nối thành công, tự động join lại phòng nếu đang ở trong phòng.
        // Cần thiết khi React StrictMode khiến RoomRoute's joinRoom() chạy trước connection ready.
        const roomId = useGameStore.getState().room?.id;
        if (roomId) await conn.invoke("JoinRoom", roomId);
      }
      if (active) useGameStore.getState().setConnectionState("connected");
    }).catch((err) => {
      if (!active) return;
      const msg = err instanceof Error ? err.message : String(err);
      // Bỏ qua lỗi "stopped during negotiation" — xảy ra do React StrictMode cleanup,
      // connection thứ 2 (mount thật) sẽ tự kết nối lại. Không hiện error cho user.
      if (msg.includes("stopped during negotiation") || msg.includes("select transport before stop")) return;
      useGameStore.getState().setConnectionState("disconnected");
      console.error("SignalR error:", err);
      useGameStore.getState().setError("Không kết nối được máy chủ trò chơi — thử tải lại trang hoặc đăng nhập lại.");
    });
    connRef.current = conn;

    return () => {
      active = false;
      // Đợi start() xong (resolve hoặc reject) rồi mới stop để tránh race condition
      // "The connection was stopped during negotiation" (đặc biệt trong React StrictMode dev).
      started.then(() => conn.stop(), () => conn.stop());
      connRef.current = null;
      readyRef.current = null;
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
  const joinRoom = async (roomId: string, signal?: AbortSignal) => {
    if (signal?.aborted) return;
    const connection = connRef.current;
    if (!connection) { surface(new Error("Kết nối trò chơi chưa sẵn sàng.")); return; }
    try {
      await readyRef.current;
      if (connRef.current !== connection || signal?.aborted) return;
      await connection.invoke("JoinRoom", roomId);
    } catch (error) { if (!signal?.aborted) surface(error); }
  };

  /** move: payload tuỳ game (vd. Vây Bắt = { pieceId, to }). */
  const makeMove = (roomId: string, move: unknown) => {
    const connection = connRef.current;
    if (!connection || connection.state !== HubConnectionState.Connected) {
      useGameStore.getState().setError("Kết nối trò chơi chưa sẵn sàng. Hãy chờ kết nối rồi thử lại.");
      return;
    }
    connection.invoke("MakeMove", roomId, JSON.stringify(move)).catch(surface);
  };

  const leaveRoom = (roomId: string) => {
    connRef.current?.invoke("LeaveRoom", roomId).catch(console.error);
  };

  const subscribeLobby = () => {
    lobbyWanted.current = true;
    const connection = connRef.current;
    if (connection?.state === HubConnectionState.Connected)
      return connection.invoke("SubscribeLobby").catch(surface);
  };

  const unsubscribeLobby = () => {
    lobbyWanted.current = false;
    return connRef.current?.invoke("UnsubscribeLobby").catch(console.error);
  };

  const sendChatMessage = async (roomId: string, text: string): Promise<boolean> => {
    const connection = connRef.current;
    if (!connection || connection.state !== HubConnectionState.Connected) return false;
    try {
      await connection.invoke("SendChatMessage", roomId, text);
      return true;
    } catch (error) {
      surface(error);
      return false;
    }
  };

  /** Báo cho người khác còn ở phòng cũ là đã có phòng chơi lại — chính mình tự điều hướng bằng response REST, không cần chờ broadcast này. */
  const announceRematch = (oldRoomId: string, newRoomId: string) => {
    connRef.current?.invoke("AnnounceRematch", oldRoomId, newRoomId).catch(console.error);
  };

  return { joinRoom, makeMove, leaveRoom, subscribeLobby, unsubscribeLobby, sendChatMessage, announceRematch };
}
