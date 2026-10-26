import MonopolyBoard from "./MonopolyBoard";
import type { MonopolyMap, MonopolyState } from "./types";
import type { RoomDto } from "../../platform/types";

interface MonopolyReplayBoardProps { roomId: string; map: unknown; state: unknown; seats: (string | null)[] }
const ignoreAction = () => undefined;
const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object";

/** Reads public snapshots without replacing the live room or opening a hub connection. */
export default function MonopolyReplayBoard({ roomId, map, state, seats }: MonopolyReplayBoardProps) {
  if (!map || typeof map !== "object" || !("tiles" in map) || !Array.isArray(map.tiles) || map.tiles.length !== 40
    || !state || typeof state !== "object" || !("players" in state) || !Array.isArray(state.players)
    || !("properties" in state) || !Array.isArray(state.properties) || state.properties.length !== 40
    || !("dice" in state) || !Array.isArray(state.dice) || !("payments" in state) || !Array.isArray(state.payments)
    || !("log" in state) || !Array.isArray(state.log)) {
    return <p role="status" className="text-sm text-amber-300/70">Bước này chưa có snapshot bàn cờ hợp lệ.</p>;
  }
  const players = state.players;
  if (!map.tiles.every(t => isRecord(t) && typeof t.name === "string" && typeof t.index === "number"
      && t.index >= 0 && t.index < 40 && typeof t.price === "number")
    || !players.every(p => isRecord(p) && typeof p.name === "string" && typeof p.cash === "number"
      && typeof p.position === "number" && Number.isInteger(p.position) && p.position >= 0 && p.position < 40 && Array.isArray(p.jailCards))
    || !state.properties.every(p => isRecord(p) && typeof p.buildings === "number"
      && (p.owner === null || (typeof p.owner === "number" && Number.isInteger(p.owner) && p.owner >= 0 && p.owner < players.length)))
    || !state.log.every(line => typeof line === "string")) {
    return <p role="status" className="text-sm text-amber-300/70">Snapshot bàn cờ bị lỗi dữ liệu.</p>;
  }
  const snapshot = state as MonopolyState;
  const room: RoomDto<MonopolyMap, MonopolyState> = {
    id: roomId, gameKey: "monopoly", status: "Finished", winner: snapshot.winner,
    map: map as MonopolyMap, state: snapshot, createdAt: "", seatCount: seats.length,
    seats: seats.map(displayName => ({ displayName, connected: false, lastSeenAt: null })),
    ownerUserId: "", mySide: null, isMine: false,
  };
  return <MonopolyBoard key={roomId} replayRoom={room} makeMove={ignoreAction} onLeave={ignoreAction} onRematch={ignoreAction} rematching={false} />;
}
