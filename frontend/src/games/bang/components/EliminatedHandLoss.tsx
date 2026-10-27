import type { CSSProperties } from "react";

export default function EliminatedHandLoss({ amount }: { amount: number }) {
  const visibleCards = Math.min(amount, 4);
  return (
    <span aria-hidden="true" className="bang-eliminated-hand-loss">
      <span className="bang-eliminated-hand-loss-cards">
        {Array.from({ length: visibleCards }, (_, index) => {
          const centeredIndex = index - (visibleCards - 1) / 2;
          const offset = centeredIndex * 13;
          return (
            <span
              key={index}
              className="bang-eliminated-hand-loss-card"
              style={{
                "--loss-x": `${offset}px`,
                "--loss-rotation": `${centeredIndex * 12}deg`,
                "--loss-delay": `${index * 28}ms`,
              } as CSSProperties}
            >🂠</span>
          );
        })}
      </span>
      <span className="bang-eliminated-hand-loss-count">−{amount} lá</span>
    </span>
  );
}
