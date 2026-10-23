import { useEffect, useRef, useState } from "react";

interface Props {
  log: string[];
}

/** Tô màu dòng log theo nội dung để dễ đọc hơn. */
function logColor(line: string): string {
  if (line.includes("THẮNG") || line.includes("chiến thắng")) return "text-amber-300 font-semibold";
  if (line.includes("bị loại") || line.includes("chết") || line.includes("💀")) return "text-red-400";
  if (line.includes("Bang!") || line.includes("🔫") || line.includes("Gatling") || line.includes("Súng")) return "text-orange-300";
  if (line.includes("Trượt") || line.includes("đỡ được")) return "text-blue-300";
  if (line.includes("Bia") || line.includes("hồi máu") || line.includes("❤️")) return "text-green-400";
  if (line.includes("DEBUG")) return "text-slate-600 italic text-[10px]";
  return "text-slate-300";
}

/** NHẬT KÝ TRẬN ĐẤU — luôn cuộn xuống dòng mới nhất; gập lại được. */
export default function GameLogPanel({ log }: Props) {
  const [open, setOpen] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log.length, open]);

  return (
    <div className="rounded-xl bg-[#16120a] border border-amber-900/25 overflow-hidden shadow-inner">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-[11px] uppercase tracking-widest text-amber-500/60 hover:bg-amber-900/10 font-medium"
      >
        <span>📜 Nhật ký {log.length > 0 && <span className="text-amber-600/80 normal-case">({log.length})</span>}</span>
        <span className="text-amber-700/60">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="max-h-36 overflow-y-auto px-3 pb-2 space-y-0.5">
          {log.length === 0 && <p className="text-slate-600 text-xs py-1">Chưa có gì xảy ra…</p>}
          {log.map((line, i) => (
            <p key={i} className={`text-[11px] leading-snug ${logColor(line)}`}>{line}</p>
          ))}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
