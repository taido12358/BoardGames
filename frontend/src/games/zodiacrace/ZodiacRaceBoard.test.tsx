import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ZodiacRaceBoard from "./ZodiacRaceBoard";
import { useGameStore } from "../../platform/gameStore";
import type { GameState, MapDef } from "./types";
import type { RoomDto, SeatSlotDto } from "../../platform/types";

const MAP: MapDef = { trackLength: 10, crateTiles: [3, 6] };

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    started: true,
    positions: [0, 0],
    cratesCollected: [0, 0],
    turn: 0,
    lastRoll: null,
    winner: null,
    ...overrides,
  };
}

function setRoom(state: GameState, mySide: string | null = "P0", status: "Waiting" | "Playing" = "Playing") {
  const seats: SeatSlotDto[] = state.positions.map((_, i) => ({ displayName: `Người ${i}`, connected: true, lastSeenAt: null }));
  const room: RoomDto<MapDef, GameState> = {
    id: "room-1",
    gameKey: "zodiacrace",
    status,
    winner: state.winner,
    map: MAP,
    state,
    createdAt: "2026-01-01T00:00:00Z",
    seatCount: seats.length,
    seats,
    ownerUserId: "u1",
    mySide,
    isMine: true,
  };
  useGameStore.setState({ room: room as unknown as RoomDto, mySide, error: "", connectionState: "connected" });
}

beforeEach(() => {
  useGameStore.setState({ room: null, mySide: null, error: "", connectionState: "connected" });
});

describe("ZodiacRaceBoard — phòng chờ", () => {
  it("hiện màn ĐANG CHỜ khi state.started=false", () => {
    setRoom(makeState({ started: false, positions: [], cratesCollected: [] }), null, "Waiting");
    render(<ZodiacRaceBoard makeMove={vi.fn()} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);

    expect(screen.getByText(/ĐANG CHỜ/)).toBeInTheDocument();
  });
});

describe("ZodiacRaceBoard — đang đua", () => {
  it("tới lượt mình thì bấm ĐỔ XÚC XẮC gửi đúng move ROLL", async () => {
    const user = userEvent.setup();
    setRoom(makeState({ turn: 0 }), "P0");
    const makeMove = vi.fn();
    render(<ZodiacRaceBoard makeMove={makeMove} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);

    await user.click(screen.getByRole("button", { name: /ĐỔ XÚC XẮC/ }));

    expect(makeMove).toHaveBeenCalledWith("room-1", { type: "ROLL" });
  });

  it("chưa tới lượt mình thì không hiện nút đổ xúc xắc", () => {
    setRoom(makeState({ turn: 1 }), "P0");
    render(<ZodiacRaceBoard makeMove={vi.fn()} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);

    expect(screen.queryByRole("button", { name: /ĐỔ XÚC XẮC/ })).not.toBeInTheDocument();
  });

  it("khán giả không thấy nút đổ xúc xắc dù đúng lượt seat 0", () => {
    setRoom(makeState({ turn: 0 }), null);
    render(<ZodiacRaceBoard makeMove={vi.fn()} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);

    expect(screen.queryByRole("button", { name: /ĐỔ XÚC XẮC/ })).not.toBeInTheDocument();
    expect(screen.getByText(/đang xem/)).toBeInTheDocument();
  });

  it("hiện đúng giá trị xúc xắc vừa đổ", () => {
    // Dùng track ngắn (trackLength=10 ở MAP) nên số ô 0-10 trùng số mặt xúc xắc 1-6 — phải
    // giới hạn selector vào đúng span hiển thị xúc xắc, không tìm text "5" toàn trang.
    setRoom(makeState({ lastRoll: 5 }), "P0");
    render(<ZodiacRaceBoard makeMove={vi.fn()} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);

    expect(screen.getByText("5", { selector: "span.font-bold" })).toBeInTheDocument();
  });

  it("hiện đúng vị trí và số thùng hàng đã thu thập của từng người chơi", () => {
    setRoom(makeState({ positions: [4, 7], cratesCollected: [1, 0] }), "P0");
    render(<ZodiacRaceBoard makeMove={vi.fn()} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);

    expect(screen.getByText("Ô 4/10 · 📦 1")).toBeInTheDocument();
    expect(screen.getByText("Ô 7/10 · 📦 0")).toBeInTheDocument();
  });
});

describe("ZodiacRaceBoard — kết thúc ván", () => {
  it("hiện đúng người thắng và nút CHƠI LẠI cho người từng chơi", () => {
    setRoom(makeState({ positions: [10, 6], winner: "P0" }), "P0");
    render(<ZodiacRaceBoard makeMove={vi.fn()} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);

    expect(screen.getByText(/VỀ ĐÍCH ĐẦU TIÊN/)).toBeInTheDocument();
    expect(screen.getByText("🔄 CHƠI LẠI")).toBeInTheDocument();
  });

  it("khán giả không thấy nút CHƠI LẠI", () => {
    setRoom(makeState({ positions: [10, 6], winner: "P0" }), null);
    render(<ZodiacRaceBoard makeMove={vi.fn()} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);

    expect(screen.getByText(/VỀ ĐÍCH ĐẦU TIÊN/)).toBeInTheDocument();
    expect(screen.queryByText("🔄 CHƠI LẠI")).not.toBeInTheDocument();
  });

  it("không còn hiện nút đổ xúc xắc sau khi ván kết thúc", () => {
    setRoom(makeState({ positions: [10, 6], winner: "P0" }), "P1");
    render(<ZodiacRaceBoard makeMove={vi.fn()} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);

    expect(screen.queryByRole("button", { name: /ĐỔ XÚC XẮC/ })).not.toBeInTheDocument();
  });
});
