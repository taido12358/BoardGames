import type { GameMetadata, InstructionSection } from "../../platform/gameLibraryTypes";

export const oanQuanMetadata: GameMetadata = {
  gameKey: "oanquan",
  title: "Ô ĂN QUAN",
  subtitle: "Trò chơi dân gian Việt Nam",
  description:
    "Rải quân vòng quanh bàn cờ 12 ô, ăn quân đối phương và tranh 2 ô Quan. Trò chơi dân gian quen thuộc — không có yếu tố may rủi, chỉ có tính toán đường đi.",
  minPlayers: 2,
  maxPlayers: 2,
  duration: "10–25 phút",
  difficulty: "Trung bình",
  difficultyStars: 3,
  category: ["Dân gian", "Chiến thuật"],
  accent: "folk",
  emblem: "🌾",
};

export const oanQuanInstructions: InstructionSection[] = [
  {
    id: "overview",
    label: "TỔNG QUAN",
    kind: "text",
    paragraphs: [
      "Ô Ăn Quan là trò chơi dân gian Việt Nam cho 2 người, chơi trên bàn cờ 12 ô xếp thành một vòng: 2 ô Quan lớn ở hai đầu và 10 ô Dân nhỏ (5 ô mỗi bên) ở giữa.",
      "Lúc bắt đầu, mỗi ô Dân có 5 quân, mỗi ô Quan có 10 quân. Mục tiêu là ăn được càng nhiều quân càng tốt — ai có nhiều quân hơn khi ván kết thúc thì thắng.",
    ],
  },
  {
    id: "how-to-play",
    label: "CÁCH CHƠI",
    kind: "text",
    paragraphs: [
      "Đến lượt, chọn MỘT ô Dân của mình (còn quân) rồi chọn chiều rải (trái hoặc phải). Toàn bộ quân trong ô đó được rải mỗi ô 1 quân, lần lượt vòng quanh bàn cờ theo chiều đã chọn — kể cả rải qua ô Quan.",
      "Nếu quân cuối cùng rơi vào một ô đã có quân sẵn (kể cả của đối phương), bạn \"bốc\" hết ô đó lên và rải tiếp tục theo cùng chiều — trừ khi ô đó là ô Quan (rải trúng ô Quan luôn kết thúc lượt ngay, không bốc tiếp).",
      "Nếu quân cuối cùng rơi vào một ô đang trống, lượt kết thúc — nhưng nếu ô NGAY SAU đó có quân, bạn ăn trọn số quân trong ô đó (kể cả nếu đó là một ô Quan còn nguyên quân — phần thưởng lớn nhất!).",
    ],
    bullets: [
      "Chạm vào một ô Dân của mình để chọn, rồi chọn chiều rải trái/phải.",
      "Không thể chọn ô Quan để rải, và không thể chọn ô của đối phương.",
      "Nếu cả 5 ô Dân của bạn đều trống khi đến lượt, bạn phải \"vay\" 5 quân từ số quân đã ăn được (rải mỗi ô Dân 1 quân) — 5 quân đó bị trừ vào điểm cuối ván.",
    ],
  },
  {
    id: "turn-flow",
    label: "LƯỢT CHƠI",
    kind: "flow",
    steps: ["Đến lượt", "Chọn 1 ô Dân của mình", "Chọn chiều rải", "Rải quân (có thể bốc tiếp nhiều lần)", "Ăn quân nếu đủ điều kiện", "Đổi lượt"],
  },
  {
    id: "victory",
    label: "KẾT THÚC & THẮNG THUA",
    kind: "text",
    paragraphs: [
      "Ván đấu kết thúc khi CẢ HAI ô Quan đều đã bị ăn hết quân gốc. Lúc đó, quân còn lại trên các ô Dân thuộc về người chủ ô đó, cộng vào điểm đã ăn được của họ.",
      "Ai có tổng số quân nhiều hơn thì thắng. Nếu bằng điểm nhau, ván đấu hoà.",
    ],
  },
];
