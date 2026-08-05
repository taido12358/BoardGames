import type { BangPublicPlayer, BangYourView } from "../types";

interface Props {
  me: BangPublicPlayer;
  you: BangYourView;
}

/** Thông tin của CHÍNH người chơi — luôn ở dưới cùng màn hình (xem BangBoard). */
export default function LocalPlayerPanel({ me, you }: Props) {
  const hearts = Array.from({ length: me.maxHp }, (_, i) => i < me.hp);

  return (
    <div className="rounded-xl border-2 border-amber-600/60 bg-gradient-to-b from-[#2b2013] to-[#1c150c] p-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-amber-300/80 uppercase tracking-wide">Bạn</div>
          <div className="font-bold text-amber-100">{me.name} · {me.character}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-amber-300/80 uppercase tracking-wide">Vai trò của bạn</div>
          <div className="font-bold text-amber-100">{you.roleDisplay}</div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1">
          {hearts.map((full, i) => (
            <span key={i} className={full ? "text-red-500" : "text-slate-700"}>{full ? "❤️" : "🖤"}</span>
          ))}
          <span className="ml-1 text-sm text-amber-100 font-semibold">{me.hp}/{me.maxHp}</span>
        </div>
        <div className="text-sm text-amber-200">
          🔫 <span className="font-semibold">{you.weapon}</span> · Tầm bắn: {you.weaponRange}
        </div>
        <div className="text-sm text-amber-200">🃏 Số lá: {you.hand.length}</div>
      </div>

      {me.equipment.length > 0 && (
        <div className="mt-1 text-xs text-amber-300/70">🛠 Trang bị: {me.equipment.join(", ")}</div>
      )}
    </div>
  );
}
