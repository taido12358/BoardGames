import { useEffect, useRef, useState } from "react";

interface Props {
  log: string[];
}

/** NHẬT KÝ TRẬN ĐẤU — luôn cuộn xuống dòng mới nhất; gập lại được trên màn nhỏ. */
export default function GameLogPanel({ log }: Props) {
  const [open, setOpen] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log.length, open]);

  return (
    <div className="rounded-xl bg-slate-800/70 border border-slate-700 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs uppercase tracking-wide text-slate-400 hover:bg-slate-700/50"
      >
        <span>📜 Nhật ký trận đấu</span>
        <span>{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="max-h-40 overflow-y-auto px-3 pb-2 space-y-1">
          {log.length === 0 && <p className="text-slate-500 text-xs">Chưa có gì xảy ra…</p>}
          {log.map((line, i) => (
            <p key={i} className="text-xs text-slate-300 leading-snug">{line}</p>
          ))}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
