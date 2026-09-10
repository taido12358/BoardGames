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
