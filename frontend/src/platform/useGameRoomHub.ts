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
    conn.on("Seated", (info: { side: "RED" | "WHITE" | null }) => setMySide(info.side));
    conn.on("Error", (msg: string) => setError(msg));

    conn.start().catch((err) => console.error("SignalR error:", err));
    connRef.current = conn;

    return () => {
      conn.stop();
      connRef.current = null;
    };
  }, [setRoom, setMySide, setError]);

  const joinRoom = (roomId: string) => {
    const name = useGameStore.getState().playerName;
    connRef.current?.invoke("JoinRoom", roomId, name).catch(console.error);
  };

  /** move: payload tuỳ game (vd. Vây Bắt = { pieceId, to }). */
  const makeMove = (roomId: string, move: unknown) => {
    const name = useGameStore.getState().playerName;
    connRef.current?.invoke("MakeMove", roomId, JSON.stringify(move), name).catch(console.error);
  };

  const leaveRoom = (roomId: string) => {
    connRef.current?.invoke("LeaveRoom", roomId).catch(console.error);
  };

  return { joinRoom, makeMove, leaveRoom };
}
