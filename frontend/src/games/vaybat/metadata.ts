import type { GameMetadata, InstructionSection } from "../../platform/gameLibraryTypes";

export const vaybatMetadata: GameMetadata = {
  gameKey: "vaybat",
  title: "VÂY BẮT TRÊN ĐỒ THỊ",
  subtitle: "Đấu trí trên đồ thị",
  description:
    "Ba quân săn đuổi một kẻ trốn chạy trên mạng lưới đồ thị. Đấu trí bằng vị trí và nước đi — không có yếu tố may rủi.",
  minPlayers: 2,
  maxPlayers: 2,
  duration: "10–20 phút",
  difficulty: "Trung bình",
  difficultyStars: 3,
  // Không thêm nhãn số người chơi vào category — chip số người chơi đã tự sinh từ
  // minPlayers/maxPlayers ở GameLibrary, thêm ở đây sẽ tạo chip trùng nhãn (2 nguồn
  // khác id nhưng cùng label "2 người").
  category: ["Chiến thuật", "Đồ thị"],
  accent: "graph",
  emblem: "🕸️",
};

export const vaybatInstructions: InstructionSection[] = [
  {
    id: "overview",
    label: "TỔNG QUAN",
    kind: "text",
    paragraphs: [
      "Vây Bắt Trên Đồ Thị là một game chiến thuật thuần tuý cho 2 người, chơi trên một đồ thị phi hướng (các đỉnh nối nhau bằng cạnh).",
      "Phe Đỏ gồm 3 quân đi săn, phe Trắng chỉ có 1 quân trốn chạy. Mỗi lượt, một quân di chuyển sang đỉnh kề còn trống — không có xúc xắc, không có bài, chỉ có vị trí và nước đi.",
    ],
  },
  {
    id: "how-to-play",
    label: "CÁCH CHƠI",
    kind: "text",
    paragraphs: [
      "Mỗi lượt, người chơi chọn MỘT quân của phe mình và di chuyển nó tới một đỉnh liền kề đang còn trống. Không được nhảy cóc qua nhiều cạnh, không được đi vào ô đã có quân khác.",
      "Phe Đỏ đi trước. Sau mỗi nước đi của Đỏ, tới lượt Trắng, rồi quay lại Đỏ — luân phiên cho tới khi ván kết thúc.",
    ],
    bullets: [
      "Chạm vào quân của bạn để chọn nó — các ô đi được sẽ sáng lên.",
      "Chạm vào ô sáng để di chuyển quân tới đó.",
      "Có thể kéo-thả quân thay vì chạm hai lần.",
    ],
  },
  {
    id: "turn-flow",
    label: "LƯỢT CHƠI",
    kind: "flow",
    steps: ["Đến lượt", "Chọn 1 quân của phe mình", "Chọn đỉnh kề còn trống", "Xác nhận nước đi", "Đổi lượt"],
  },
  {
    id: "victory",
    label: "CHIẾN THẮNG",
    kind: "text",
    paragraphs: [
      "Phe Đỏ thắng nếu vây được quân Trắng tới mức nó không còn nước đi hợp lệ nào (hết đường thoát).",
      "Phe Trắng thắng nếu sống sót qua đủ số lượt Đỏ quy định khi tạo phòng, hoặc nếu đến lượt Đỏ mà phe Đỏ không còn quân nào đi được (Đỏ bị kẹt).",
    ],
  },
];
