import type { GameMetadata } from "./gameLibraryTypes";

/**
 * Nền "artwork" theo accent — không có ảnh thật, dùng gradient CSS để tránh vi phạm bản quyền
 * artwork gốc. Dùng CHUNG giữa GameCard.tsx (thư viện) và GameDetails.tsx (trang chi tiết) —
 * trước đây mỗi file tự khai báo bản sao riêng (kiểu `Record<string, string>` lỏng, không bắt
 * buộc đủ key), dẫn tới lệch nhau thật: GameDetails.tsx thiếu "folk" (từ lúc thêm Ô Ăn Quan)
 * và "zodiac" (từ lúc thêm Đua Xe Hoàng Đạo) — trang chi tiết 2 game đó mất hẳn nền artwork mà
 * không ai để ý vì không lỗi biên dịch. Gom về đây, ép kiểu đúng `Record<GameMetadata["accent"],
 * string>` để TypeScript BẮT BUỘC đủ key mỗi khi thêm accent mới — game 5 nếu quên sẽ báo lỗi
 * build ngay thay vì âm thầm mất artwork.
 */
export const ARTWORK_BG: Record<GameMetadata["accent"], string> = {
  western: "bg-[radial-gradient(circle_at_30%_20%,#5c3a1e_0%,#2b1a0d_60%,#160d06_100%)]",
  graph: "bg-[radial-gradient(circle_at_30%_20%,#2a3a6b_0%,#151d3d_60%,#0a0e1f_100%)]",
  folk: "bg-[radial-gradient(circle_at_30%_20%,#3d4a2a_0%,#232b17_60%,#12160b_100%)]",
  zodiac: "bg-[radial-gradient(circle_at_30%_20%,#4a2a6b_0%,#251740_60%,#120a20_100%)]",
  default: "bg-[radial-gradient(circle_at_30%_20%,#334155_0%,#1e293b_60%,#0f172a_100%)]",
};
