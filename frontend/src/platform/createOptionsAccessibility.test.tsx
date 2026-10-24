import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  it("VayBat cho xóa rồi nhập số mới mà không tự chèn 1", async () => {
    const onChange = vi.fn();
    render(<VayBatCreateOptions value={{ maxRedTurns: 15 }} onChange={onChange} />);
    const input = screen.getByLabelText("Giới hạn lượt Đỏ");
    await userEvent.clear(input);
    expect(input).toHaveValue(null);
    await userEvent.type(input, "20");
    expect(input).toHaveValue(20);
    expect(onChange).toHaveBeenLastCalledWith({ maxRedTurns: 20 });
  });

  it("VayBat bỏ trống rồi rời ô giữ số lượt hợp lệ trước đó", async () => {
    const onChange = vi.fn();
    render(<VayBatCreateOptions value={{ maxRedTurns: 15 }} onChange={onChange} />);
    const input = screen.getByLabelText("Giới hạn lượt Đỏ");
    await userEvent.clear(input);
    await userEvent.tab();
    expect(input).toHaveValue(15);
    expect(onChange).not.toHaveBeenCalled();
  });
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
