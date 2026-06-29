// Helper phía client CHỈ phục vụ gợi ý UI (highlight nước đi). Server vẫn là
// nguồn chân lý (authoritative) — mọi nước đi đều được backend validate lại.

export interface NodeDef { id: number; x: number; y: number; }

export interface MapDef {
  nodes: NodeDef[];
  edges: number[][];
  redCount: number;
  whiteCount: number;
  whiteStart: number;
  redStartCandidates: number[];
  maxRedTurns: number;
}

export interface GameState {
  pieces: Record<string, number>;
  turn: "RED" | "WHITE";
  redTurnsUsed: number;
  maxRedTurns: number;
  winner: string | null;
  redStartPos: number[];
}

export interface RoomDto {
  id: string;
  status: "Waiting" | "Playing" | "Finished";
  maxRedTurns: number;
  redPlayer: string | null;
  whitePlayer: string | null;
  winner: string | null;
  map: MapDef;
  state: GameState;
  createdAt: string;
}

export function side(pieceId: string): "RED" | "WHITE" {
  return pieceId[0] === "R" ? "RED" : "WHITE";
}

export function buildAdjacency(map: MapDef): Map<number, Set<number>> {
  const adj = new Map<number, Set<number>>();
  map.nodes.forEach((n) => adj.set(n.id, new Set()));
  for (const [a, b] of map.edges) {
    adj.get(a)?.add(b);
    adj.get(b)?.add(a);
  }
  return adj;
}

export function occupancy(s: GameState): Map<number, string> {
  const occ = new Map<number, string>();
  for (const [pid, node] of Object.entries(s.pieces)) occ.set(node, pid);
  return occ;
}

export function legalMoves(map: MapDef, s: GameState, pieceId: string): number[] {
  const adj = buildAdjacency(map);
  const occ = occupancy(s);
  const from = s.pieces[pieceId];
  return [...(adj.get(from) ?? [])].filter((n) => !occ.has(n));
}
