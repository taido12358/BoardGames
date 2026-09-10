// Setup chạy trước MỌI test file (xem vite.config.ts test.setupFiles). Cần polyfill
// localStorage thủ công vì jsdom (kết hợp Node/vitest hiện tại) không tự cấp phát
// localStorage hoạt động được (`localStorage.getItem is not a function` dù đã set
// environment: "jsdom") — jsdom mới chuyển sang dựa vào flag thử nghiệm
// `--localstorage-file` của Node thay vì tự triển khai, nên cần tự thay bằng bản đơn giản.
import { vi } from "vitest";

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
