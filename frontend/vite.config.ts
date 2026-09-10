/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:5000",
      "/hubs": {
        target: "http://localhost:5000",
        ws: true,
      },
    },
  },
  test: {
    // jsdom vì gameStore.ts đọc localStorage lúc load module — cần môi trường có DOM/Web API
    // dù chưa test component React nào (thêm React Testing Library riêng khi cần test
    // component). globals:false (mặc định) — import describe/it/expect tường minh từ
    // "vitest" trong mỗi file test thay vì biến toàn cục, đỡ phải cấu hình thêm types cho
    // tsconfig/eslint.
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
  },
});
