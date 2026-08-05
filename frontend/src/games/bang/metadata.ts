import type {
  CardGuideEntry, CharacterGuideEntry, GameMetadata, InstructionSection, RoleGuideEntry,
} from "../../platform/gameLibraryTypes";

export const bangMetadata: GameMetadata = {
  gameKey: "bang",
  title: "BANG!",
  subtitle: "Đấu súng miền Viễn Tây",
  description:
    "Một cuộc đấu súng nơi đồng minh và kẻ thù không phải lúc nào cũng rõ ràng. Rút súng, giữ bí mật, sống sót.",
  minPlayers: 4,
  maxPlayers: 8,
  duration: "15–30 phút",
  difficulty: "Trung bình",
  difficultyStars: 3,
  category: ["Ẩn vai trò", "Đấu bài", "Chiến thuật"],
  accent: "western",
  emblem: "🤠",
};

const roles: RoleGuideEntry[] = [
  { name: "Cảnh sát trưởng", icon: "⭐", hidden: false, goal: "Loại bỏ toàn bộ Kẻ ngoài vòng pháp luật và Kẻ phản bội." },
  { name: "Phó cảnh sát", icon: "🥈", hidden: true, goal: "Bảo vệ Cảnh sát trưởng và giúp loại Kẻ ngoài vòng pháp luật/Kẻ phản bội." },
  { name: "Kẻ ngoài vòng pháp luật", icon: "🏴", hidden: true, goal: "Hạ gục Cảnh sát trưởng." },
  { name: "Kẻ phản bội", icon: "🎭", hidden: true, goal: "Trở thành người CUỐI CÙNG còn sống sót — kể cả phải phản cả hai phe kia." },
];

const characters: CharacterGuideEntry[] = [
  { name: "Wyatt", hp: 4, abilityName: "Xạ thủ xa", ability: "Tầm bắn vũ khí của Wyatt luôn +1." },
  { name: "Calamity", hp: 4, abilityName: "Ứng biến", ability: "Có thể dùng lá Bang! như Trượt! và dùng lá Trượt! như Bang!." },
  { name: "Billy", hp: 4, abilityName: "Không giới hạn", ability: "Bang! của Billy bắn được mọi khoảng cách, không cần trong tầm." },
  { name: "Jesse", hp: 4, abilityName: "Giữ súng chắc", ability: "Vũ khí của Jesse không thể bị Hoảng loạn!/Cat Balou lấy hay bỏ." },
  { name: "Doc", hp: 4, abilityName: "Lang y", ability: "Uống Bia hồi 2 HP thay vì 1." },
  { name: "Jack", hp: 4, abilityName: "Nhanh tay", ability: "Đầu lượt rút 3 lá thay vì 2." },
  { name: "Rose", hp: 4, abilityName: "Bền bỉ", ability: "Khi HP ≤ một nửa HP tối đa lúc đầu lượt, rút thêm 1 lá." },
  { name: "Morgan", hp: 4, abilityName: "Né đòn", ability: "Người khác luôn nhìn Morgan xa hơn 1 khoảng cách khi nhắm bắn." },
];

const cards: CardGuideEntry[] = [
  { name: "Bang!", icon: "🔫", type: "Tấn công", effect: "Tấn công một người chơi trong tầm bắn, gây 1 sát thương nếu không bị đỡ.", example: "Chỉ đánh được 1 lá Bang! mỗi lượt, trừ khi trang bị Volcanic." },
  { name: "Trượt!", icon: "🛡", type: "Phòng thủ", effect: "Chặn một phát Bang! (hoặc Súng Gatling/Người da đỏ! tuỳ trường hợp) nhắm vào bạn." },
  { name: "Bia", icon: "🍺", type: "Hồi máu", effect: "Hồi 1 HP (không vượt quá HP tối đa)." },
  { name: "Súng Gatling", icon: "💥", type: "Tấn công diện rộng", effect: "Tấn công TẤT CẢ người chơi khác cùng lúc, không tính khoảng cách." },
  { name: "Đấu súng", icon: "⚔️", type: "Tấn công", effect: "Thách một người chơi bất kỳ đấu súng — hai bên luân phiên đánh Bang!, ai không đánh được sẽ mất 1 HP.", example: "Không tính khoảng cách/tầm bắn." },
  { name: "Hoảng loạn!", icon: "😱", type: "Hành động", effect: "Lấy ngẫu nhiên 1 lá từ người chơi cách bạn tối đa 1 khoảng cách." },
  { name: "Cat Balou", icon: "🎯", type: "Hành động", effect: "Buộc một người chơi bất kỳ bỏ ngẫu nhiên 1 lá — không giới hạn khoảng cách." },
  { name: "Xe ngựa", icon: "🚃", type: "Hành động", effect: "Rút thêm 2 lá bài." },
  { name: "Wells Fargo", icon: "💰", type: "Hành động", effect: "Rút thêm 3 lá bài." },
  { name: "Người da đỏ!", icon: "🏹", type: "Tấn công diện rộng", effect: "Mọi người chơi khác phải bỏ 1 lá Bang! hoặc mất 1 HP." },
  { name: "Volcanic / Schofield / Remington", icon: "🔫", type: "Vũ khí", effect: "Trang bị vũ khí mới, thay thế Cattleman mặc định. Tầm bắn lần lượt 1 / 2 / 3.", example: "Volcanic còn cho phép đánh nhiều Bang! trong một lượt." },
  { name: "Mustang", icon: "🐎", type: "Trang bị", effect: "Người khác nhìn bạn xa hơn 1 khoảng cách khi nhắm bắn — khó bị Bang! trúng hơn." },
  { name: "Thùng rượu", icon: "🛢", type: "Trang bị", effect: "Khi bị nhắm Bang!, tự động rút 1 lá kiểm tra — nếu ra lá ♥ thì coi như đỡ được." },
];

export const bangInstructions: InstructionSection[] = [
  {
    id: "overview",
    label: "TỔNG QUAN",
    kind: "text",
    paragraphs: [
      "BANG! là một game bài đấu súng miền Viễn Tây cho 4-8 người chơi. Mỗi người nhận một vai trò BÍ MẬT (trừ Cảnh sát trưởng luôn công khai) và một nhân vật với khả năng riêng.",
      "Bạn sẽ không bao giờ biết chắc ai là đồng minh cho tới khi họ hành động — hoặc cho tới khi họ bị loại.",
    ],
  },
  {
    id: "roles",
    label: "VAI TRÒ",
    kind: "roles",
    roles,
  },
  {
    id: "how-to-start",
    label: "CÁCH CHƠI",
    kind: "text",
    paragraphs: [
      "Khi phòng đủ người, server tự động: chia vai trò bí mật cho từng người, chia ngẫu nhiên một nhân vật (không trùng) cho mỗi người, chia bài đầu ván (số lá bằng đúng HP tối đa của bạn), và xác định người đi trước.",
      "Cảnh sát trưởng luôn là người đi lượt ĐẦU TIÊN và có thêm 1 HP tối đa so với các vai trò khác.",
    ],
  },
  {
    id: "turn-flow",
    label: "LƯỢT CHƠI",
    kind: "flow",
    steps: ["Bắt đầu lượt", "Rút bài (2 lá, tuỳ nhân vật có thể khác)", "Đánh bài / Tấn công / Phòng thủ", "Bỏ bớt bài nếu vượt giới hạn tay bài", "Kết thúc lượt"],
  },
  {
    id: "distance",
    label: "KHOẢNG CÁCH & TẦM BẮN",
    kind: "distanceDemo",
    paragraphs: [
      "Người chơi ngồi quanh một bàn tròn. Khoảng cách giữa hai người được tính theo số ghế gần nhất theo một trong hai chiều quanh bàn — người bị loại không tính vào khoảng cách.",
      "Bạn chỉ có thể dùng Bang! lên mục tiêu nằm TRONG tầm bắn của vũ khí đang trang bị. Một số khả năng nhân vật hoặc trang bị (Mustang, Wyatt, Billy…) có thể làm thay đổi khoảng cách hiệu dụng.",
    ],
  },
  {
    id: "cards",
    label: "LÁ BÀI",
    kind: "cards",
    cards,
  },
  {
    id: "characters",
    label: "NHÂN VẬT",
    kind: "characters",
    characters,
  },
  {
    id: "victory",
    label: "CHIẾN THẮNG",
    kind: "text",
    paragraphs: [
      "Cảnh sát trưởng thắng khi mọi Kẻ ngoài vòng pháp luật và Kẻ phản bội đều bị loại (chỉ còn Cảnh sát trưởng và/hoặc Phó cảnh sát sống sót).",
      "Kẻ ngoài vòng pháp luật thắng khi Cảnh sát trưởng bị hạ, MIỄN LÀ vẫn còn hơn một người sống sót (không chỉ riêng Kẻ phản bội).",
      "Kẻ phản bội thắng nếu là người DUY NHẤT còn sống sót sau khi Cảnh sát trưởng bị hạ.",
    ],
  },
];
