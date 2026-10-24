interface Props {
  loading: boolean;
  error: string;
  onRetry: () => void;
}

/** Giữ danh sách đã có khi mạng lỗi, đồng thời báo rõ dữ liệu có thể đã cũ. */
export default function LobbyLoadStatus({ loading, error, onRetry }: Props) {
  if (loading) return <p role="status" className="rounded-sm border border-amber-900/30 bg-[#1a1208]/40 px-3 py-3 text-sm text-amber-700/60 italic">Đang tải danh sách phòng…</p>;
  if (!error) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-amber-800/50 bg-amber-950/40 p-3">
      <p role="alert" className="text-sm text-amber-200">{error}</p>
      <button type="button" onClick={onRetry} className="rounded-sm bg-amber-800 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700">Tải lại phòng</button>
    </div>
  );
}
