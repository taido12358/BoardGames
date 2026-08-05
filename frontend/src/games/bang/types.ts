// Kiểu dữ liệu RIÊNG của game BANG!. Khớp CHÍNH XÁC với BangViewerState/BangPublicPlayer/
// BangYourView (backend Games/Bang/BangTypes.cs) — chính tả enum đã chốt bằng test
// BangJsonContractTests.cs, đổi bên nào phải đổi bên kia theo.
//
// Server là nguồn chân lý: state nhận được đã được lọc riêng cho người xem (không bao giờ
// chứa bài của người khác) — xem RedactStateForViewer ở backend. Helper ở đây chỉ hỗ trợ
// UI (vd tô màu), không tự tính luật.

export type CardKind =
  | "bang" | "missed" | "beer" | "gatling" | "duel" | "panic" | "catBalou"
  | "stagecoach" | "wellsFargo" | "indians" | "volcanic" | "schofield"
  | "remington" | "mustang" | "barrel";

export type CardType = "attack" | "defense" | "heal" | "weapon" | "equipment" | "action";

export interface Card {
  id: string;
  kind: CardKind;
  suit: string;
  rank: string;
}

export type RoleKind = "sheriff" | "deputy" | "outlaw" | "renegade";
export type GamePhase = "waitingForPlayers" | "action" | "awaitingResponse" | "finished";
export type PendingResponseKind = "bang" | "duel" | "indians" | "gatling";

export interface BangPublicPlayer {
  id: string;
  name: string;
  seatIndex: number;
  character: string;
  abilityName: string;
  publicRole: string;       // tên vai trò tiếng Việt, hoặc "Vai trò ẩn"
  hp: number;
  maxHp: number;
  cardCount: number;
  weapon: string;           // tên vũ khí tiếng Việt (vd "Cattleman")
  weaponRange: number;
  equipment: string[];
  alive: boolean;
  distance: number | null;  // null nếu chính là bạn hoặc không tính được (đã bị loại)
  inRange: boolean | null;
}

export interface BangYourView {
  id: string;
  role: RoleKind;
  roleDisplay: string;
  hand: Card[];
  weapon: string;
  weaponRange: number;
}

export interface PendingResponseView {
  kind: PendingResponseKind;
  fromPlayerId: string;
  targetIds: string[];
  itsYourTurn: boolean;
}

export interface BangViewerState {
  phase: GamePhase;
  players: BangPublicPlayer[];
  currentPlayerId: string | null;
  turnNumber: number;
  deckCount: number;
  discardPile: Card[];
  pendingResponse: PendingResponseView | null;
  winner: "sheriff" | "outlaw" | "renegade" | string | null;
  gameLog: string[];
  you: BangYourView | null;
}

export interface BangMap {
  weaponRanges: Record<string, number>;
  roleDistribution: Record<string, number[]>;
}

/** Payload nước đi gửi lên hub qua makeMove(roomId, move). */
export type BangMove =
  | { type: "PLAY_CARD"; cardId: string; targetPlayerId?: string | null }
  | { type: "RESPOND"; cardId?: string | null }
  | { type: "END_TURN"; discardCardIds?: string[] };

export const CARD_DISPLAY: Record<CardKind, { name: string; icon: string }> = {
  bang: { name: "Bang!", icon: "🔫" },
  missed: { name: "Trượt!", icon: "🛡" },
  beer: { name: "Bia", icon: "🍺" },
  gatling: { name: "Súng Gatling", icon: "💥" },
  duel: { name: "Đấu súng", icon: "⚔️" },
  panic: { name: "Hoảng loạn!", icon: "😱" },
  catBalou: { name: "Cat Balou", icon: "🎯" },
  stagecoach: { name: "Xe ngựa", icon: "🚃" },
  wellsFargo: { name: "Wells Fargo", icon: "💰" },
  indians: { name: "Người da đỏ!", icon: "🏹" },
  volcanic: { name: "Volcanic", icon: "🔫" },
  schofield: { name: "Schofield", icon: "🔫" },
  remington: { name: "Remington", icon: "🔫" },
  mustang: { name: "Mustang", icon: "🐎" },
  barrel: { name: "Thùng rượu", icon: "🛢" },
};

export const ROLE_ICON: Record<string, string> = {
  "Cảnh sát trưởng": "⭐",
  "Phó cảnh sát": "🥈",
  "Kẻ ngoài vòng pháp luật": "🏴",
  "Kẻ phản bội": "🎭",
  "Vai trò ẩn": "❓",
};

export function myPlayer(state: BangViewerState): BangPublicPlayer | null {
  if (!state.you) return null;
  return state.players.find((p) => p.id === state.you!.id) ?? null;
}

export function isMyTurn(state: BangViewerState): boolean {
  return state.phase === "action" && state.you !== null && state.currentPlayerId === state.you.id;
}

export function awaitingMyResponse(state: BangViewerState): boolean {
  return state.phase === "awaitingResponse" && !!state.pendingResponse?.itsYourTurn;
}
