export interface Tile {
  index: number;
  name: string;
  kind: string;
  group: string;
  price: number;
  houseCost: number;
  rents: number[] | null;
}
export interface MonopolyMap { edition: string; tiles: Tile[]; rulesetId?: string; auctionMinimumBid?: number }
export interface Player {
  name: string; position: number; cash: number; bankrupt: boolean;
  inJail: boolean; jailAttempts: number; jailCards: string[];
}
export interface Property { owner: number | null; buildings: number; mortgaged: boolean }
export interface Trade {
  from: number; to: number; cashOffered: number; cashRequested: number;
  offered: number[]; requested: number[];
  offeredCards: string[]; requestedCards: string[]; redeemRequested: boolean;
}
export interface MonopolyState {
  version: number; started: boolean; players: Player[]; properties: Property[];
  turn: number; phase: string; dice: number[]; doubles: number; extraRoll: boolean;
  utilityDice?: number[] | null;
  houses: number; hotels: number; winner: string | null; lastCard: string; log: string[];
  payments: { from: number; to: number | null; amount: number }[];
  inheritedMortgages?: { owner: number; tile: number }[];
  buildingDemand?: { kind: string; actor: number; eligibleTiles: Record<string, number[]>;
    requests: Record<string, number>; responded: number[]; resumePhase: string } | null;
  auction: { tile: number; bid: number; leader: number | null; actor: number; passed: number[];
    kind?: string; eligibleTiles?: Record<string, number[]> } | null;
  trade: Trade | null;
}
export interface MonopolyMove {
  type: string; tile?: number; amount?: number; target?: number;
  cashOffered?: number; cashRequested?: number; offered?: number[]; requested?: number[];
  offeredCards?: string[]; requestedCards?: string[]; redeemRequested?: boolean; redeemReceived?: boolean;
}
export function actor(s: MonopolyState): number {
  if (s.phase === "Auction") return s.auction?.actor ?? s.turn;
  if (s.phase === "BuildingDemand") return s.buildingDemand?.actor ?? s.turn;
  if (s.phase === "Debt") return s.payments[0]?.from ?? s.turn;
  if (s.phase === "Trade") return s.trade?.to ?? s.turn;
  if (s.phase === "Inheritance") return s.inheritedMortgages?.[0]?.owner ?? s.turn;
  return s.turn;
}
export function boardPosition(index: number): { gridRow: number; gridColumn: number } {
  if (index <= 10) return { gridRow: 11, gridColumn: 11 - index };
  if (index <= 20) return { gridRow: 21 - index, gridColumn: 1 };
  if (index <= 30) return { gridRow: 1, gridColumn: index - 19 };
  return { gridRow: index - 29, gridColumn: 11 };
}
export const GROUP_COLORS: Record<string, string> = {
  Brown: "bg-amber-800", LightBlue: "bg-sky-300", Pink: "bg-pink-400", Orange: "bg-orange-500",
  Red: "bg-red-600", Yellow: "bg-yellow-300", Green: "bg-emerald-600", DarkBlue: "bg-blue-800",
};
