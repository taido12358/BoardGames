import { useEffect, useId, useRef, useState } from "react";

interface Props {
  log: string[];
}

/** Tô màu dòng log theo nội dung để dễ đọc hơn. */
function logColor(line: string): string {
  if (line.includes("THẮNG") || line.includes("chiến thắng")) return "text-amber-300 font-semibold";
  if (line.includes("bị loại") || line.includes("chết") || line.includes("💀")) return "text-[#c84040]";
  if (line.includes("Bang!") || line.includes("🔫") || line.includes("Gatling") || line.includes("Súng")) return "text-[#d4844a]";
  if (line.includes("Trượt") || line.includes("đỡ được")) return "text-[#7aaccf]";
  if (line.includes("Bia") || line.includes("hồi máu") || line.includes("❤️")) return "text-[#7aaa60]";
  if (line.includes("DEBUG")) return "text-amber-900/50 italic text-[10px]";
  return "text-amber-200/70";
}

/** Chỉ theo dõi dòng mới khi người chơi đang ở cuối nhật ký, không cuộn cả trang. */
export default function GameLogPanel({ log }: Props) {
  const [open, setOpen] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  const [hasNew, setHasNew] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    if (following.current) listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    else setHasNew(true);
  }, [log.length, open]);

  return (
    <div className="rounded-sm bg-[#16120a] border border-amber-900/40 overflow-hidden shadow-inner">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          following.current = true;
          setHasNew(false);
          setOpen((o) => !o);
        }}
        className="w-full flex items-center justify-between px-3 py-2 text-[11px] uppercase tracking-widest text-amber-500/70 hover:bg-amber-900/15 font-medium"
      >
        <span>📜 Nhật ký {log.length > 0 && <span className="text-amber-600/80 normal-case">({log.length})</span>}</span>
        <span className="text-amber-700/60">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div>
        {hasNew && <button type="button" onClick={() => {
          following.current = true;
          setHasNew(false);
          listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
        }} className="mx-3 mb-2 rounded-sm border border-amber-700/40 bg-amber-900/50 px-3 py-2 text-xs text-amber-200 hover:bg-amber-800/70 transition-colors">Có diễn biến mới · Xem mới nhất</button>}
        <div id={panelId} ref={listRef} aria-label="Nhật ký trận đấu" tabIndex={0}
          onScroll={(event) => {
            const element = event.currentTarget;
            following.current = element.scrollHeight - element.scrollTop - element.clientHeight < 32;
            if (following.current) setHasNew(false);
          }} className="max-h-36 overflow-y-auto px-3 pb-2 space-y-0.5 focus-visible:outline focus-visible:outline-amber-400">
          {log.length === 0 && <p className="text-amber-900/40 text-xs py-1 italic">Chưa có gì xảy ra…</p>}
          {log.map((line, i) => (
            <p key={i} className={`text-[11px] leading-snug ${logColor(line)}`}>{line}</p>
          ))}
        </div>
        </div>
      )}
    </div>
  );
}
