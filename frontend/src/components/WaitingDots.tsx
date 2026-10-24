/** A quiet, repeating cue that the active seat is still waiting on another player. */
export default function WaitingDots() {
  return (
    <span aria-hidden="true" className="game-waiting-dots">
      <span />
      <span />
      <span />
    </span>
  );
}
