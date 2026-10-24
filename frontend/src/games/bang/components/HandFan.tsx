import type { Card } from "../types";
import CardView from "./CardView";
import { useCardDrawFlash } from "../useCardDrawFlash";

interface Props {
  hand: Card[];
  selectedId?: string | null;
  selectedIds?: string[];
  playable: boolean;
  canPlay?: (card: Card) => boolean;
  onSelect: (card: Card) => void;
}

/** Bài trên tay của CHÍNH người chơi — fan layout, hover nâng bài lên. */
export default function HandFan({ hand, selectedId, selectedIds, playable, canPlay, onSelect }: Props) {
  const justDrew = useCardDrawFlash(hand.length);

  if (hand.length === 0) {
    return (
      <div className="flex items-center justify-center text-amber-900/50 text-sm py-5 text-center rounded-sm border border-amber-950/60 bg-[#0d0805]/60 italic shadow-[inset_0_2px_6px_rgba(0,0,0,0.8)]">
        Bạn không có lá bài nào.
      </div>
    );
  }

  return (
    <div
      className={[
        "flex gap-2 overflow-x-auto pb-3 pt-4 px-3 -mx-1 rounded-sm",
        "bg-gradient-to-b from-[#1a1208] to-[#130e06]",
        "border border-amber-900/40 shadow-inner shadow-black/50",
        justDrew ? "animate-card-draw" : "",
      ].join(" ")}
    >
      {hand.map((card) => (
        <div key={card.id} className="shrink-0 transition-all duration-200 hover:-translate-y-2 hover:z-10 relative">
          <CardView
            card={card}
            selected={selectedId === card.id || !!selectedIds?.includes(card.id)}
            selectionMode={selectedIds !== undefined}
            disabled={!playable || (canPlay && !canPlay(card))}
            onClick={playable ? () => onSelect(card) : undefined}
          />
        </div>
      ))}
    </div>
  );
}
