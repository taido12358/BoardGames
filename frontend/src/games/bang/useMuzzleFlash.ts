import { useEffect, useRef, useState } from "react";

const MUZZLE_FLASH_DURATION_MS = 300;

/** Khớp đúng các dòng gameLog thật sự là PHÁT SÚNG (xem BangRules.cs) — KHÔNG khớp việc bỏ lá
 * Bang! để né Người da đỏ ("bỏ Bang! để né…", không bắn ai) hay các dòng khác chỉ nhắc tới chữ
 * "Bang!" một cách tình cờ. */
const SHOT_PATTERN = /sử dụng (Bang!|Súng Gatling)|đáp trả bằng Bang!/;

/**
 * Trả `true` trong {@link MUZZLE_FLASH_DURATION_MS}ms ngay sau khi CÓ dòng gameLog MỚI (so với
 * lần render trước) mô tả một phát súng thật sự (Bang!/Gatling/đáp trả Bang! trong đấu súng) —
 * dùng để kích hoạt hiệu ứng "muzzle flash" (van-de.md §46, "BANG!: gunshot/muzzle flash").
 * Cùng khuôn với `useDamageShake` nhưng trigger dựa trên NỘI DUNG log mới thêm vào, không phải
 * so sánh 1 con số — vì "vừa bắn" không có field riêng trong state, chỉ suy ra được từ gameLog
 * (xem BangRules.HandleMove — mọi hành động đều ghi log kèm theo).
 * Không kích hoạt ở lần render đầu tiên (mount không phải là "vừa bắn" dù log có sẵn từ trước).
 */
export function useMuzzleFlash(gameLog: string[]): boolean {
  const prevLength = useRef(gameLog.length);
  const [flashing, setFlashing] = useState(false);

  useEffect(() => {
    if (gameLog.length > prevLength.current) {
      const newEntries = gameLog.slice(prevLength.current);
      if (newEntries.some((entry) => SHOT_PATTERN.test(entry))) {
        setFlashing(true);
        const timer = setTimeout(() => setFlashing(false), MUZZLE_FLASH_DURATION_MS);
        prevLength.current = gameLog.length;
        return () => clearTimeout(timer);
      }
    }
    prevLength.current = gameLog.length;
  }, [gameLog]);

  return flashing;
}
