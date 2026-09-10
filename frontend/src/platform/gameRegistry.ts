// Sổ đăng ký metadata/hướng dẫn hiển thị THEO gameKey — nguồn danh sách game thật sự vẫn
// là backend (/api/games/engines qua gameStore.engines), file này chỉ cung cấp phần
// TRÌNH BÀY (artwork/mô tả/hướng dẫn) cho từng gameKey đã biết. Thêm game mới = thêm
// 1 dòng ở đây trỏ tới games/<ten>/metadata.ts — không phải sửa GameLibrary/GameDetails.
import type { ComponentType } from "react";
import type { EngineInfo } from "./types";
import type { CreateOptionsFormProps, GameMetadata, InstructionSection } from "./gameLibraryTypes";
import { vaybatMetadata, vaybatInstructions } from "../games/vaybat/metadata";
import { bangMetadata, bangInstructions } from "../games/bang/metadata";
import { oanQuanMetadata, oanQuanInstructions } from "../games/oanquan/metadata";
import VayBatCreateOptions from "../games/vaybat/CreateOptions";
import BangCreateOptions from "../games/bang/CreateOptions";

interface GameRegistryEntry {
  metadata: GameMetadata;
  instructions: InstructionSection[];
  /** UI tuỳ chọn khi tạo phòng — GameDetails chỉ render nếu có, không hard-code theo gameKey. */
  CreateOptionsForm?: ComponentType<CreateOptionsFormProps>;
}

const REGISTRY: Record<string, GameRegistryEntry> = {
  vaybat: { metadata: vaybatMetadata, instructions: vaybatInstructions, CreateOptionsForm: VayBatCreateOptions },
  bang: { metadata: bangMetadata, instructions: bangInstructions, CreateOptionsForm: BangCreateOptions },
  oanquan: { metadata: oanQuanMetadata, instructions: oanQuanInstructions }, // không có tuỳ chọn tạo phòng riêng
};

/** Game backend hỗ trợ nhưng CHƯA có metadata trình bày riêng — vẫn hiển thị được, chỉ không có artwork/hướng dẫn chi tiết. */
function fallbackMetadata(engine: EngineInfo): GameMetadata {
  return {
    gameKey: engine.key,
    title: engine.displayName.toUpperCase(),
    subtitle: "Trò chơi mới",
    description: "Trò chơi này chưa có mô tả chi tiết.",
    minPlayers: engine.minPlayers,
    maxPlayers: engine.maxPlayers,
    duration: "—",
    difficulty: "Chưa rõ",
    difficultyStars: 0,
    category: [],
    accent: "default",
    emblem: "🎲",
  };
}

/** Metadata trình bày cho một gameKey — dùng engine (từ backend) làm nguồn số liệu chính xác (min/max người chơi…), chỉ lấp phần còn lại từ registry tĩnh nếu có. */
export function getGameMetadata(engine: EngineInfo): GameMetadata {
  const entry = REGISTRY[engine.key];
  if (!entry) return fallbackMetadata(engine);
  // Ưu tiên số liệu backend (nguồn sự thật) cho min/max người chơi, phần còn lại lấy từ metadata tĩnh.
  return { ...entry.metadata, minPlayers: engine.minPlayers, maxPlayers: engine.maxPlayers };
}

export function getGameInstructions(gameKey: string): InstructionSection[] {
  return REGISTRY[gameKey]?.instructions ?? [];
}

/** Component UI tuỳ chọn tạo phòng của game này, nếu có đăng ký — GameDetails render có điều kiện. */
export function getCreateOptionsForm(gameKey: string): ComponentType<CreateOptionsFormProps> | undefined {
  return REGISTRY[gameKey]?.CreateOptionsForm;
}
