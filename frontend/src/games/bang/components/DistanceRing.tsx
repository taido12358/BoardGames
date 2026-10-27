import type { BangPublicPlayer } from "../types";

interface Props {
  players: BangPublicPlayer[];
  myId: string | null;
  currentPlayerId: string | null;
}

export default function DistanceRing({ players, myId, currentPlayerId }: Props) {
  const N = players.length;
  if (N < 2) return null;

  const W = 300, H = 160;
  const cx = 150, cy = 80;
  const Rx = 128, Ry = 60;

  const me = players.find((p) => p.id === myId);
  const localSeatIndex = me?.seatIndex ?? players[0].seatIndex;

  function pos(relSeat: number) {
    const alpha = -Math.PI / 2 + relSeat * ((2 * Math.PI) / N);
    return { x: cx + Rx * Math.cos(alpha), y: cy - Ry * Math.sin(alpha) };
  }

  const sorted = [...players].sort((a, b) => {
    const ra = (a.seatIndex - localSeatIndex + N) % N;
    const rb = (b.seatIndex - localSeatIndex + N) % N;
    return ra - rb;
  });

  return (
    <div
      className="rounded-sm border border-amber-900/25 bg-gradient-to-b from-[#150f08] to-[#0e0905] overflow-hidden"
      aria-hidden="true"
      title="Sơ đồ khoảng cách"
    >
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet" style={{ display: "block", maxHeight: "160px" }}>
        {/* Connecting ring lines */}
        {sorted.map((_, i) => {
          const a = pos(i);
          const b = pos((i + 1) % N);
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#2a1c0e" strokeWidth="1.5" />;
        })}

        {/* Player nodes */}
        {sorted.map((p, relSeat) => {
          const { x, y } = pos(relSeat);
          const isMe = p.id === myId;
          const isTurn = p.id === currentPlayerId;
          const inRange = !isMe && p.inRange === true;

          const dotFill = !p.alive ? "#1a1010" : isMe ? "#5a3818" : isTurn ? "#7a4f1a" : "#2e2010";
          const dotStroke = !p.alive ? "#3a2010" : isMe ? "#c8924b" : isTurn ? "#fbbf24" : inRange ? "#f59e0b" : "#4a3020";
          const labelColor = isMe ? "#c8924b" : inRange ? "#e8a840" : "#5a3820";

          const short = isMe ? "BẠN" : (p.name.length > 5 ? p.name.slice(0, 4) + "…" : p.name);
          const labelY = y < cy - 8 ? y - 18 : y + 21;
          const baseline = y < cy - 8 ? "auto" : "hanging";

          return (
            <g key={p.id}>
              {isTurn && <circle cx={x} cy={y} r={17} fill="none" stroke="#fbbf24" strokeWidth="1.5" opacity="0.45" />}
              <circle cx={x} cy={y} r={13} fill={dotStroke} />
              <circle cx={x} cy={y} r={11} fill={dotFill} />
              {p.alive ? (
                <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle" fill="#f5d09d" fontSize="7.5" fontWeight="bold">
                  {short.slice(0, 3).toUpperCase()}
                </text>
              ) : (
                <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle" fontSize="10">💀</text>
              )}
              <text x={x} y={labelY} textAnchor="middle" dominantBaseline={baseline} fill={labelColor} fontSize="7.5">
                {short}
              </text>
              {!isMe && p.distance !== null && (
                <g>
                  <circle cx={x + 11} cy={y - 10} r={8} fill={inRange ? "#78350f" : "#1a110a"} stroke={inRange ? "#f59e0b" : "#3a2010"} strokeWidth="0.8" />
                  <text x={x + 11} y={y - 10} textAnchor="middle" dominantBaseline="middle" fill={inRange ? "#fbbf24" : "#6b4a28"} fontSize="7.5" fontWeight="bold">
                    {p.distance}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Legend */}
        <circle cx={12} cy={H - 10} r={5} fill="#78350f" stroke="#f59e0b" strokeWidth="0.8" />
        <text x={20} y={H - 10} dominantBaseline="middle" fill="#5a3820" fontSize="7">trong tầm</text>
        <circle cx={72} cy={H - 10} r={5} fill="#1a110a" stroke="#3a2010" strokeWidth="0.8" />
        <text x={80} y={H - 10} dominantBaseline="middle" fill="#3a2010" fontSize="7">ngoài tầm</text>
      </svg>
    </div>
  );
}
