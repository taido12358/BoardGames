import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BangBoard from "./BangBoard";
import { useGameStore } from "../../platform/gameStore";
import type { BangPublicPlayer, BangViewerState, Card } from "./types";
import type { RoomDto, SeatSlotDto } from "../../platform/types";

const card = (id: string, kind: Card["kind"]): Card => ({ id, kind, suit: "♠", rank: "5" });

function makePlayer(overrides: Partial<BangPublicPlayer>): BangPublicPlayer {
  return {
    id: "p0",
    name: "An",
    seatIndex: 0,
    character: "Jesse",
    abilityName: "",
    publicRole: "Vai trò ẩn",
    hp: 4,
    maxHp: 4,
    cardCount: 4,
    weapon: "Colt .45",
    weaponRange: 1,
    equipment: [],
    alive: true,
    distance: null,
    inRange: null,
    ...overrides,
  };
}

function setRoom(state: BangViewerState) {
  const seats: SeatSlotDto[] = state.players.map((p) => ({ displayName: p.name, connected: true, lastSeenAt: null }));
  const room: RoomDto<Record<string, never>, BangViewerState> = {
    id: "room-1",
    gameKey: "bang",
    status: "Playing",
    winner: state.winner,
    map: {},
    state,
    createdAt: "2026-01-01T00:00:00Z",
    seatCount: seats.length,
    seats,
    ownerUserId: "u1",
    mySide: state.you ? "P0" : null,
    isMine: true,
  };
  useGameStore.setState({ room: room as unknown as RoomDto, mySide: state.you ? "P0" : null, error: "", connectionState: "connected" });
}

/** Trạng thái tối thiểu cho 1 ván đang diễn ra, tới lượt chính người xem (p0). */
function myTurnState(overrides: Partial<BangViewerState> = {}): BangViewerState {
  const me = makePlayer({ id: "p0", hp: 2 }); // hp=2 -> giới hạn tay bài chỉ 2 lá
  const opponent = makePlayer({ id: "p1", name: "Bình", seatIndex: 1 });
  return {
    phase: "action",
    players: [me, opponent],
    currentPlayerId: "p0",
    turnNumber: 1,
    deckCount: 30,
    discardPile: [],
    pendingResponse: null,
    winner: null,
    gameLog: [],
    you: {
      id: "p0",
      role: "outlaw",
      roleDisplay: "Kẻ ngoài vòng pháp luật",
      hand: [card("c1", "bang"), card("c2", "missed"), card("c3", "beer"), card("c4", "duel")], // 4 lá, vượt hp=2 -> overflow=2
      weapon: "Colt .45",
      weaponRange: 1,
    },
    ...overrides,
  };
}

beforeEach(() => {
  useGameStore.setState({ room: null, mySide: null, error: "", connectionState: "connected" });
});

describe("BangBoard — chế độ bỏ bài khi vượt giới hạn tay bài", () => {
  it("bấm KẾT THÚC LƯỢT lúc tay bài vượt hp thì vào chế độ chọn bài để bỏ, chưa gửi move", async () => {
    const user = userEvent.setup();
    setRoom(myTurnState());
    const makeMove = vi.fn();
    render(<BangBoard makeMove={makeMove} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);

    await user.click(screen.getByRole("button", { name: "KẾT THÚC LƯỢT" }));

    expect(screen.getByText(/Vượt giới hạn tay bài — chọn 2 lá để bỏ \(0\/2\)/)).toBeInTheDocument();
    expect(makeMove).not.toHaveBeenCalled();
  });

  it("chọn đúng số lá cần bỏ rồi xác nhận gửi END_TURN kèm discardCardIds", async () => {
    const user = userEvent.setup();
    setRoom(myTurnState());
    const makeMove = vi.fn();
    render(<BangBoard makeMove={makeMove} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);

    await user.click(screen.getByRole("button", { name: "KẾT THÚC LƯỢT" }));
    await user.click(screen.getByTitle("Bang!"));
    await user.click(screen.getByTitle("Trượt!"));

    expect(screen.getByText(/\(2\/2\)/)).toBeInTheDocument();
    const confirmButton = screen.getByRole("button", { name: "Xác nhận bỏ bài" });
    expect(confirmButton).toBeEnabled();

    await user.click(confirmButton);

    expect(makeMove).toHaveBeenCalledWith("room-1", { type: "END_TURN", discardCardIds: ["c1", "c2"] });
  });

  it("nút Xác nhận bỏ bài bị disable khi chưa chọn đủ số lá", async () => {
    const user = userEvent.setup();
    setRoom(myTurnState());
    render(<BangBoard makeMove={vi.fn()} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);

    await user.click(screen.getByRole("button", { name: "KẾT THÚC LƯỢT" }));
    await user.click(screen.getByTitle("Bang!")); // mới chọn 1/2

    expect(screen.getByRole("button", { name: "Xác nhận bỏ bài" })).toBeDisabled();
  });

  it("không cho chọn quá số lá overflow cho phép", async () => {
    const user = userEvent.setup();
    setRoom(myTurnState());
    render(<BangBoard makeMove={vi.fn()} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);

    await user.click(screen.getByRole("button", { name: "KẾT THÚC LƯỢT" }));
    await user.click(screen.getByTitle("Bang!"));
    await user.click(screen.getByTitle("Trượt!"));
    await user.click(screen.getByTitle("Bia")); // lá thứ 3 — vượt overflow=2, phải bị bỏ qua

    expect(screen.getByText(/\(2\/2\)/)).toBeInTheDocument();
  });

  it("bấm Huỷ quay lại chơi bình thường, không gửi move nào", async () => {
    const user = userEvent.setup();
    setRoom(myTurnState());
    const makeMove = vi.fn();
    render(<BangBoard makeMove={makeMove} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);

    await user.click(screen.getByRole("button", { name: "KẾT THÚC LƯỢT" }));
    await user.click(screen.getByTitle("Bang!"));
    await user.click(screen.getByRole("button", { name: "Hủy" }));

    expect(screen.queryByText(/Vượt giới hạn tay bài/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "KẾT THÚC LƯỢT" })).toBeInTheDocument();
    expect(makeMove).not.toHaveBeenCalled();
  });

  it("không vào chế độ bỏ bài khi tay bài chưa vượt giới hạn", async () => {
    const user = userEvent.setup();
    setRoom(myTurnState({ you: { id: "p0", role: "outlaw", roleDisplay: "x", hand: [card("c1", "bang")], weapon: "Colt .45", weaponRange: 1 } }));
    const makeMove = vi.fn();
    render(<BangBoard makeMove={makeMove} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);

    await user.click(screen.getByRole("button", { name: "KẾT THÚC LƯỢT" }));

    expect(makeMove).toHaveBeenCalledWith("room-1", { type: "END_TURN" });
  });
});

describe("BangBoard — kết thúc ván", () => {
  it("hiện màn chiến thắng và nút CHƠI LẠI cho người từng chơi", () => {
    setRoom(myTurnState({ phase: "finished", winner: "outlaw" }));
    render(<BangBoard makeMove={vi.fn()} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);

    expect(screen.getByText(/CHIẾN THẮNG/)).toBeInTheDocument();
    expect(screen.getByText("VỀ PHÒNG CHỜ")).toBeInTheDocument();
    expect(screen.getByText("🔄 CHƠI LẠI")).toBeInTheDocument();
  });

  it("khán giả không thấy nút CHƠI LẠI", () => {
    setRoom(myTurnState({ phase: "finished", winner: "outlaw", you: null }));
    render(<BangBoard makeMove={vi.fn()} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);

    expect(screen.getByText(/CHIẾN THẮNG/)).toBeInTheDocument();
    expect(screen.queryByText("🔄 CHƠI LẠI")).not.toBeInTheDocument();
  });
});
