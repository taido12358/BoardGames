// Khớp với MeoNoTypes.cs backend — đổi field phải cập nhật cả hai.

export type CardKind =
  | "explodingKitten"
  | "defuse"
  | "skip"
  | "attack"
  | "seeFuture"
  | "shuffle"
  | "favor"
  | "nope"
  | "tacocat"
  | "beardCat"
  | "hairyPotatoCat"
  | "rainbowRalphingCat"
  | "cattermelon";

export type GamePhase =
  | "waitingForPlayers"
  | "action"
  | "awaitingNope"
  | "awaitingFavor"
  | "awaitingDefuse"
  | "finished";

export interface Card {
  id: string;
  kind: CardKind;
}

export interface PublicPlayer {
  id: string;
  name: string;
  seatIndex: number;
  cardCount: number;
  alive: boolean;
  isCurrentPlayer: boolean;
}

export interface PendingActionView {
  actingPlayerId: string;
  type: string;
  actionKindName: string;
  targetPlayerId?: string;
  nopePendingReplies: string[];
  noped: boolean;
}

export interface MeoNoViewerState {
  phase: GamePhase;
  players: PublicPlayer[];
  currentPlayerId: string | null;
  turnsLeft: number;
  deckCount: number;
  discardPile: Card[];
  pendingAction: PendingActionView | null;
  winner: string | null;
  gameLog: string[];
  yourHand: Card[];
  seeFutureTop3?: Card[];
}

// ─── Move types ────────────────────────────────────────────────────────────

export interface PlayCardMove {
  type: "PLAY_CARD";
  cardId: string;
  targetPlayerId?: string;
}

export interface PlayComboMove {
  type: "PLAY_COMBO";
  comboCardIds: string[];
  targetPlayerId?: string;
  requestedKind?: string;
}

export interface DrawMove {
  type: "DRAW";
}

export interface NopeMove {
  type: "NOPE";
}

export interface PassNopeMove {
  type: "PASS_NOPE";
}

export interface GiveCardMove {
  type: "GIVE_CARD";
  cardId: string;
}

export interface DefuseMove {
  type: "DEFUSE";
  insertPosition?: number;
}

export type MeoNoMove =
  | PlayCardMove
  | PlayComboMove
  | DrawMove
  | NopeMove
  | PassNopeMove
  | GiveCardMove
  | DefuseMove;
