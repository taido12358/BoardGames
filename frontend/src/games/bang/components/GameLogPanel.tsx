import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotionPreference } from "../../../hooks/useReducedMotionPreference";
import AnimatedNumber from "../../../components/AnimatedNumber";

interface Props {
  log: string[];
  roomId?: string;
}

const MAX_LOG_STAGGERED_ENTRIES = 8;
const LOG_ENTRY_STAGGER_MS = 44;

/** Tô màu dòng log theo nội dung để dễ đọc hơn. */
function logColor(line: string): string {
  if (line.includes("DEBUG")) return "text-amber-900/50 italic text-[10px]";
  if (line.includes("THẮNG") || line.includes("chiến thắng")) return "text-amber-300 font-semibold";
  if (line.includes("bị loại") || line.includes("chết") || line.includes("💀")) return "text-[#c84040]";
  if (line.includes("Trượt!") || line.includes("đỡ được") || line.includes("để né Người da đỏ") || line.includes("kiểm tra Thùng rượu")) return "text-[#7aaccf]";
  if (line.includes("lấy 1 lá từ")) return "text-[#c4b5fd]";
  if (/Ho\u1ea3ng lo\u1ea1n!|Cat Balou/.test(line)) return "text-[#c4b5fd]";
  if (line.includes("Bia") || line.includes("hồi máu") || line.includes("❤️")) return "text-[#7aaa60]";
  if (line.includes("Bang!") || line.includes("🔫") || line.includes("Gatling") || line.includes("Người da đỏ") || /mất \d+ HP|đấu súng|bắn nhầm/i.test(line)) return "text-[#d4844a]";
  return "text-amber-200/70";
}

function logAnimation(line: string): string {
  if (line.includes("THẮNG") || line.includes("chiến thắng")) return "animate-log-victory";
  if (line.includes("bị loại") || line.includes("chết") || line.includes("💀")) return "animate-log-elimination";
  if (line.includes("Trượt!") || line.includes("đỡ được") || line.includes("để né Người da đỏ") || line.includes("kiểm tra Thùng rượu")) return "animate-log-defense";
  if (line.includes("Bia") || line.includes("hồi máu") || line.includes("❤️")) return "animate-log-heal";
  if (/b\u1eafn nh\u1ea7m .+ph\u1ea3i b\u1ecf h\u1ebft b\u00e0i tr\u00ean tay/i.test(line)) return "animate-log-discard";
  if (line.includes("Bang!") || line.includes("🔫") || line.includes("Gatling") || line.includes("Người da đỏ") || /mất \d+ HP|đấu súng|bắn nhầm/i.test(line)) return "animate-log-attack";
  if (line.includes("lấy 1 lá từ")) return "animate-log-transfer";
  if (line.includes("trang bị")) return "animate-log-equipment";
  if (line.includes("rút ") || line.includes("xáo lại")) return "animate-log-draw";
  if (/bỏ \d+ lá|bỏ hết bài|buộc .+ bỏ 1 lá/.test(line)) return "animate-log-discard";
  if (line.startsWith("Đến lượt ")) return "animate-log-turn";
  if (/Ho\u1ea3ng lo\u1ea1n!|Cat Balou/.test(line)) return "animate-log-card";
  return "";
}

/** Chỉ theo dõi dòng mới khi người chơi đang ở cuối nhật ký, không cuộn cả trang. */
export default function GameLogPanel({ log, roomId }: Props) {
  const reducedMotion = useReducedMotionPreference();
  const [open, setOpen] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  const [hasNew, setHasNew] = useState(false);
  const previousRoomId = useRef(roomId);
  const previousLogLength = useRef(log.length);
  const previousScrollLogLength = useRef(log.length);
  const [newEntries, setNewEntries] = useState<ReadonlyMap<number, number>>(new Map());
  const newEntriesExpiry = useRef(new Map<number, number>());
  const newEntryDelays = useRef(new Map<number, number>());
  const newEntriesTimer = useRef<number | undefined>(undefined);
  const panelId = useId();

  const scheduleEntryCleanup = useCallback(function scheduleNextEntryCleanup() {
    window.clearTimeout(newEntriesTimer.current);
    const nextExpiry = Math.min(...newEntriesExpiry.current.values());
    if (!Number.isFinite(nextExpiry)) return;
    newEntriesTimer.current = window.setTimeout(() => {
      const now = performance.now();
      for (const [index, expiry] of newEntriesExpiry.current) {
        if (expiry <= now) {
          newEntriesExpiry.current.delete(index);
          newEntryDelays.current.delete(index);
        }
      }
      setNewEntries(new Map(newEntryDelays.current));
      scheduleNextEntryCleanup();
    }, Math.max(0, nextExpiry - performance.now()));
  }, []);

  useLayoutEffect(() => {
    if (roomId !== previousRoomId.current) {
      previousRoomId.current = roomId;
      previousLogLength.current = log.length;
      previousScrollLogLength.current = log.length;
      newEntriesExpiry.current.clear();
      newEntryDelays.current.clear();
      setNewEntries(new Map());
      setHasNew(false);
      following.current = true;
      window.clearTimeout(newEntriesTimer.current);
      return;
    }
    const previousLength = previousLogLength.current;
    previousLogLength.current = log.length;
    if (log.length < previousLength) {
      newEntriesExpiry.current.clear();
      newEntryDelays.current.clear();
      setNewEntries(new Map());
      previousScrollLogLength.current = log.length;
      following.current = true;
      setHasNew(false);
      window.clearTimeout(newEntriesTimer.current);
      return;
    }
    if (log.length === previousLength) return;
    const now = performance.now();
    for (let index = previousLength; index < log.length; index++) {
      const delay = reducedMotion ? 0 : Math.min(index - previousLength, MAX_LOG_STAGGERED_ENTRIES - 1) * LOG_ENTRY_STAGGER_MS;
      newEntryDelays.current.set(index, delay);
      newEntriesExpiry.current.set(index, now + (reducedMotion ? 1 : 360 + delay));
    }
    setNewEntries(new Map(newEntryDelays.current));
    scheduleEntryCleanup();
  }, [log.length, roomId, reducedMotion, scheduleEntryCleanup]);
  useLayoutEffect(() => {
    if (!reducedMotion || !newEntriesExpiry.current.size) return;
    const reducedExpiry = performance.now() + 1;
    for (const [index, expiry] of newEntriesExpiry.current) {
      newEntriesExpiry.current.set(index, Math.min(expiry, reducedExpiry));
    }
    scheduleEntryCleanup();
  }, [reducedMotion, scheduleEntryCleanup]);
  useEffect(() => () => {
    window.clearTimeout(newEntriesTimer.current);
    newEntriesExpiry.current.clear();
    newEntryDelays.current.clear();
  }, []);

  useLayoutEffect(() => {
    const logChanged = previousScrollLogLength.current !== log.length;
    previousScrollLogLength.current = log.length;
    if (!open) {
      if (logChanged) setHasNew(true);
      return;
    }
    if (following.current) listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    else if (logChanged) setHasNew(true);
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
        className="w-full flex items-center justify-between px-3 py-2 text-[11px] uppercase tracking-widest text-amber-500/70 hover:bg-amber-900/15 active:scale-[0.995] focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400 transition-colors font-medium"
      >
        <span>📜 Nhật ký {log.length > 0 && <span className="text-amber-600/80 normal-case">(<AnimatedNumber value={log.length} durationMs={220} />)</span>}</span>
        <span className="flex items-center gap-2">
          {!open && hasNew && <span key={log.length} className="animate-game-action-enter rounded-sm border border-amber-500/50 bg-amber-800/40 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-amber-200">MỚI</span>}
          <span aria-hidden="true" className={`inline-block text-amber-700/60 transition-transform duration-200 ${open ? "rotate-0" : "-rotate-90"}`}>⌄</span>
        </span>
      </button>
      <div aria-hidden={!open} className={`bang-log-panel ${open ? "is-open" : ""}`}>
        <div className="min-h-0 overflow-hidden">
        {open && hasNew && <button key={log.length} type="button" aria-live="polite" onClick={() => {
          following.current = true;
          setHasNew(false);
          listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
        }} className="animate-game-action-enter mx-3 mb-2 rounded-sm border border-amber-700/40 bg-amber-900/50 px-3 py-2 text-xs text-amber-200 hover:bg-amber-800/70 transition-colors">Có diễn biến mới · Xem mới nhất</button>}
        <div id={panelId} ref={listRef} aria-label="Nhật ký trận đấu" tabIndex={open ? 0 : -1}
          onScroll={(event) => {
            const element = event.currentTarget;
            following.current = element.scrollHeight - element.scrollTop - element.clientHeight < 32;
            if (following.current) setHasNew(false);
          }} className="bang-log-list max-h-36 overflow-y-auto scroll-smooth px-3 pb-2 space-y-0.5 focus-visible:outline focus-visible:outline-amber-400 [mask-image:linear-gradient(to_bottom,transparent_0%,black_18%,black_100%)]">
          {log.length === 0 && <p className="text-amber-900/40 text-xs py-1 italic">Chưa có gì xảy ra…</p>}
          {log.map((line, i) => (
            <p key={i} style={newEntries.has(i) ? { animationDelay: `${reducedMotion ? 0 : newEntries.get(i)}ms` } : undefined} className={`text-[11px] leading-snug ${newEntries.has(i) ? `animate-log-entry ${logAnimation(line)}` : ""} ${logColor(line)}`}>{line}</p>
          ))}
        </div>
        </div>
      </div>
    </div>
  );
}
