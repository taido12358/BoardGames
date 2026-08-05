interface Props {
  myTurn: boolean;
  awaitingResponse: boolean;
  selectingTarget: boolean;
  canEndTurn: boolean;
  onEndTurn: () => void;
  onRespondPass: () => void;
  onCancelTarget: () => void;
}

/** Thanh hành động — chỉ hiện nút hợp lệ theo giai đoạn hiện tại. */
export default function ActionBar({
  myTurn, awaitingResponse, selectingTarget, canEndTurn, onEndTurn, onRespondPass, onCancelTarget,
}: Props) {
  if (selectingTarget) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl bg-amber-900/30 border border-amber-700/50 px-3 py-2.5">
        <span className="text-amber-300 text-sm font-medium">🎯 CHỌN MỤC TIÊU — nhấn vào người chơi</span>
        <button
          onClick={onCancelTarget}
          className="shrink-0 rounded-lg bg-slate-700 hover:bg-slate-600 px-3 py-1.5 text-sm font-medium"
        >
          Hủy
        </button>
      </div>
    );
  }

  if (awaitingResponse) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl bg-red-900/30 border border-red-700/50 px-3 py-2.5">
        <span className="text-red-300 text-sm font-medium">⏳ Đến lượt bạn phản hồi — chọn lá bài hoặc bỏ qua</span>
        <button
          onClick={onRespondPass}
          className="shrink-0 rounded-lg bg-slate-700 hover:bg-slate-600 px-3 py-1.5 text-sm font-medium"
        >
          Bỏ qua (chịu sát thương)
        </button>
      </div>
    );
  }

  if (myTurn) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl bg-emerald-900/30 border border-emerald-700/50 px-3 py-2.5">
        <span className="text-emerald-300 text-sm font-medium">→ ĐẾN LƯỢT BẠN — chọn 1 lá bài để đánh</span>
        <button
          onClick={onEndTurn}
          disabled={!canEndTurn}
          className="shrink-0 rounded-lg bg-amber-700 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-1.5 text-sm font-semibold"
        >
          KẾT THÚC LƯỢT
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-slate-800/60 border border-slate-700 px-3 py-2.5 text-center text-slate-400 text-sm">
      ⏳ Chờ đối thủ đi…
    </div>
  );
}
