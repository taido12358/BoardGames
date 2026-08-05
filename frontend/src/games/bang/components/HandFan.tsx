import type { Card } from "../types";
import CardView from "./CardView";

interface Props {
  hand: Card[];
  selectedId: string | null;
  playable: boolean;
  onSelect: (card: Card) => void;
}

/** Bài trên tay của CHÍNH người chơi — luôn thấy mặt bài (đối thủ chỉ thấy số lá, xem PlayerSeat). */
export default function HandFan({ hand, selectedId, playable, onSelect }: Props) {
  if (hand.length === 0) {
    return <div className="text-slate-500 text-sm py-4 text-center">Bạn không có lá bài nào.</div>;
  }
  return (
    <div className="flex overflow-x-auto gap-[-8px] px-2 py-3 -mx-2" style={{ gap: "-8px" }}>
      {hand.map((card) => (
        <div key={card.id} className="-ml-3 first:ml-0">
          <CardView
            card={card}
            selected={selectedId === card.id}
            disabled={!playable}
            onClick={playable ? () => onSelect(card) : undefined}
          />
        </div>
      ))}
    </div>
  );
}
