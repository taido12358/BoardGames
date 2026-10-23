interface Props {
  myTurn: boolean;
  awaitingResponse: boolean;
  selectingTarget: boolean;
  canEndTurn: boolean;
  onEndTurn: () => void;
  onRespondPass: () => void;
  onCancelTarget: () => void;
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
  discarding, discardOverflow = 0, discardSelectedCount = 0, onConfirmDiscard, onCancelDiscard,
}: Props) {
  if (discarding) {
    const done = discardSelectedCount === discardOverflow;
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl bg-red-950/50 border border-red-700/50 px-3 py-2.5 shadow-md">
        <span className="text-red-300 text-sm font-medium">
          🗑 Vượt giới hạn tay bài — chọn {discardOverflow} lá để bỏ ({discardSelectedCount}/{discardOverflow})
        </span>
        <div className="flex gap-2 shrink-0">
          <button onClick={onCancelDiscard} className={`${btnBase} bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-300`}>
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
      <div className="flex items-center justify-between gap-2 rounded-xl bg-amber-950/60 border border-amber-600/50 px-3 py-2.5 shadow-md">
        <span className="text-amber-300 text-sm font-semibold">🎯 CHỌN MỤC TIÊU — nhấn vào người chơi</span>
        <button onClick={onCancelTarget} className={`${btnBase} bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-300`}>
          Hủy
        </button>
      </div>
    );
  }

  if (awaitingResponse) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl bg-red-950/50 border border-red-700/50 px-3 py-2.5 shadow-md">
        <span className="text-red-300 text-sm font-medium">⚠️ Chọn lá bài để đỡ hoặc bỏ qua</span>
        <button onClick={onRespondPass} className={`${btnBase} bg-slate-800 hover:bg-red-900 border-red-800/60 text-red-300 hover:text-red-200`}>
          Chịu đòn
        </button>
      </div>
    );
  }

  if (myTurn) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl bg-emerald-950/50 border border-emerald-700/50 px-3 py-2.5 shadow-md">
        <span className="text-emerald-300 text-sm font-semibold">⚡ Đến lượt bạn — chọn bài để đánh</span>
        <button
          onClick={onEndTurn}
          disabled={!canEndTurn}
          className={`${btnBase} bg-amber-700 hover:bg-amber-600 active:bg-amber-800 border-amber-500 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-sm`}
        >
          KẾT THÚC LƯỢT
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-slate-900/60 border border-slate-700/50 px-3 py-2.5 text-center text-slate-500 text-sm">
      ⏳ Chờ đối thủ…
    </div>
  );
}
