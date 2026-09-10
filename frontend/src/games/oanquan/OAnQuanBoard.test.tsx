import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OAnQuanBoard from "./OAnQuanBoard";
import { useGameStore } from "../../platform/gameStore";
import type { GameState, Side } from "./types";
import type { RoomDto, SeatSlotDto } from "../../platform/types";

const seat = (name: string): SeatSlotDto => ({ displayName: name, connected: true, lastSeenAt: null });

function fullState(overrides: Partial<GameState> = {}): GameState {
  const pits = Array.from({ length: 12 }, (_, i) => (i === 0 || i === 6 ? 10 : 5));
  return { pits, quanCaptured: [false, false], scores: [0, 0], turn: "P0", winner: null, ...overrides };
}

function setRoom(state: GameState, mySide: Side | null, status: RoomDto["status"] = "Playing") {
  const room: RoomDto<Record<string, never>, GameState> = {
    id: "room-1",
    gameKey: "oanquan",
    status,
    winner: state.winner,
    map: {},
    state,
    createdAt: "2026-01-01T00:00:00Z",
    seatCount: 2,
    seats: [seat("An"), seat("Bình")],
    ownerUserId: "u1",
    mySide,
    isMine: true,
  };
  useGameStore.setState({ room: room as unknown as RoomDto, mySide, error: "", connectionState: "connected" });
}

beforeEach(() => {
  useGameStore.setState({ room: null, mySide: null, error: "", connectionState: "connected" });
});

describe("OAnQuanBoard", () => {
  it("không hiện nút chọn chiều trước khi chọn ô nào", () => {
    setRoom(fullState(), "P0");
    render(<OAnQuanBoard makeMove={vi.fn()} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);

    expect(screen.queryByText("← Trái")).not.toBeInTheDocument();
    expect(screen.queryByText("Phải →")).not.toBeInTheDocument();
  });

  it("chọn 1 ô dân của mình (đến lượt) rồi bấm 'Phải' gửi đúng move cw", async () => {
    const user = userEvent.setup();
    setRoom(fullState(), "P0");
    const makeMove = vi.fn();
    render(<OAnQuanBoard makeMove={makeMove} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);

    await user.click(screen.getByRole("button", { name: "Ô dân số 3, 5 quân" }));
    expect(screen.getByText("Phải →")).toBeInTheDocument();

    await user.click(screen.getByText("Phải →"));

    expect(makeMove).toHaveBeenCalledWith("room-1", { pitIndex: 3, direction: "cw" });
  });

  it("bấm 'Trái' gửi đúng move ccw cho ô dân của P0", async () => {
    const user = userEvent.setup();
    setRoom(fullState(), "P0");
    const makeMove = vi.fn();
    render(<OAnQuanBoard makeMove={makeMove} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);

    await user.click(screen.getByRole("button", { name: "Ô dân số 3, 5 quân" }));
    await user.click(screen.getByText("← Trái"));

    expect(makeMove).toHaveBeenCalledWith("room-1", { pitIndex: 3, direction: "ccw" });
  });

  it("chiều 'Phải' của P1 ánh xạ ngược thành ccw (hàng P1 xếp ngược quanh bàn)", async () => {
    const user = userEvent.setup();
    setRoom(fullState({ turn: "P1" }), "P1");
    const makeMove = vi.fn();
    render(<OAnQuanBoard makeMove={makeMove} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);

    await user.click(screen.getByRole("button", { name: "Ô dân số 9, 5 quân" }));
    await user.click(screen.getByText("Phải →"));

    expect(makeMove).toHaveBeenCalledWith("room-1", { pitIndex: 9, direction: "ccw" });
  });

  it("không cho chọn ô của đối phương", async () => {
    const user = userEvent.setup();
    setRoom(fullState(), "P0"); // đến lượt P0
    render(<OAnQuanBoard makeMove={vi.fn()} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);

    // Ô dân của P1 (index 8) phải bị disable khi đang là lượt/góc nhìn của P0.
    const opponentPit = screen.getByRole("button", { name: "Ô dân số 8, 5 quân" });
    expect(opponentPit).toBeDisabled();

    await user.click(opponentPit);
    expect(screen.queryByText("Phải →")).not.toBeInTheDocument();
  });

  it("không cho chọn khi chưa đến lượt mình", () => {
    setRoom(fullState({ turn: "P1" }), "P0"); // P0 xem nhưng đang là lượt P1
    render(<OAnQuanBoard makeMove={vi.fn()} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);

    expect(screen.getByRole("button", { name: "Ô dân số 3, 5 quân" })).toBeDisabled();
    expect(screen.getByText("⏳ Chờ đối thủ đi…")).toBeInTheDocument();
  });

  it("hiện kết quả và nút CHƠI LẠI khi ván đã kết thúc", () => {
    setRoom(fullState({ winner: "P0", scores: [35, 25] }), "P0", "Finished");
    render(<OAnQuanBoard makeMove={vi.fn()} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);

    expect(screen.getByText(/PHÍA TRÊN THẮNG/)).toBeInTheDocument();
    expect(screen.getByText("🔄 CHƠI LẠI")).toBeInTheDocument();
  });

  it("khán giả (mySide null) không thấy nút CHƠI LẠI dù ván đã kết thúc", () => {
    setRoom(fullState({ winner: "DRAW", scores: [30, 30] }), null, "Finished");
    render(<OAnQuanBoard makeMove={vi.fn()} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);

    expect(screen.getByText(/HOÀ/)).toBeInTheDocument();
    expect(screen.queryByText("🔄 CHƠI LẠI")).not.toBeInTheDocument();
  });
});
