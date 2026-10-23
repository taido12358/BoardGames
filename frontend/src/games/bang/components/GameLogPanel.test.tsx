import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GameLogPanel from "./GameLogPanel";

describe("GameLogPanel — giữ vị trí đọc", () => {
  it("không tự cuộn khi đang đọc dòng cũ; nút mới nhất phục hồi theo dõi", async () => {
    const view = render(<GameLogPanel log={["Dòng đầu"]} />);
    const list = screen.getByLabelText("Nhật ký trận đấu");
    const scrollTo = vi.fn();
    list.scrollTo = scrollTo;
    Object.defineProperties(list, { scrollHeight: { value: 500 }, clientHeight: { value: 100 } });
    fireEvent.scroll(list, { target: { scrollTop: 0 } });
    view.rerender(<GameLogPanel log={["Dòng đầu", "Dòng mới"]} />);
    expect(scrollTo).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: /Xem mới nhất/ }));
    expect(scrollTo).toHaveBeenCalledWith({ top: 500 });
    view.rerender(<GameLogPanel log={["Dòng đầu", "Dòng mới", "Dòng tiếp"]} />);
    expect(scrollTo).toHaveBeenCalledTimes(2);
  });
});
