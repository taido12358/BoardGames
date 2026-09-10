import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DisplayNameEditor from "./DisplayNameEditor";
import { useAuthStore } from "./authStore";

beforeEach(() => {
  useAuthStore.setState({ error: "", updateDisplayName: vi.fn(async () => true) });
});

describe("DisplayNameEditor", () => {
  it("hiện tên hiện tại, chưa ở chế độ sửa", () => {
    render(<DisplayNameEditor displayName="An" email="an@test.local" />);
    expect(screen.getByText(/An/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Tên hiển thị mới")).not.toBeInTheDocument();
  });

  it("bấm vào tên mở form sửa với giá trị hiện tại", async () => {
    const user = userEvent.setup();
    render(<DisplayNameEditor displayName="An" email="an@test.local" />);

    await user.click(screen.getByText(/An/));

    expect(screen.getByLabelText("Tên hiển thị mới")).toHaveValue("An");
  });

  it("bấm Lưu với tên mới gọi updateDisplayName với đúng giá trị đã trim", async () => {
    const updateDisplayName = vi.fn(async () => true);
    useAuthStore.setState({ updateDisplayName });
    const user = userEvent.setup();
    render(<DisplayNameEditor displayName="An" email="an@test.local" />);

    await user.click(screen.getByText(/An/));
    const input = screen.getByLabelText("Tên hiển thị mới");
    await user.clear(input);
    await user.type(input, "  Bình mới  ");
    await user.click(screen.getByText("Lưu"));

    expect(updateDisplayName).toHaveBeenCalledWith("Bình mới");
  });

  it("lưu thành công (tên đã đổi) thì gọi updateDisplayName rồi thoát chế độ sửa", async () => {
    const updateDisplayName = vi.fn(async () => true);
    useAuthStore.setState({ updateDisplayName });
    const user = userEvent.setup();
    render(<DisplayNameEditor displayName="An" email="an@test.local" />);

    await user.click(screen.getByText(/An/));
    await user.type(screen.getByLabelText("Tên hiển thị mới"), "2");
    await user.click(screen.getByText("Lưu"));

    expect(updateDisplayName).toHaveBeenCalledWith("An2");
    expect(screen.queryByLabelText("Tên hiển thị mới")).not.toBeInTheDocument();
  });

  it("lưu thất bại thì hiện lỗi, vẫn ở chế độ sửa", async () => {
    useAuthStore.setState({ updateDisplayName: vi.fn(async () => false), error: "Tên hiển thị tối đa 30 ký tự." });
    const user = userEvent.setup();
    render(<DisplayNameEditor displayName="An" email="an@test.local" />);

    await user.click(screen.getByText(/An/));
    await user.type(screen.getByLabelText("Tên hiển thị mới"), "2"); // đổi khác tên cũ để thật sự gọi lưu
    await user.click(screen.getByText("Lưu"));

    expect(await screen.findByText("Tên hiển thị tối đa 30 ký tự.")).toBeInTheDocument();
    expect(screen.getByLabelText("Tên hiển thị mới")).toBeInTheDocument();
  });

  it("bấm Huỷ thoát chế độ sửa, không gọi updateDisplayName", async () => {
    const updateDisplayName = vi.fn(async () => true);
    useAuthStore.setState({ updateDisplayName });
    const user = userEvent.setup();
    render(<DisplayNameEditor displayName="An" email="an@test.local" />);

    await user.click(screen.getByText(/An/));
    await user.click(screen.getByText("Huỷ"));

    expect(screen.queryByLabelText("Tên hiển thị mới")).not.toBeInTheDocument();
    expect(updateDisplayName).not.toHaveBeenCalled();
  });

  it("nhấn Escape huỷ chế độ sửa", async () => {
    const user = userEvent.setup();
    render(<DisplayNameEditor displayName="An" email="an@test.local" />);

    await user.click(screen.getByText(/An/));
    await user.keyboard("{Escape}");

    expect(screen.queryByLabelText("Tên hiển thị mới")).not.toBeInTheDocument();
  });

  it("lưu tên giống hệt tên cũ (chỉ khác khoảng trắng) thì đóng form mà không gọi API", async () => {
    const updateDisplayName = vi.fn(async () => true);
    useAuthStore.setState({ updateDisplayName });
    const user = userEvent.setup();
    render(<DisplayNameEditor displayName="An" email="an@test.local" />);

    await user.click(screen.getByText(/An/));
    const input = screen.getByLabelText("Tên hiển thị mới");
    await user.clear(input);
    await user.type(input, "  An  ");
    await user.click(screen.getByText("Lưu"));

    expect(updateDisplayName).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Tên hiển thị mới")).not.toBeInTheDocument();
  });
});
