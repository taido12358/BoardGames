import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "./LoginPage";
import { useAuthStore } from "./authStore";

beforeEach(() => {
  useAuthStore.setState({
    user: null, checking: false, step: "email", pendingEmail: "", loading: false, error: "", resendIn: 0,
    requestOtp: vi.fn(), verifyOtp: vi.fn(), backToEmail: vi.fn(),
  });
});

describe("LoginPage — bước nhập email", () => {
  it("gõ email rồi bấm gửi mã gọi requestOtp với email đã trim", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText("Email"), "  test@gmail.com  ");
    await user.click(screen.getByRole("button", { name: /Gửi mã đăng nhập/ }));

    expect(useAuthStore.getState().requestOtp).toHaveBeenCalledWith("test@gmail.com");
  });

  it("nút gửi mã bị disable khi email rỗng", () => {
    render(<LoginPage />);
    expect(screen.getByRole("button", { name: /Gửi mã đăng nhập/ })).toBeDisabled();
  });

  it("đang loading thì hiện 'Đang gửi mã…' và disable nút", () => {
    useAuthStore.setState({ loading: true });
    render(<LoginPage />);
    expect(screen.getByRole("button", { name: /Đang gửi mã/ })).toBeDisabled();
  });
});

describe("LoginPage — bước nhập mã", () => {
  function setCodeStep(overrides: Partial<ReturnType<typeof useAuthStore.getState>> = {}) {
    useAuthStore.setState({ step: "code", pendingEmail: "test@gmail.com", ...overrides });
  }

  it("hiện đúng email đã gửi mã tới", () => {
    setCodeStep();
    render(<LoginPage />);
    expect(screen.getByText("test@gmail.com")).toBeInTheDocument();
  });

  it("chỉ giữ lại chữ số khi gõ mã (lọc ký tự không phải số)", async () => {
    const user = userEvent.setup();
    setCodeStep();
    render(<LoginPage />);

    const input = screen.getByLabelText("Mã xác nhận") as HTMLInputElement;
    await user.type(input, "1a2b3c");

    expect(input.value).toBe("123");
  });

  it("nhập đủ 6 số rồi bấm Đăng nhập gọi verifyOtp với đúng mã", async () => {
    const user = userEvent.setup();
    setCodeStep();
    render(<LoginPage />);

    await user.type(screen.getByLabelText("Mã xác nhận"), "123456");
    await user.click(screen.getByRole("button", { name: /Đăng nhập/ }));

    expect(useAuthStore.getState().verifyOtp).toHaveBeenCalledWith("123456");
  });

  it("nút Đăng nhập bị disable khi chưa đủ 6 số", async () => {
    const user = userEvent.setup();
    setCodeStep();
    render(<LoginPage />);

    await user.type(screen.getByLabelText("Mã xác nhận"), "123");

    expect(screen.getByRole("button", { name: /Đăng nhập/ })).toBeDisabled();
  });

  it("bấm 'Đổi email' gọi backToEmail", async () => {
    const user = userEvent.setup();
    setCodeStep();
    render(<LoginPage />);

    await user.click(screen.getByText("← Đổi email"));

    expect(useAuthStore.getState().backToEmail).toHaveBeenCalled();
  });

  it("còn đang đếm ngược thì nút gửi lại mã bị disable và hiện số giây", () => {
    setCodeStep({ resendIn: 42 });
    render(<LoginPage />);

    const resendBtn = screen.getByRole("button", { name: /Gửi lại mã \(42s\)/ });
    expect(resendBtn).toBeDisabled();
  });

  it("hết đếm ngược thì bấm gửi lại mã gọi requestOtp với đúng pendingEmail", async () => {
    const user = userEvent.setup();
    const requestOtp = vi.fn();
    setCodeStep({ resendIn: 0, requestOtp });
    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: "Gửi lại mã" }));

    expect(requestOtp).toHaveBeenCalledWith("test@gmail.com");
  });
});

describe("LoginPage — thông báo lỗi", () => {
  it("hiện lỗi khi store có error", () => {
    useAuthStore.setState({ error: "Mã không đúng. Còn 3 lần thử." });
    render(<LoginPage />);
    expect(screen.getByRole("alert")).toHaveTextContent("Mã không đúng. Còn 3 lần thử.");
  });

  it("không hiện gì khi không có lỗi", () => {
    render(<LoginPage />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
