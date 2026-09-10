import { describe, expect, it } from "vitest";
import { ARTWORK_BG } from "./artworkTheme";
import { vaybatMetadata } from "../games/vaybat/metadata";
import { bangMetadata } from "../games/bang/metadata";
import { oanQuanMetadata } from "../games/oanquan/metadata";
import { zodiacRaceMetadata } from "../games/zodiacrace/metadata";

/**
 * Bug thật đã xảy ra (2026-09-11): GameDetails.tsx từng tự khai báo bản sao RIÊNG của
 * ARTWORK_BG (kiểu `Record<string, string>` lỏng, không ép đủ key) — thiếu "folk" và "zodiac",
 * khiến trang chi tiết 2 game đó mất hẳn nền artwork mà không lỗi biên dịch nào báo. Gộp về 1
 * nguồn chung (artworkTheme.ts, ép kiểu đúng `Record<GameMetadata["accent"], string>`) đã tự
 * bắt lỗi này ở compile-time — test dưới đây giữ nguyên bảo vệ đó ở runtime, phòng khi có ai
 * nới lỏng lại kiểu dữ liệu trong tương lai.
 */
describe("ARTWORK_BG", () => {
  it("có đúng 1 giá trị non-empty cho accent của mỗi game đang đăng ký", () => {
    for (const metadata of [vaybatMetadata, bangMetadata, oanQuanMetadata, zodiacRaceMetadata]) {
      expect(ARTWORK_BG[metadata.accent], `thiếu ARTWORK_BG cho accent "${metadata.accent}" (game ${metadata.gameKey})`).toBeTruthy();
    }
  });

  it("có entry cho \"default\" (dùng cho game chưa có metadata riêng, xem gameRegistry.fallbackMetadata)", () => {
    expect(ARTWORK_BG.default).toBeTruthy();
  });
});
