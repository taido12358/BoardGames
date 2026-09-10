import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import GameDetails from "./GameDetails";
import { useGameStore } from "../platform/gameStore";
import { GameRoomHubProvider, type GameRoomHubActions } from "../platform/GameRoomHubContext";
import { vaybatMetadata } from "../games/vaybat/metadata";
import { bangMetadata } from "../games/bang/metadata";
import { oanQuanMetadata } from "../games/oanquan/metadata";
import { zodiacRaceMetadata } from "../games/zodiacrace/metadata";
import type { EngineInfo, RoomDto, RoomSummaryDto } from "../platform/types";

const hubActions: GameRoomHubActions = {
  joinRoom: vi.fn(),
  makeMove: vi.fn(),
  leaveRoom: vi.fn(),
  subscribeLobby: vi.fn(),
  unsubscribeLobby: vi.fn(),
  sendChatMessage: vi.fn(),
  announceRematch: vi.fn(),
};

function engineFor(gameKey: string): EngineInfo {
  const byKey: Record<string, EngineInfo> = {
    vaybat: { key: "vaybat", displayName: vaybatMetadata.title, minPlayers: 2, maxPlayers: 2 },
    bang: { key: "bang", displayName: bangMetadata.title, minPlayers: 4, maxPlayers: 8 },
    oanquan: { key: "oanquan", displayName: oanQuanMetadata.title, minPlayers: 2, maxPlayers: 2 },
    zodiacrace: { key: "zodiacrace", displayName: zodiacRaceMetadata.title, minPlayers: 2, maxPlayers: 6 },
  };
  return byKey[gameKey];
}

/** Class nền artwork thật của khối minh hoạ đầu trang — xem accent trong ARTWORK_BG (platform/artworkTheme.ts). */
function artworkClassFor(title: string): string {
  const el = screen.getByLabelText(`Hình minh hoạ ${title}`);
  return el.parentElement!.className;
}

function renderDetails(gameKey: string, room?: RoomSummaryDto) {
  useGameStore.setState({
    engines: [engineFor("vaybat"), engineFor("bang"), engineFor("oanquan"), engineFor("zodiacrace")],
    enginesLoading: false,
    enginesError: "",
    rooms: room ? [room] : [],
    playerName: "Người chơi Test",
    error: "",
    fetchEngines: vi.fn(),
    fetchRooms: vi.fn(),
    createRoom: vi.fn(async () => ({ id: "new-room-1" }) as RoomDto),
    cancelRoom: vi.fn(async () => true),
    quickMatch: vi.fn(async () => ({ id: "qm-room-1" }) as RoomDto),
    setError: vi.fn(),
  });

  return render(
    <MemoryRouter initialEntries={[`/games/${gameKey}`]}>
      <GameRoomHubProvider value={hubActions}>
        <Routes>
          <Route path="/games/:gameKey" element={<GameDetails />} />
          <Route path="/games/:gameKey/room/:roomId" element={<div>room</div>} />
        </Routes>
      </GameRoomHubProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useGameStore.setState({ engines: [], enginesLoading: false, enginesError: "", rooms: [], error: "" });
});

describe("GameDetails — nền artwork đúng accent (regression cho bug đã sửa 2026-09-11)", () => {
  // Bug thật: GameDetails.tsx từng tự khai ARTWORK_BG riêng, thiếu "folk"/"zodiac" — 2 game
  // này mất hẳn class nền (rơi về "undefined" trong className) dù không crash gì. Test dưới
  // render THẬT component (không chỉ kiểm tra hằng số như artworkTheme.test.ts) để bắt được
  // đúng dạng lỗi đã xảy ra.
  it.each([
    ["vaybat", vaybatMetadata.title],
    ["bang", bangMetadata.title],
    ["oanquan", oanQuanMetadata.title],
    ["zodiacrace", zodiacRaceMetadata.title],
  ])("game %s có class nền artwork hợp lệ (không rỗng/undefined)", (gameKey, title) => {
    renderDetails(gameKey);
    const className = artworkClassFor(title);
    expect(className).toContain("bg-[radial-gradient");
    expect(className).not.toContain("undefined");
  });
});

describe("GameDetails — chuyển tab hướng dẫn (GameInstructions, chưa từng có test riêng)", () => {
  // Bang dùng ĐỦ CẢ 6 kind hiện có (text/roles/flow/distanceDemo/cards/characters) — click qua
  // từng tab xác nhận GameInstructions.tsx render đúng cho mọi kind mà không crash, thay vì chỉ
  // để 3 game kia (chỉ dùng text/flow) che khuất các renderer ít dùng hơn (RolesSection/
  // CardsSection/CharactersSection/DistanceDemoSection) không bao giờ được test tới.
  // Dùng text CỐ ĐỊNH của từng renderer (không phải dữ liệu game, dễ trùng lặp giữa các mục —
  // vd tên vai trò/nhân vật thường được nhắc lại ở nhiều chỗ) để khớp CHÍNH XÁC 1 phần tử.
  it.each([
    ["VAI TRÒ", "GIỮ BÍ MẬT"],
    ["LƯỢT CHƠI", "Bắt đầu lượt"],
    ["KHOẢNG CÁCH & TẦM BẮN", "CÓ THỂ BẮN"],
    ["LÁ BÀI", "Súng Gatling"],
    ["NHÂN VẬT", "Thông tin nhân vật LUÔN công khai"],
    ["CHIẾN THẮNG", "Kẻ phản bội thắng"],
  ])("tab %s render được nội dung tương ứng không crash", async (tabLabel, expectedText) => {
    const user = userEvent.setup();
    renderDetails("bang");

    await user.click(screen.getByRole("tab", { name: tabLabel }));

    expect(screen.getByText(new RegExp(expectedText))).toBeInTheDocument();
  });
});

describe("GameDetails — hiển thị cơ bản", () => {
  it("hiện đúng tên/mô tả/số người chơi từ metadata", () => {
    renderDetails("zodiacrace");
    expect(screen.getByText(zodiacRaceMetadata.title)).toBeInTheDocument();
    expect(screen.getByText(zodiacRaceMetadata.subtitle)).toBeInTheDocument();
    expect(screen.getByText("2–6 người")).toBeInTheDocument();
  });

  it("hiện thông báo không tìm thấy khi gameKey không khớp engine nào", () => {
    renderDetails("khong-ton-tai");
    expect(screen.getByText("Không tìm thấy trò chơi này.")).toBeInTheDocument();
  });

  it("hiện đúng phòng đang chờ và ẩn nút HUỶ nếu không phải phòng của mình", () => {
    renderDetails("vaybat", {
      id: "r1", gameKey: "vaybat", status: "Waiting", createdAt: "2026-01-01T00:00:00Z",
      seatCount: 2, seats: [{ displayName: "An", connected: true, lastSeenAt: null }, { displayName: null, connected: false, lastSeenAt: null }],
      isMine: false,
    });
    expect(screen.getByText("Phòng của An")).toBeInTheDocument();
    expect(screen.queryByText("HUỶ")).not.toBeInTheDocument();
  });
});

describe("GameDetails — tạo phòng / tìm trận nhanh", () => {
  it("bấm TẠO PHÒNG gọi createRoom với đúng gameKey", async () => {
    const user = userEvent.setup();
    renderDetails("zodiacrace");

    await user.click(screen.getByText("➕ TẠO PHÒNG"));

    expect(useGameStore.getState().createRoom).toHaveBeenCalledWith("zodiacrace", {});
  });

  it("bấm TÌM TRẬN NHANH gọi quickMatch với đúng gameKey", async () => {
    const user = userEvent.setup();
    renderDetails("bang");

    await user.click(screen.getByText("⚡ TÌM TRẬN NHANH"));

    expect(useGameStore.getState().quickMatch).toHaveBeenCalledWith("bang");
  });

  it("bấm HUỶ trên phòng của mình gọi cancelRoom với đúng roomId", async () => {
    const user = userEvent.setup();
    renderDetails("vaybat", {
      id: "r1", gameKey: "vaybat", status: "Waiting", createdAt: "2026-01-01T00:00:00Z",
      seatCount: 2, seats: [{ displayName: "Tôi", connected: true, lastSeenAt: null }, { displayName: null, connected: false, lastSeenAt: null }],
      isMine: true,
    });

    await user.click(screen.getByText("HUỶ"));

    expect(useGameStore.getState().cancelRoom).toHaveBeenCalledWith("r1");
  });
});
