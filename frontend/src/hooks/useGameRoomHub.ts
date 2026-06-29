import { useEffect, useRef } from "react";
import { HubConnection, HubConnectionBuilder } from "@microsoft/signalr";
import { useGameStore } from "../store/gameStore";
import type { RoomDto } from "../game/engineClient";

/**
 * Mở kết nối SignalR tới GameHub và cung cấp các hành động realtime
 * (joinRoom, makeMove, leaveRoom). Server là authoritative — mọi nước đi
 * được backend validate rồi broadcast lại "GameStateUpdated" cho cả phòng.
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

  const makeMove = (roomId: string, pieceId: string, toNode: number) => {
    const name = useGameStore.getState().playerName;
    connRef.current?.invoke("MakeMove", roomId, pieceId, toNode, name).catch(console.error);
  };

  const leaveRoom = (roomId: string) => {
    connRef.current?.invoke("LeaveRoom", roomId).catch(console.error);
  };

  return { joinRoom, makeMove, leaveRoom };
}
