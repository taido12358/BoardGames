// Kiểu dữ liệu GENERIC cho Thư viện trò chơi — không gắn với game cụ thể nào, để thêm
// game mới chỉ cần thêm 1 file metadata.ts + instructions.ts trong games/<ten>/, không
// phải sửa GameLibrary/GameDetails/GameCard.

export interface GameMetadata {
  gameKey: string;
  title: string;
  subtitle: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  duration: string;
  /** Nhãn độ khó hiển thị, vd "Trung bình". */
  difficulty: string;
  /** 1-5 sao, dùng để vẽ ★★★☆☆. */
  difficultyStars: number;
  category: string[];
  /** Token theme để GameCard/GameDetails chọn màu/hoạ tiết riêng cho game (không phải ảnh thật — xem ARTWORK). */
  accent: "graph" | "western" | "default";
  /** Icon lớn dùng làm "artwork" (không có asset ảnh thật — dùng icon + CSS, không vi phạm bản quyền). */
  emblem: string;
}

/** Một khối nội dung trong tab hướng dẫn — nhiều "kind" để hỗ trợ trực quan hoá, không chỉ văn bản thuần. */
export type InstructionSection =
  | { id: string; label: string; kind: "text"; paragraphs: string[]; bullets?: string[] }
  | { id: string; label: string; kind: "roles"; roles: RoleGuideEntry[] }
  | { id: string; label: string; kind: "cards"; cards: CardGuideEntry[] }
  | { id: string; label: string; kind: "characters"; characters: CharacterGuideEntry[] }
  | { id: string; label: string; kind: "distanceDemo"; paragraphs: string[] }
  | { id: string; label: string; kind: "flow"; steps: string[] };

export interface RoleGuideEntry {
  name: string;
  icon: string;
  goal: string;
  hidden: boolean;
}

export interface CardGuideEntry {
  name: string;
  icon: string;
  type: string;
  effect: string;
  example?: string;
}

export interface CharacterGuideEntry {
  name: string;
  hp: number;
  ability: string;
  abilityName: string;
}
