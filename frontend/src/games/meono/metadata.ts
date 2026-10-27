import type { GameMetadata, InstructionSection } from "../../platform/gameLibraryTypes";

export const meoNoMetadata: GameMetadata = {
  gameKey: "meono",
  title: "MÈO NỔ",
  subtitle: "Exploding Kittens",
  description:
    "Rút bài sống còn — tránh Mèo Nổ bằng mọi cách. Đánh bài gây khó dễ, Nope kẻ khác, và là người cuối cùng còn sống.",
  minPlayers: 2,
  maxPlayers: 6,
  duration: "15–30 phút",
  difficulty: "Dễ",
  difficultyStars: 2,
  category: ["Bài", "Chiến lược", "Vui nhộn"],
  accent: "kittens",
  emblem: "💣",
};

export const meoNoInstructions: InstructionSection[] = [
  {
    id: "overview",
    label: "TỔNG QUAN",
    kind: "text",
    paragraphs: [
      "Mèo Nổ là game bài loại trực tiếp cho 2–6 người. Bạn lần lượt đánh bài và rút từ bộ bài — nếu rút trúng Mèo Nổ mà không có Khuếch Tán trong tay, bạn bị loại. Người cuối cùng còn sống thắng.",
      "Các lá bài đặc biệt cho phép bạn Bỏ Lượt, Tấn Công người sau, Xem trước bộ bài, Nhờ Vả lấy bài người khác, hay Dừng Lại hiệu ứng của bất kỳ lá bài nào.",
    ],
  },
  {
    id: "cards",
    label: "CÁC LÁ BÀI",
    kind: "cards",
    cards: [
      {
        name: "💣 Mèo Nổ",
        icon: "💣",
        type: "Nguy hiểm",
        imageUrl: "/assets/games/meono/cards/exploding_kitten/0.png",
        effect: "Nếu rút lá này mà không có Khuếch Tán, bạn bị loại. Đây là lá duy nhất không thể đánh — chỉ có thể rút.",
      },
      {
        name: "🧨 Khuếch Tán",
        icon: "🧨",
        type: "Phòng thủ",
        imageUrl: "/assets/games/meono/cards/defuse/0.png",
        effect: "Vô hiệu hóa Mèo Nổ — đưa nó trở lại bộ bài ở vị trí bạn chọn. Không thể bị Nope.",
      },
      {
        name: "⏭️ Bỏ Lượt",
        icon: "⏭️",
        type: "Hành động",
        imageUrl: "/assets/games/meono/cards/skip/0.png",
        effect: "Kết thúc lượt ngay mà không cần rút bài. Nếu đang bị Attack, giảm số lần rút còn lại đi 1.",
      },
      {
        name: "⚔️ Tấn Công",
        icon: "⚔️",
        type: "Hành động",
        imageUrl: "/assets/games/meono/cards/attack/0.png",
        effect: "Kết thúc lượt không cần rút — người kế tiếp phải rút thêm 1 lần (có thể stack: Attack vào Attack gốc).",
      },
      {
        name: "🔮 Tiên Tri",
        icon: "🔮",
        type: "Thông tin",
        imageUrl: "/assets/games/meono/cards/see_the_future/0.png",
        effect: "Xem 3 lá trên cùng của bộ bài (chỉ bạn thấy, theo thứ tự từ trên xuống).",
      },
      {
        name: "🔀 Trộn Bài",
        icon: "🔀",
        type: "Hành động",
        imageUrl: "/assets/games/meono/cards/shuffle/0.png",
        effect: "Trộn ngẫu nhiên toàn bộ bài trong bộ bài (kể cả Mèo Nổ đang ẩn trong đó).",
      },
      {
        name: "🤝 Nhờ Vả",
        icon: "🤝",
        type: "Hành động",
        imageUrl: "/assets/games/meono/cards/favor/0.png",
        effect: "Chọn 1 người chơi — họ phải trao cho bạn 1 lá bài tùy họ chọn.",
      },
      {
        name: "🚫 Dừng Lại",
        icon: "🚫",
        type: "Phản đòn",
        imageUrl: "/assets/games/meono/cards/nope/0.png",
        effect: "Hủy hiệu ứng bất kỳ lá bài nào (trừ Mèo Nổ và Khuếch Tán). Có thể Nope lại Nope để phục hồi hiệu ứng.",
      },
      {
        name: "😸 Tacocat",
        icon: "😸",
        type: "Combo",
        imageUrl: "/assets/games/meono/cards/cat_card/0.png",
        effect: "5 loại mèo (Taco, Râu, Khoai, Cầu Vồng, Dưa Hấu) — đánh 2 cùng loại để lấy ngẫu nhiên 1 lá; đánh 3 để yêu cầu loại cụ thể; đánh 5 loại khác nhau để lấy từ discard.",
        example: "2× Tacocat → lấy ngẫu nhiên 1 lá từ tay người khác",
      },
      {
        name: "🐱 Mèo Râu",
        icon: "🐱",
        type: "Combo",
        imageUrl: "/assets/games/meono/cards/cat_card/1.png",
        effect: "Đánh 2 cùng loại để lấy ngẫu nhiên 1 lá; đánh 3 để yêu cầu loại cụ thể; đánh 5 loại khác nhau để lấy từ discard.",
      },
      {
        name: "🥔 Mèo Khoai",
        icon: "🥔",
        type: "Combo",
        imageUrl: "/assets/games/meono/cards/cat_card/2.png",
        effect: "Đánh 2 cùng loại để lấy ngẫu nhiên 1 lá; đánh 3 để yêu cầu loại cụ thể; đánh 5 loại khác nhau để lấy từ discard.",
      },
      {
        name: "🌈 Mèo Cầu Vồng",
        icon: "🌈",
        type: "Combo",
        imageUrl: "/assets/games/meono/cards/cat_card/3.png",
        effect: "Đánh 2 cùng loại để lấy ngẫu nhiên 1 lá; đánh 3 để yêu cầu loại cụ thể; đánh 5 loại khác nhau để lấy từ discard.",
      },
      {
        name: "🍉 Mèo Dưa Hấu",
        icon: "🍉",
        type: "Combo",
        imageUrl: "/assets/games/meono/cards/cat_card/4.png",
        effect: "Đánh 2 cùng loại để lấy ngẫu nhiên 1 lá; đánh 3 để yêu cầu loại cụ thể; đánh 5 loại khác nhau để lấy từ discard.",
      },
    ],
  },
  {
    id: "turn-flow",
    label: "LƯỢT CHƠI",
    kind: "flow",
    steps: [
      "Đến lượt bạn",
      "Đánh 0 hoặc nhiều lá bài (tùy loại)",
      "Người khác có thể Nope (hoặc Nope lại Nope)",
      "Rút 1 lá từ bộ bài",
      "Nếu rút Mèo Nổ: dùng Khuếch Tán hoặc bị loại",
      "Đổi lượt",
    ],
  },
  {
    id: "nope",
    label: "LUẬT NOPE",
    kind: "text",
    paragraphs: [
      "Ngay khi một lá bài được đánh, tất cả người chơi còn sống khác có cơ hội Nope (Dừng Lại). Nếu ai Nope, hiệu ứng bị hủy. Sau đó lại có vòng Nope mới — ai đó có thể Nope lại để phục hồi.",
      "Nope hoạt động với: Bỏ Lượt, Tấn Công, Tiên Tri, Trộn Bài, Nhờ Vả, và mọi combo Mèo. KHÔNG thể Nope Khuếch Tán hay Mèo Nổ.",
    ],
    bullets: [
      "Nhấn Nope ngay khi người khác đánh bài để hủy.",
      "Nhấn Pass để nhường (auto-pass khi hết giờ).",
      "Sau 1 Nope thành công, vòng Nope mới mở ra — ai đó có thể Nope lại để phục hồi hiệu ứng.",
    ],
  },
  {
    id: "combo",
    label: "COMBO MÈO",
    kind: "text",
    paragraphs: [
      "5 loại mèo (Taco, Râu, Khoai, Cầu Vồng, Dưa Hấu) dùng để đánh combo — không có hiệu ứng khi đánh đơn lẻ.",
    ],
    bullets: [
      "2 mèo cùng loại → lấy 1 lá ngẫu nhiên từ tay người được chỉ định.",
      "3 mèo cùng loại → yêu cầu 1 loại bài cụ thể từ người được chỉ định (nếu họ có).",
      "5 mèo khác loại → lấy bất kỳ lá bài nào từ pile bỏ.",
    ],
  },
  {
    id: "victory",
    label: "CHIẾN THẮNG",
    kind: "text",
    paragraphs: [
      "Người cuối cùng còn sống (chưa bị nổ bởi Mèo Nổ) thắng ván đó.",
      "Khi bị loại, lá Khuếch Tán trong tay bạn không có tác dụng — bạn cần dùng nó ngay khi rút trúng Mèo Nổ.",
    ],
  },
];
