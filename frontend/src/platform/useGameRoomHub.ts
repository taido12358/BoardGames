import { useEffect, useRef } from "react";
import { HubConnection, HubConnectionBuilder } from "@microsoft/signalr";
import { useGameStore } from "./gameStore";
import type { RoomDto } from "./types";

/**
 * Kết nối SignalR tới GameHub (GENERIC cho mọi game). makeMove gửi payload
 * dạng JSON tuỳ game; server validate bằng đúng engine rồi broadcast lại.
 */
export function useGameRoomHub() {
  const connRef = useRef<HubConnection | null>(null);
  const setRoom = useGameStore((s) => s.setRoom);
  const setMySide = useGameStore((s) => s.setMySide);
  const setError = useGameStore((s) => s.setError);

  useEffect(() => {
    const conn = new HubConnectionBuilder()
      .withUrl("/hubs/game")
      .withAutomaticReconnect()
      .build();

    conn.on("GameStateUpdated", (room: RoomDto) => setRoom(room));
    conn.on("Seated", (info: { side: string | null }) => setMySide(info.side));
    conn.on("Error", (msg: string) => setError(msg));

    // Đăng nhập hết hạn giữa chừng → hub từ chối connection (Hub yêu cầu [Authorize]) —
    // phải báo lên UI, không chỉ console, để người dùng biết cần đăng nhập lại.
    conn.start().catch((err) => {
      console.error("SignalR error:", err);
      setError("Không kết nối được máy chủ trò chơi — thử tải lại trang hoặc đăng nhập lại.");
    });
    connRef.current = conn;

    return () => {
      conn.stop();
      connRef.current = null;
    };
  }, [setRoom, setMySide, setError]);

  // Lỗi invoke phải hiện lên UI — nếu chỉ console.error, người chơi thấy
  // "không đi được quân" mà không biết vì sao (vd. mất kết nối SignalR).
  const surface = (err: unknown) => {
    console.error(err);
    setError(err instanceof Error ? `Mất kết nối tới server: ${err.message}` : "Mất kết nối tới server");
  };

  // Danh tính lấy từ cookie JWT ở server (Context.User trong GameHub) — không còn gửi
  // playerName từ client nữa (bài học bảo mật 2026-08-05: xem rules/history/decisions.md).
  const joinRoom = (roomId: string) => {
    connRef.current?.invoke("JoinRoom", roomId).catch(surface);
  };

  /** move: payload tuỳ game (vd. Vây Bắt = { pieceId, to }). */
  const makeMove = (roomId: string, move: unknown) => {
    connRef.current?.invoke("MakeMove", roomId, JSON.stringify(move)).catch(surface);
  };

  const leaveRoom = (roomId: string) => {
    connRef.current?.invoke("LeaveRoom", roomId).catch(console.error);
  };

  return { joinRoom, makeMove, leaveRoom };
}
