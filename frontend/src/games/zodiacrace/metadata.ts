import type { GameMetadata, InstructionSection } from "../../platform/gameLibraryTypes";

export const zodiacRaceMetadata: GameMetadata = {
  gameKey: "zodiacrace",
  title: "ĐUA XE HOÀNG ĐẠO",
  subtitle: "Đua xúc xắc may rủi, 2-6 người",
  description:
    "Đổ xúc xắc, đua xe về đích trước tất cả đối thủ trên đường đua 12 cung hoàng đạo. Luật cực đơn giản, không có yếu tố chiến thuật — phù hợp chơi nhanh, nhiều người cùng lúc.",
  minPlayers: 2,
  maxPlayers: 6,
  duration: "5–10 phút",
  difficulty: "Dễ",
  difficultyStars: 1,
  category: ["May rủi", "Gia đình"],
  accent: "zodiac",
  emblem: "🎲",
};

export const zodiacRaceInstructions: InstructionSection[] = [
  {
    id: "overview",
    label: "TỔNG QUAN",
    kind: "text",
    paragraphs: [
      "Đua Xe Hoàng Đạo là trò đua xúc xắc đơn giản cho 2-6 người, mỗi người một chiếc xe mang biểu tượng một cung hoàng đạo.",
      "Ai đưa xe về đích (cuối đường đua) trước tiên thì thắng ngay lập tức — không cần đợi những người khác.",
    ],
  },
  {
    id: "how-to-play",
    label: "CÁCH CHƠI",
    kind: "text",
    paragraphs: [
      "Đến lượt, bấm \"Đổ xúc xắc\" — xe của bạn tự động tiến về phía trước đúng số ô xúc xắc hiện ra (1-6).",
      "Không cần đổ đúng số để về đích: nếu số ô còn lại ít hơn số xúc xắc, xe vẫn về đích luôn (không bị \"dội ngược\" như một số trò đua cổ điển).",
    ],
    bullets: [
      "Dừng đúng vào một ô có thùng hàng (📦) sẽ được +1 điểm thu thập (chỉ để vui, không ảnh hưởng thắng/thua ở luật hiện tại).",
      "Đi NGANG QUA một ô thùng hàng mà không dừng lại thì không được tính điểm.",
      "Mất kết nối quá lâu đúng lượt của bạn: hệ thống tự động đổ xúc xắc thay bạn để ván không bị treo.",
    ],
  },
  {
    id: "turn-flow",
    label: "LƯỢT CHƠI",
    kind: "flow",
    steps: ["Đến lượt", "Bấm đổ xúc xắc", "Xe tự động tiến", "Nhận điểm nếu dừng đúng ô thùng hàng", "Đổi lượt cho người tiếp theo"],
  },
  {
    id: "victory",
    label: "KẾT THÚC & THẮNG THUA",
    kind: "text",
    paragraphs: ["Ván đấu kết thúc NGAY khi có một xe về tới đích — người đó thắng, không cần chơi tiếp cho những người còn lại."],
  },
];
