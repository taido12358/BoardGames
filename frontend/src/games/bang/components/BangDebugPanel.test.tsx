import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BangDebugPanel from "./BangDebugPanel";
import type { BangPublicPlayer } from "../types";

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: () => Promise.resolve(body) } as Response;
}

/** Định tuyến fetch() giả theo URL — khớp đúng path BangDebugController thật dùng. */
function stubFetch(enabled: boolean) {
  const fetchMock = vi.fn((url: string, _init?: RequestInit) => {
    if (url.includes("/api/debug/bang/") && url.endsWith("/enabled")) {
      return Promise.resolve(jsonResponse({ enabled }));
    }
    return Promise.resolve(jsonResponse({ ok: true }));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const player = (id: string, name: string): BangPublicPlayer => ({
  id, name, seatIndex: 0, character: "Jesse", abilityName: "", publicRole: "Vai trò ẩn",
  hp: 4, maxHp: 4, cardCount: 4, weapon: "Colt .45", weaponRange: 1, equipment: [],
  alive: true, distance: null, inRange: null,
});

const players = [player("P0", "An"), player("P1", "Bình")];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("BangDebugPanel", () => {
  it("không hiện gì khi backend báo debug panel chưa bật", async () => {
    stubFetch(false);
    const { container } = render(<BangDebugPanel roomId="room-1" players={players} />);

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    await waitFor(() => expect(container.firstChild).toBeNull());
  });

  it("hiện nút DEBUG PANEL (thu gọn) khi backend báo đã bật", async () => {
    stubFetch(true);
    render(<BangDebugPanel roomId="room-1" players={players} />);

    expect(await screen.findByText(/DEBUG PANEL/)).toBeInTheDocument();
    expect(screen.queryByText("Xem state đầy đủ")).not.toBeInTheDocument(); // chưa mở
  });

  it("bấm mở panel hiện đủ các nút thao tác", async () => {
    const user = userEvent.setup();
    stubFetch(true);
    render(<BangDebugPanel roomId="room-1" players={players} />);

    await user.click(await screen.findByText(/DEBUG PANEL/));

    expect(screen.getByText("+1 lá")).toBeInTheDocument();
    expect(screen.getByText("+3 lá")).toBeInTheDocument();
    expect(screen.getByText("-1 HP")).toBeInTheDocument();
    expect(screen.getByText("Loại ngay")).toBeInTheDocument();
    expect(screen.getByText("Ép kết thúc lượt")).toBeInTheDocument();
  });

  it("bấm +1 lá gọi đúng endpoint force-draw với playerId đang chọn", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch(true);
    render(<BangDebugPanel roomId="room-1" players={players} />);

    await user.click(await screen.findByText(/DEBUG PANEL/));
    await user.click(screen.getByText("+1 lá"));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find((c) => (c[0] as string).includes("force-draw"));
      expect(call).toBeDefined();
      expect(call![0]).toBe("/api/debug/bang/room-1/force-draw");
      expect(JSON.parse((call![1] as RequestInit).body as string)).toEqual({ playerId: "P0", count: 1 });
    });
  });

  it("đổi người chơi trong dropdown rồi bấm -1 HP gọi đúng playerId mới", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch(true);
    render(<BangDebugPanel roomId="room-1" players={players} />);

    await user.click(await screen.findByText(/DEBUG PANEL/));
    await user.selectOptions(screen.getByRole("combobox"), "P1");
    await user.click(screen.getByText("-1 HP"));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find((c) => (c[0] as string).includes("force-damage"));
      expect(JSON.parse((call![1] as RequestInit).body as string)).toEqual({ playerId: "P1", amount: 1 });
    });
  });

  it("bấm Ép kết thúc lượt gọi force-end-turn không kèm body", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch(true);
    render(<BangDebugPanel roomId="room-1" players={players} />);

    await user.click(await screen.findByText(/DEBUG PANEL/));
    await user.click(screen.getByText("Ép kết thúc lượt"));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find((c) => (c[0] as string).includes("force-end-turn"));
      expect(call).toBeDefined();
      expect((call![1] as RequestInit).body).toBeUndefined();
    });
  });
});
