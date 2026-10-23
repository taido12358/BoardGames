import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter } from "react-router-dom";
import ScrollToTop from "./ScrollToTop";

describe("ScrollToTop — điều hướng bàn phím", () => {
  it("chuyển trang focus nội dung chính, không cướp autofocus lúc mount", async () => {
    const scroll = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    render(<MemoryRouter initialEntries={["/games"]}>
      <ScrollToTop />
      <Link to="/history">Lịch sử</Link>
      <main id="main-content" tabIndex={-1}><input aria-label="Nhập email" autoFocus /></main>
    </MemoryRouter>);
    expect(screen.getByLabelText("Nhập email")).toHaveFocus();
    await userEvent.click(screen.getByRole("link", { name: "Lịch sử" }));
    expect(screen.getByRole("main")).toHaveFocus();
    expect(scroll).toHaveBeenCalledWith(0, 0);
    scroll.mockRestore();
  });
});
