import type { PendingResponseKind } from "../types";

interface Props {
  myTurn: boolean;
  awaitingResponse: boolean;
  selectingTarget: boolean;
  targetCardName?: string;
  targetCount?: number;
  canEndTurn: boolean;
  onEndTurn: () => void;
  onRespondPass: () => void;
  onCancelTarget: () => void;
  hasBarrel?: boolean;
  responseKind?: PendingResponseKind;
  isCalamity?: boolean;
  waitingFor?: string;
  discarding?: boolean;
  discardOverflow?: number;
  discardSelectedCount?: number;
  onConfirmDiscard?: () => void;
  onCancelDiscard?: () => void;
}

const btnBase = "shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all border";

/** Thanh hành động — chỉ hiện nút hợp lệ theo giai đoạn hiện tại. */
export default function ActionBar({
  myTurn, awaitingResponse, selectingTarget, canEndTurn, onEndTurn, onRespondPass, onCancelTarget,
  hasBarrel = false,
  targetCardName, targetCount,
  responseKind, isCalamity = false, waitingFor,
  discarding, discardOverflow = 0, discardSelectedCount = 0, onConfirmDiscard, onCancelDiscard,
}: Props) {
  if (discarding) {
    const done = discardSelectedCount === discardOverflow;
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-red-950/50 border border-red-700/50 px-3 py-2.5 shadow-md">
        <span className="text-red-300 text-sm font-medium">
          🗑 Vượt giới hạn tay bài — chọn {discardOverflow} lá để bỏ ({discardSelectedCount}/{discardOverflow})
        </span>
        <div className="flex gap-2 shrink-0">
          <button onClick={onCancelDiscard} className={`${btnBase} border-amber-950/80 bg-[#140e0b]/90 text-amber-700/70 shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)] hover:border-amber-700/60 hover:bg-[#1a120d] hover:text-amber-400`}>
            Hủy
          </button>
          <button
            onClick={onConfirmDiscard}
            disabled={!done}
            className={`${btnBase} bg-amber-700 hover:bg-amber-600 border-amber-600 text-white disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            Xác nhận bỏ bài
          </button>
        </div>
      </div>
    );
  }

  if (selectingTarget) {
    return (
      <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-950/60 border border-amber-600/50 px-3 py-2.5 shadow-md">
        <div className="text-sm text-amber-300">
          <p className="font-semibold">🎯 {targetCardName ? `Đang dùng ${targetCardName}` : "CHỌN MỤC TIÊU"}</p>
          <p className="mt-1 text-xs text-amber-200/80">{targetCount === 0 ? "Không còn mục tiêu hợp lệ. Hãy hủy và chọn lá khác." : `Nhấn vào người chơi được tô sáng${targetCount !== undefined ? ` (${targetCount} mục tiêu hợp lệ)` : ""}.`}</p>
        </div>
        <button onClick={onCancelTarget} className={`${btnBase} border-amber-950/80 bg-[#140e0b]/90 text-amber-700/70 shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)] hover:border-amber-700/60 hover:bg-[#1a120d] hover:text-amber-400`}>
          Hủy
        </button>
      </div>
    );
  }

  if (awaitingResponse) {
    const needsBang = responseKind === "duel" || responseKind === "indians";
    const defense = needsBang
      ? (isCalamity && responseKind === "duel" ? "Bang! hoặc Trượt!" : "Bang!")
      : (isCalamity ? "Trượt! hoặc Bang!" : "Trượt!");
    return (
      <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-red-950/50 border border-red-700/50 px-3 py-2.5 shadow-md">
        <span className="text-red-300 text-sm font-medium">
          {`⚠️ Chọn ${defense} để đỡ. ${hasBarrel ? "Thùng rượu có thể giúp né đòn." : "Bỏ qua sẽ tự mất 1 máu."}`}
        </span>
        <button onClick={onRespondPass} className={`${btnBase} ${hasBarrel ? "bg-amber-900/60 hover:bg-amber-800 border-amber-700/60 text-amber-200 hover:text-amber-100" : "bg-slate-800 hover:bg-red-900 border-red-800/60 text-red-300 hover:text-red-200"}`}>
          {hasBarrel ? "🛢 Thử Thùng rượu (trượt: −1 máu)" : "Chịu đòn (−1 máu)"}
        </button>
      </div>
    );
  }

  if (myTurn) {
    return (
      <div className="relative overflow-hidden flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-700/40 bg-amber-950/30 px-3 py-2.5 shadow-md">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
        <span className="text-amber-300 text-sm font-semibold flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />Đến lượt bạn — chọn bài để đánh</span>
        <button
          onClick={onEndTurn}
          disabled={!canEndTurn}
          className="relative shrink-0 rounded-lg bg-gradient-to-b from-amber-600 via-amber-700 to-amber-800 px-3 py-1.5 text-sm font-semibold text-amber-50 border-t border-amber-400/50 shadow-[0_3px_0_0_#451a03,0_6px_12px_rgba(0,0,0,0.4)] transition-all hover:brightness-110 active:top-[2px] active:shadow-[0_1px_0_0_#451a03] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          KẾT THÚC LƯỢT
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-gradient-to-r from-amber-950/30 to-slate-900/40 border border-amber-900/30 px-3 py-2.5 flex items-center justify-center gap-2 text-amber-400/60 text-sm">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500/60 animate-pulse shrink-0" />
      {waitingFor ? `Đang chờ ${waitingFor}${responseKind ? " phản hồi" : " chơi bài"}…` : "Chờ đối thủ…"}
    </div>
  );
}
