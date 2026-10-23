import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import RoomInvite from "./RoomInvite";

describe("RoomInvite", () => {
  it("sao chép đúng liên kết phòng", async () => {
    const user = userEvent.setup();
    const write = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
    render(<MemoryRouter initialEntries={["/games/bang/room/r1"]}><RoomInvite /></MemoryRouter>);
    await user.click(screen.getByRole("button", { name: "Sao chép liên kết" }));
    expect(write).toHaveBeenCalledWith(`${window.location.origin}/games/bang/room/r1`);
    expect(screen.getByRole("status")).toHaveTextContent("Đã sao chép");
    write.mockRestore();
  });

  it("clipboard bị chặn vẫn có liên kết để sao chép thủ công", async () => {
    const user = userEvent.setup();
    const write = vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
    render(<MemoryRouter initialEntries={["/games/bang/room/r1"]}><RoomInvite /></MemoryRouter>);
    await user.click(screen.getByRole("button", { name: "Sao chép liên kết" }));
    expect(screen.getByRole("status")).toHaveTextContent("sao chép thủ công");
    expect(screen.getByLabelText("Liên kết phòng")).toHaveValue(`${window.location.origin}/games/bang/room/r1`);
    write.mockRestore();
  });
});
