import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
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
      role: "Outlaw",
      roleDisplay: "Kẻ ngoài vòng pháp luật",
      hand: [card("c1", "bang"), card("c2", "missed"), card("c3", "beer"), card("c4", "duel")], // 4 lá, vượt hp=2 -> overflow=2
      weapon: "Colt .45",
      weaponRange: 1,
    },
    ...overrides,
  };
}

describe("BangBoard — phản hồi và hồi máu", () => {
  it("không có bài phòng thủ thì giải thích rõ và không tự chịu đòn", () => {
    const state = myTurnState();
    state.phase = "awaitingResponse";
    state.pendingResponse = { kind: "duel", fromPlayerId: "p1", targetIds: ["p0"], itsYourTurn: true };
    state.you!.hand = [card("beer-only", "beer")];
    setRoom(state);
    const makeMove = vi.fn();
    render(<BangBoard makeMove={makeMove} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);
    expect(screen.getByRole("status")).toHaveTextContent("Bạn không có Bang! để đỡ");
    expect(screen.getByRole("button", { name: "Bia" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Chịu đòn (−1 máu)" })).toBeEnabled();
    expect(makeMove).not.toHaveBeenCalled();
  });
  it("đủ số bài bỏ thì khóa lá còn lại, vẫn cho đổi lựa chọn", async () => {
    setRoom(myTurnState());
    render(<BangBoard makeMove={vi.fn()} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);
    await userEvent.click(screen.getByRole("button", { name: "KẾT THÚC LƯỢT" }));
    const bang = screen.getByRole("button", { name: "Bang!" });
    const beer = screen.getByRole("button", { name: "Bia" });
    await userEvent.click(bang);
    await userEvent.click(beer);
    expect(bang).toHaveAttribute("aria-pressed", "true");
    expect(beer).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Đấu súng" })).toBeDisabled();
    await userEvent.click(beer);
    expect(beer).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Đấu súng" })).toBeEnabled();
  });
  it("Escape hủy chọn mục tiêu mà không gửi lá bài", async () => {
    setRoom(myTurnState());
    const makeMove = vi.fn();
    render(<BangBoard makeMove={makeMove} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Đấu súng" }));
    expect(screen.getByText("🎯 Đang dùng Đấu súng")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByText("🎯 Đang dùng Đấu súng")).not.toBeInTheDocument();
    expect(makeMove).not.toHaveBeenCalled();
  });
  it("chọn lá nhắm mục tiêu nhắc tên lá và số người hợp lệ trước khi gửi", async () => {
    setRoom(myTurnState());
    const makeMove = vi.fn();
    render(<BangBoard makeMove={makeMove} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Đấu súng" }));
    expect(screen.getByRole("status")).toHaveTextContent("Đang dùng Đấu súng");
    expect(screen.getByRole("status")).toHaveTextContent("1 mục tiêu hợp lệ");
    expect(makeMove).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Hủy" }));
    expect(screen.queryByText("Đang dùng Đấu súng")).not.toBeInTheDocument();
  });
  it("hết lượt bắn vô hiệu Bang! nhưng vẫn cho dùng lá khác", () => {
    const state = myTurnState();
    state.you!.canFire = false;
    setRoom(state);
    render(<BangBoard makeMove={vi.fn()} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);
    expect(screen.getByRole("button", { name: "Bang!" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Bang!" })).toHaveAttribute("title", "Bang! — Bạn đã dùng lượt bắn này.");
    expect(screen.getByRole("button", { name: "Bia" })).toBeEnabled();
    expect(screen.getByText(/Bạn đã dùng lượt bắn/)).toBeInTheDocument();
  });
  it("server chuyển lượt sẽ hủy chọn bỏ bài và hiển thị người đang chơi", async () => {
    const initial = myTurnState();
    setRoom(initial);
    const makeMove = vi.fn();
    render(<BangBoard makeMove={makeMove} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);
    await userEvent.click(screen.getByRole("button", { name: "KẾT THÚC LƯỢT" }));
    await userEvent.click(screen.getByRole("button", { name: "Bia" }));
    expect(screen.getByRole("button", { name: "Xác nhận bỏ bài" })).toBeInTheDocument();
    act(() => setRoom({ ...initial, currentPlayerId: "p1", turnNumber: 2 }));
    expect(screen.queryByRole("button", { name: "Xác nhận bỏ bài" })).not.toBeInTheDocument();
    expect(screen.getByText(/Đang chờ Bình chơi bài/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bia" })).toBeDisabled();
    expect(makeMove).not.toHaveBeenCalled();
  });

  it("người bị loại được giải thích trạng thái theo dõi", () => {
    const state = myTurnState();
    state.players[0].alive = false;
    state.players[0].hp = 0;
    state.currentPlayerId = "p1";
    setRoom(state);
    render(<BangBoard makeMove={vi.fn()} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);
    expect(screen.getByText(/Bạn đã bị loại. Bạn có thể tiếp tục theo dõi/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bia" })).toBeDisabled();
  });

  it("đấu súng chỉ bật Bang!, không hiện Thùng rượu hay cho dùng Bia", async () => {
    const state = myTurnState();
    state.phase = "awaitingResponse";
    state.players[0].equipment = ["Thùng rượu"];
    state.pendingResponse = { kind: "duel", fromPlayerId: "p1", targetIds: ["p0"], itsYourTurn: true };
    setRoom(state);
    const makeMove = vi.fn();
    render(<BangBoard makeMove={makeMove} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);
    expect(screen.getByRole("button", { name: "Bang!" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Bia" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Trượt!" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Thử Thùng/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Chịu đòn (−1 máu)" }));
    expect(makeMove).toHaveBeenCalledWith("room-1", { type: "RESPOND" });
  });

  it("khi đang chờ đối thủ phản hồi không báo nhầm là lượt mình dù currentPlayerId vẫn là mình", () => {
    const state = myTurnState({
      phase: "awaitingResponse",
      pendingResponse: { kind: "bang", fromPlayerId: "p0", targetIds: ["p1"], itsYourTurn: false },
    });
    setRoom(state);
    render(<BangBoard makeMove={vi.fn()} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);

    expect(screen.getByText("⏳ Đang chờ Bình phản hồi")).toBeInTheDocument();
    expect(screen.queryByText("⚡ ĐẾN LƯỢT BẠN")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bia" })).toBeDisabled();
  });

  it("khi chính mình là người phải phản hồi thì tiêu đề báo đúng hành động", () => {
    const state = myTurnState({
      phase: "awaitingResponse",
      pendingResponse: { kind: "bang", fromPlayerId: "p1", targetIds: ["p0"], itsYourTurn: true },
    });
    setRoom(state);
    render(<BangBoard makeMove={vi.fn()} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);

    expect(screen.getByText("⚠️ ĐẾN LƯỢT BẠN PHẢN HỒI")).toBeInTheDocument();
    expect(screen.queryByText("⚡ ĐẾN LƯỢT BẠN")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Trượt!" })).toBeEnabled();
  });

  it("payload enum PascalCase cũ vẫn mở bài đúng lượt và đúng loại phản hồi", () => {
    const actionState = myTurnState({
      you: { id: "p0", role: "Outlaw", roleDisplay: "x", hand: [card("beer-1", "beer")], weapon: "Colt .45", weaponRange: 1 },
    });
    actionState.phase = "Action" as unknown as BangViewerState["phase"];
    setRoom(actionState);
    const { unmount } = render(<BangBoard makeMove={vi.fn()} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);
    expect(screen.getByRole("button", { name: "Bia" })).toBeEnabled();
    unmount();

    const responseState = myTurnState({
      phase: "awaitingResponse",
      pendingResponse: { kind: "bang", fromPlayerId: "p1", targetIds: ["p0"], itsYourTurn: true },
    });
    responseState.phase = "AwaitingResponse" as unknown as BangViewerState["phase"];
    responseState.pendingResponse!.kind = "Bang" as unknown as NonNullable<BangViewerState["pendingResponse"]>["kind"];
    setRoom(responseState);
    render(<BangBoard makeMove={vi.fn()} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);
    expect(screen.getByRole("button", { name: "Trượt!" })).toBeEnabled();
    expect(screen.getByText("⚠️ ĐẾN LƯỢT BẠN PHẢN HỒI")).toBeInTheDocument();
  });

  it("máu đầy không cho dùng Bia", () => {
    const state = myTurnState();
    state.players[0].hp = state.players[0].maxHp;
    setRoom(state);
    render(<BangBoard makeMove={vi.fn()} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);
    expect(screen.getByRole("button", { name: "Bia" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Bia" })).toHaveAttribute("title", "Bia — Máu của bạn đang đầy.");
  });

  it("đến lượt và có bài hợp lệ thì bấm bài gửi nước đi ngay", async () => {
    const state = myTurnState({
      you: { id: "p0", role: "Outlaw", roleDisplay: "x", hand: [card("beer-1", "beer")], weapon: "Colt .45", weaponRange: 1 },
    });
    setRoom(state);
    const makeMove = vi.fn();
    render(<BangBoard makeMove={makeMove} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);

    const beer = screen.getByRole("button", { name: "Bia" });
    expect(beer).toBeEnabled();
    await userEvent.click(beer);
    expect(makeMove).toHaveBeenCalledWith("room-1", { type: "PLAY_CARD", cardId: "beer-1" });
  });

  it("liệt kê lý do khi không có lá nào dùng được trong lượt", () => {
    const state = myTurnState({
      players: [makePlayer({ id: "p0", hp: 4 }), makePlayer({ id: "p1", name: "Bình", seatIndex: 1, inRange: false })],
      you: {
        id: "p0", role: "Outlaw", roleDisplay: "x", weapon: "Colt .45", weaponRange: 1,
        hand: [card("bang-1", "bang"), card("beer-1", "beer"), card("missed-1", "missed")],
      },
    });
    setRoom(state);
    render(<BangBoard makeMove={vi.fn()} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);

    expect(screen.getByText("Chưa có lá nào dùng được:")).toBeInTheDocument();
    expect(screen.getByText("Bang!: Không có mục tiêu hợp lệ.")).toBeInTheDocument();
    expect(screen.getByText("Bia: Máu của bạn đang đầy.")).toBeInTheDocument();
    expect(screen.getByText("Trượt!: Trượt! chỉ dùng khi phản hồi, trừ nhân vật Calamity.")).toBeInTheDocument();
  });
});

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

    expect(screen.getByText(/Tay bài 4 lá, 2 HP — cần bỏ 2 lá \(0\/2\)/)).toBeInTheDocument();
    expect(screen.getByText("Chỉ tính lá trên tay; vũ khí và trang bị không tính.")).toBeInTheDocument();
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
    expect(screen.getByRole("button", { name: "Bia" })).toBeDisabled(); // lá thứ 3 — vượt overflow=2
    expect(screen.getByRole("button", { name: "Bia" })).toHaveAttribute("title", "Bia — Đã chọn đủ số lá cần bỏ.");

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

    expect(screen.queryByText(/Tay bài .* cần bỏ/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "KẾT THÚC LƯỢT" })).toBeInTheDocument();
    expect(makeMove).not.toHaveBeenCalled();
  });

  it("không vào chế độ bỏ bài khi tay bài chưa vượt giới hạn", async () => {
    const user = userEvent.setup();
    setRoom(myTurnState({ you: { id: "p0", role: "Outlaw", roleDisplay: "x", hand: [card("c1", "bang")], weapon: "Colt .45", weaponRange: 1 } }));
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

  it("bạn thắng → hiện huy hiệu BẠN THẮNG (van-de.md §46)", () => {
    setRoom(myTurnState({ phase: "finished", winner: "outlaw" })); // you.role="outlaw" trong myTurnState
    render(<BangBoard makeMove={vi.fn()} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);

    expect(screen.getByText("🎉 BẠN THẮNG")).toBeInTheDocument();
  });

  it("bạn thua → hiện huy hiệu BẠN THUA (van-de.md §46)", () => {
    setRoom(myTurnState({ phase: "finished", winner: "sheriff" })); // you.role="outlaw" != sheriff
    render(<BangBoard makeMove={vi.fn()} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);

    expect(screen.getByText("💀 BẠN THUA")).toBeInTheDocument();
  });

  it("khán giả không thấy huy hiệu thắng/thua (trung lập)", () => {
    setRoom(myTurnState({ phase: "finished", winner: "outlaw", you: null }));
    render(<BangBoard makeMove={vi.fn()} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);

    expect(screen.queryByText(/BẠN THẮNG|BẠN THUA/)).not.toBeInTheDocument();
  });
});

describe("BangBoard — muzzle flash khi bắn Bang! (van-de.md §46)", () => {
  it("chưa có phát súng nào → không hiện hiệu ứng", () => {
    setRoom(myTurnState());
    render(<BangBoard makeMove={vi.fn()} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);

    expect(screen.queryByTestId("muzzle-flash")).not.toBeInTheDocument();
  });

  it("gameLog vừa thêm dòng bắn Bang! → hiện hiệu ứng muzzle flash", () => {
    const initial = myTurnState();
    setRoom(initial);
    render(<BangBoard makeMove={vi.fn()} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);

    act(() => {
      setRoom({ ...initial, gameLog: ["An sử dụng Bang! lên Bình."] });
    });

    expect(screen.getByTestId("muzzle-flash")).toBeInTheDocument();
  });
});
