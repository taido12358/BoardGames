import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import VayBatCreateOptions from "../games/vaybat/CreateOptions";
import BangCreateOptions from "../games/bang/CreateOptions";
import ZodiacRaceCreateOptions from "../games/zodiacrace/CreateOptions";

/**
 * Bug a11y thật đã sửa (2026-09-11): cả 3 form tuỳ chọn tạo phòng dùng <label> KHÔNG có "for"
 * chỏ tới input/nhóm nút nào — screen reader bỏ qua hoàn toàn nhãn đó. VayBat có input đơn lẻ
 * (sửa bằng htmlFor/id); Bang/ZodiacRace là nhóm nút chọn 1-trong-N, không phải input đơn lẻ nên
 * <label htmlFor> không đúng ngữ nghĩa — sửa bằng role="group" + aria-labelledby thay thế.
 */
describe("CreateOptions — nhãn phải gắn đúng với input/nhóm nút (a11y)", () => {
  it("VayBat: input giới hạn lượt Đỏ có label liên kết đúng qua htmlFor/id", () => {
    render(<VayBatCreateOptions value={{}} onChange={vi.fn()} />);
    expect(screen.getByLabelText("Giới hạn lượt Đỏ")).toBeInTheDocument();
  });

  it("Bang: nhóm nút chọn số người có role group với tên đúng", () => {
    render(<BangCreateOptions value={{}} onChange={vi.fn()} />);
    expect(screen.getByRole("group", { name: "Số người tối đa" })).toBeInTheDocument();
  });

  it("Đua Xe Hoàng Đạo: nhóm nút chọn số người có role group với tên đúng", () => {
    render(<ZodiacRaceCreateOptions value={{}} onChange={vi.fn()} />);
    expect(screen.getByRole("group", { name: "Số người chơi" })).toBeInTheDocument();
  });
});
