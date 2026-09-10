// Setup chạy trước MỌI test file (xem vite.config.ts test.setupFiles). Cần polyfill
// localStorage thủ công vì jsdom (kết hợp Node/vitest hiện tại) không tự cấp phát
// localStorage hoạt động được (`localStorage.getItem is not a function` dù đã set
// environment: "jsdom") — jsdom mới chuyển sang dựa vào flag thử nghiệm
// `--localstorage-file` của Node thay vì tự triển khai, nên cần tự thay bằng bản đơn giản.
import { afterEach, vi } from "vitest";
// Mở rộng expect() của Vitest với các matcher DOM tiện dụng (toBeInTheDocument, toBeDisabled…)
// cho test component React (React Testing Library).
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";

// React Testing Library tự đăng ký cleanup() sau mỗi test QUA afterEach TOÀN CỤC — cơ chế đó
// chỉ hoạt động khi bật `globals: true` của Vitest. Dự án cố tình KHÔNG bật globals (import
// describe/it/expect tường minh, xem vite.config.ts), nên phải tự gọi cleanup() thủ công ở đây,
// nếu không DOM của test trước còn sót lại khi test sau render tiếp, gây lỗi "Found multiple
// elements" (đã tự bắt được lỗi này khi viết test component đầu tiên).
afterEach(() => {
  cleanup();
});

// jsdom không triển khai Element.scrollTo (không làm layout/scroll thật) — bất kỳ component
// nào gọi nó (vd ChatPanel tự cuộn xuống tin nhắn mới nhất) sẽ crash với "scrollTo is not a
// function" khi test render trong jsdom. Polyfill no-op ở đây một lần cho MỌI test, thay vì
// mock riêng trong từng file test đụng phải.
if (typeof Element.prototype.scrollTo !== "function") {
  Element.prototype.scrollTo = () => {};
}

// Cùng lý do — jsdom cũng không có scrollIntoView (vd GameLogPanel tự cuộn xuống dòng log mới).
if (typeof Element.prototype.scrollIntoView !== "function") {
  Element.prototype.scrollIntoView = () => {};
}

class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  get length(): number {
    return this.store.size;
  }
}

vi.stubGlobal("localStorage", new MemoryStorage());
