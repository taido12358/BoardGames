/** Hiển thị thời gian địa phương; bản ghi thiếu/hỏng không lộ chuỗi Invalid Date. */
export function formatTimestamp(iso: string | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("vi-VN", options);
}
