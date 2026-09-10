import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import VayBatBoard from "./VayBatBoard";
import { useGameStore } from "../../platform/gameStore";
import type { GameState, MapDef } from "./types";
import type { RoomDto, SeatSlotDto } from "../../platform/types";

/**
 * jsdom không triển khai hình học SVG thật (createSVGPoint/getScreenCTM/matrixTransform) —
 * mock tối giản: coi toạ độ client == toạ độ SVG (identity transform), đủ để test logic
 * chọn/tìm ô gần nhất mà không cần layout thật. Global vì SVGSVGElement không có polyfill
 * chung nào hợp lý hơn (chỉ VayBatBoard dùng, không đưa vào test-setup.ts dùng chung).
 */
beforeEach(() => {
  Object.defineProperty(SVGSVGElement.prototype, "createSVGPoint", {
    configurable: true,
    value: function () {
      const point = {
        x: 0,
        y: 0,
        matrixTransform() {
          return { x: point.x, y: point.y };
        },
      };
      return point;
    },
  });
  Object.defineProperty(SVGSVGElement.prototype, "getScreenCTM", {
    configurable: true,
    value: () => ({ inverse: () => ({}) }),
  });
  // jsdom triển khai setPointerCapture nhưng ném lỗi nếu pointerId không khớp 1 pointer đang
  // hoạt động thật (điều fireEvent giả lập không tạo ra) — ghi đè hẳn thành no-op để logic
  // chọn quân chạy hết (setSelected nằm SAU lệnh setPointerCapture trong component).
  Object.defineProperty(SVGSVGElement.prototype, "setPointerCapture", {
    configurable: true,
    value: () => {},
  });
  useGameStore.setState({ room: null, mySide: null, selected: null, error: "", connectionState: "connected" });
});

// Bàn 3 đỉnh thẳng hàng: 0 — 1 — 2. R0 ở 0, W0 ở 2, ô 1 trống (kề cả hai bên).
const MAP: MapDef = {
  nodes: [
    { id: 0, x: 10, y: 10 },
    { id: 1, x: 100, y: 10 },
    { id: 2, x: 200, y: 10 },
  ],
  edges: [[0, 1], [1, 2]],
  redCount: 1,
  whiteCount: 1,
  whiteStart: 2,
  redStartCandidates: [0],
  maxRedTurns: 30,
};

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    pieces: { R0: 0, W0: 2 },
    turn: "RED",
    redTurnsUsed: 0,
    maxRedTurns: 30,
    winner: null,
    redStartPos: [0],
    ...overrides,
  };
}

function setRoom(state: GameState, mySide: string | null = "RED") {
  const seats: SeatSlotDto[] = [
    { displayName: "An", connected: true, lastSeenAt: null },
    { displayName: "Bình", connected: true, lastSeenAt: null },
  ];
  const room: RoomDto<MapDef, GameState> = {
    id: "room-1",
    gameKey: "vaybat",
    status: "Playing",
    winner: state.winner,
    map: MAP,
    state,
    createdAt: "2026-01-01T00:00:00Z",
    seatCount: 2,
    seats,
    ownerUserId: "u1",
    mySide,
    isMine: true,
  };
  useGameStore.setState({ room: room as unknown as RoomDto, mySide, selected: null, error: "", connectionState: "connected" });
}

/**
 * jsdom (bản dùng trong repo) KHÔNG triển khai PointerEvent — `fireEvent.pointerDown` của RTL
 * rơi về Event trần, mất hẳn `clientX`/`clientY`, khiến `toSvg()` tính ra NaN và không bao giờ
 * khớp node nào. Dùng MouseEvent (jsdom có) nhưng ép `type` thành "pointerdown" — React lắng
 * nghe native event theo `type` nên vẫn khớp đúng handler `onPointerDown`, chỉ mất `pointerId`
 * (không ảnh hưởng vì `setPointerCapture` đã no-op ở trên).
 */
function pointerDownAt(svg: SVGSVGElement, x: number, y: number) {
  fireEvent(svg, new MouseEvent("pointerdown", { clientX: x, clientY: y, bubbles: true, cancelable: true }));
}

describe("VayBatBoard — chọn quân và đi bằng click (tap-tap)", () => {
  it("chọn quân của mình rồi tap ô kề hợp lệ thì gửi đúng nước đi", () => {
    setRoom(makeState());
    const makeMove = vi.fn();
    const { container } = render(<VayBatBoard makeMove={makeMove} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);
    const svg = container.querySelector("svg")!;

    pointerDownAt(svg, 10, 10); // chọn R0 tại node 0
    pointerDownAt(svg, 100, 10); // tap ô trống kề (node 1)

    expect(makeMove).toHaveBeenCalledWith("room-1", { pieceId: "R0", to: 1 });
  });

  it("không cho chọn quân đối phương khi tới lượt mình", () => {
    setRoom(makeState());
    const makeMove = vi.fn();
    const { container } = render(<VayBatBoard makeMove={makeMove} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);
    const svg = container.querySelector("svg")!;

    pointerDownAt(svg, 200, 10); // W0 — quân đối phương
    pointerDownAt(svg, 100, 10); // ô trống kề — không có gì được chọn nên không đi

    expect(makeMove).not.toHaveBeenCalled();
  });

  it("không cho đi khi chưa tới lượt mình", () => {
    setRoom(makeState({ turn: "WHITE" }));
    const makeMove = vi.fn();
    const { container } = render(<VayBatBoard makeMove={makeMove} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);
    const svg = container.querySelector("svg")!;

    pointerDownAt(svg, 10, 10);
    pointerDownAt(svg, 100, 10);

    expect(makeMove).not.toHaveBeenCalled();
  });

  it("khán giả (mySide null) không chọn được quân nào", () => {
    setRoom(makeState(), null);
    const makeMove = vi.fn();
    const { container } = render(<VayBatBoard makeMove={makeMove} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);
    const svg = container.querySelector("svg")!;

    pointerDownAt(svg, 10, 10);
    pointerDownAt(svg, 100, 10);

    expect(makeMove).not.toHaveBeenCalled();
  });
});

describe("VayBatBoard — trạng thái phòng", () => {
  it("hiện đúng thông báo thắng cho phe Đỏ", () => {
    setRoom(makeState({ winner: "RED" }));
    render(<VayBatBoard makeMove={vi.fn()} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);

    expect(screen.getByText(/PHE ĐỎ THẮNG/)).toBeInTheDocument();
    expect(screen.getByText("🔄 CHƠI LẠI")).toBeInTheDocument();
  });

  it("khán giả không thấy nút CHƠI LẠI dù ván đã kết thúc", () => {
    setRoom(makeState({ winner: "WHITE" }), null);
    render(<VayBatBoard makeMove={vi.fn()} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);

    expect(screen.getByText(/PHE TRẮNG THẮNG/)).toBeInTheDocument();
    expect(screen.queryByText("🔄 CHƠI LẠI")).not.toBeInTheDocument();
  });

  it("hiện đúng số lượt Đỏ đã dùng / tối đa", () => {
    setRoom(makeState({ redTurnsUsed: 5, maxRedTurns: 30 }));
    render(<VayBatBoard makeMove={vi.fn()} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false} />);

    expect(screen.getByText("5 / 30")).toBeInTheDocument();
  });
});
