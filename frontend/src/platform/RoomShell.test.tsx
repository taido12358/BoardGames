import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  ConnectionBanner, DisconnectBadge, LeaveRoomButton, RematchButton, RematchInviteBanner,
  RoomErrorBanner, RoomStatusBanner, isOpenStatus,
} from "./RoomShell";
import type { RoomDto, SeatSlotDto } from "./types";

const seat = (overrides: Partial<SeatSlotDto> = {}): SeatSlotDto => ({
  displayName: null, connected: true, lastSeenAt: null, ...overrides,
});

function room(overrides: Partial<RoomDto> = {}): RoomDto {
  return {
    id: "r1", gameKey: "vaybat", status: "Waiting", winner: null, map: {}, state: {},
    createdAt: "2026-01-01T00:00:00Z", seatCount: 2, seats: [seat(), seat()],
    ownerUserId: "u1", mySide: null, isMine: false,
    ...overrides,
  };
}

describe("RoomStatusBanner", () => {
  it("phòng Waiting: hiện đúng số ghế đã có người / tổng ghế", () => {
    render(<RoomStatusBanner room={room({ status: "Waiting", seatCount: 4, seats: [seat({ displayName: "An" }), seat(), seat(), seat()] })} mySide={null} />);
    expect(screen.getByText(/Đang chờ 1\/4 người vào phòng/)).toBeInTheDocument();
  });

  it("phòng Playing nhưng mySide null (khán giả): hiện banner xem", () => {
    render(<RoomStatusBanner room={room({ status: "Playing" })} mySide={null} />);
    expect(screen.getByText(/Bạn đang xem/)).toBeInTheDocument();
  });

  it("phòng Playing và có mySide (đang chơi): không hiện banner nào", () => {
    const { container } = render(<RoomStatusBanner room={room({ status: "Playing" })} mySide="RED" />);
    expect(container.firstChild).toBeNull();
  });

  it("phòng Cancelled: hiện thông báo đã huỷ", () => {
    render(<RoomStatusBanner room={room({ status: "Cancelled" })} mySide={null} />);
    expect(screen.getByText("Phòng đã bị huỷ.")).toBeInTheDocument();
  });

  it("phòng Abandoned: hiện thông báo đã đóng do mất kết nối", () => {
    render(<RoomStatusBanner room={room({ status: "Abandoned" })} mySide={null} />);
    expect(screen.getByText("Phòng đã đóng do mất kết nối kéo dài.")).toBeInTheDocument();
  });

  it("phòng Finished: không hiện banner nào (màn thắng/thua tự lo hiển thị)", () => {
    const { container } = render(<RoomStatusBanner room={room({ status: "Finished" })} mySide="RED" />);
    expect(container.firstChild).toBeNull();
  });
});

describe("DisconnectBadge", () => {
  it("có ghế đã ngồi nhưng mất kết nối: hiện đúng tên", () => {
    render(<DisconnectBadge seats={[seat({ displayName: "An", connected: false }), seat({ displayName: "Bình", connected: true })]} />);
    expect(screen.getByText(/An mất kết nối/)).toBeInTheDocument();
    expect(screen.queryByText(/Bình mất kết nối/)).not.toBeInTheDocument();
  });

  it("nhiều người mất kết nối cùng lúc: nối bằng dấu ·", () => {
    render(<DisconnectBadge seats={[seat({ displayName: "An", connected: false }), seat({ displayName: "Bình", connected: false })]} />);
    expect(screen.getByText("⚠ An mất kết nối · ⚠ Bình mất kết nối")).toBeInTheDocument();
  });

  it("ghế trống (displayName null) mất kết nối KHÔNG được tính là ai đó rớt mạng", () => {
    const { container } = render(<DisconnectBadge seats={[seat({ displayName: null, connected: false })]} />);
    expect(container.firstChild).toBeNull();
  });

  it("mọi người đều đang kết nối: không hiện gì", () => {
    const { container } = render(<DisconnectBadge seats={[seat({ displayName: "An", connected: true })]} />);
    expect(container.firstChild).toBeNull();
  });
});

describe("ConnectionBanner", () => {
  it("connected: không hiện gì", () => {
    const { container } = render(<ConnectionBanner connectionState="connected" />);
    expect(container.firstChild).toBeNull();
  });

  it("reconnecting: hiện đang kết nối lại", () => {
    render(<ConnectionBanner connectionState="reconnecting" />);
    expect(screen.getByText("Đang kết nối lại…")).toBeInTheDocument();
  });

  it("disconnected: hiện mất kết nối, yêu cầu tải lại trang", () => {
    render(<ConnectionBanner connectionState="disconnected" />);
    expect(screen.getByText(/Mất kết nối tới máy chủ/)).toBeInTheDocument();
  });
});

describe("RoomErrorBanner", () => {
  it("có lỗi: hiện đúng nội dung", () => {
    render(<RoomErrorBanner error="Không thể kết nối." />);
    expect(screen.getByText("Không thể kết nối.")).toBeInTheDocument();
  });

  it("rỗng/null: không hiện gì", () => {
    const { container: c1 } = render(<RoomErrorBanner error="" />);
    expect(c1.firstChild).toBeNull();
    const { container: c2 } = render(<RoomErrorBanner error={null} />);
    expect(c2.firstChild).toBeNull();
  });
});

describe("LeaveRoomButton", () => {
  it("label mặc định, bấm gọi onLeave", async () => {
    const user = userEvent.setup();
    const onLeave = vi.fn();
    render(<LeaveRoomButton onLeave={onLeave} />);

    expect(screen.getByText("← Rời phòng")).toBeInTheDocument();
    await user.click(screen.getByText("← Rời phòng"));
    expect(onLeave).toHaveBeenCalled();
  });

  it("label tuỳ chỉnh", () => {
    render(<LeaveRoomButton onLeave={vi.fn()} label="← Quay lại" />);
    expect(screen.getByText("← Quay lại")).toBeInTheDocument();
  });
});

describe("RematchButton", () => {
  it("không loading: hiện CHƠI LẠI, bấm gọi onRematch", async () => {
    const user = userEvent.setup();
    const onRematch = vi.fn();
    render(<RematchButton onRematch={onRematch} loading={false} />);

    const btn = screen.getByRole("button");
    expect(btn).toHaveTextContent("🔄 CHƠI LẠI");
    expect(btn).toBeEnabled();
    await user.click(btn);
    expect(onRematch).toHaveBeenCalled();
  });

  it("đang loading: hiện đang tạo phòng, disable nút", () => {
    render(<RematchButton onRematch={vi.fn()} loading={true} />);
    const btn = screen.getByRole("button");
    expect(btn).toHaveTextContent("Đang tạo phòng…");
    expect(btn).toBeDisabled();
  });
});

describe("RematchInviteBanner", () => {
  it("không có lời mời: không hiện gì", () => {
    const { container } = render(<RematchInviteBanner invite={null} onJoin={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("có lời mời: hiện đúng tên người mời, bấm VÀO PHÒNG gọi onJoin với đúng roomId", async () => {
    const user = userEvent.setup();
    const onJoin = vi.fn();
    render(<RematchInviteBanner invite={{ newRoomId: "room-2", byDisplayName: "An" }} onJoin={onJoin} />);

    expect(screen.getByText(/An đã tạo phòng chơi lại/)).toBeInTheDocument();
    await user.click(screen.getByText("VÀO PHÒNG"));
    expect(onJoin).toHaveBeenCalledWith("room-2");
  });
});

describe("isOpenStatus", () => {
  it.each([
    ["Waiting", true],
    ["Playing", true],
    ["Finished", false],
    ["Cancelled", false],
    ["Abandoned", false],
  ] as const)("%s -> %s", (status, expected) => {
    expect(isOpenStatus(status)).toBe(expected);
  });
});
