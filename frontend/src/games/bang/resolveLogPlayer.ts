import type { BangPublicPlayer } from "./types";

/** Resolve a name-only log actor without attaching the cue to every duplicate display name. */
export function resolveLogPlayer(
  playerName: string,
  players: readonly BangPublicPlayer[],
  previousCardCounts: ReadonlyMap<string, number>,
): BangPublicPlayer | null {
  const matches = players.filter((player) => player.name === playerName);
  if (matches.length === 1) return matches[0];
  if (matches.length < 2) return null;

  const lostCards = matches.filter((player) => {
    const previousCount = previousCardCounts.get(player.id);
    return previousCount !== undefined && player.cardCount < previousCount;
  });
  return lostCards.length === 1 ? lostCards[0] : null;
}

export function resolveLogPlayerByCardChange(
  playerName: string,
  players: readonly BangPublicPlayer[],
  previousCardCounts: ReadonlyMap<string, number>,
  direction: "increase" | "decrease",
): BangPublicPlayer | null {
  const matches = players.filter((player) => player.name === playerName);
  if (matches.length === 1) return matches[0];
  if (matches.length < 2) return null;

  const changedPlayers = matches.filter((player) => {
    const previousCount = previousCardCounts.get(player.id);
    if (previousCount === undefined) return false;
    return direction === "increase"
      ? player.cardCount > previousCount
      : player.cardCount < previousCount;
  });
  return changedPlayers.length === 1 ? changedPlayers[0] : null;
}

/** Resolve a targeted log actor using public card/HP changes when display names collide. */
export function resolveLogTarget(
  playerName: string,
  players: readonly BangPublicPlayer[],
  previousCardCounts: ReadonlyMap<string, number>,
  previousHitPoints: ReadonlyMap<string, number>,
): BangPublicPlayer | null {
  const matches = players.filter((player) => player.name === playerName);
  if (matches.length === 1) return matches[0];
  if (matches.length < 2) return null;

  const changedTargets = matches.filter((player) => {
    const previousCards = previousCardCounts.get(player.id);
    const previousHp = previousHitPoints.get(player.id);
    return (previousCards !== undefined && player.cardCount < previousCards)
      || (previousHp !== undefined && player.hp < previousHp);
  });
  return changedTargets.length === 1 ? changedTargets[0] : null;
}
