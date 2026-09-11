import { useEffect, useRef, useState } from "react";

const SHAKE_DURATION_MS = 400;

/**
 * Trả `true` trong {@link SHAKE_DURATION_MS}ms ngay sau khi `hp` GIẢM so với lần render trước —
 * dùng để kích hoạt animation "rung" khi người chơi mất máu (van-de.md §46 — trước 2026-09-11 dự
 * án gần như không có animation nào ngoài 1 hiệu ứng hover chung). Không kích hoạt khi hp tăng
 * (hồi máu bằng bia) hoặc lần render đầu tiên (mount không phải là "vừa bị đánh").
 */
export function useDamageShake(hp: number): boolean {
  const prevHp = useRef(hp);
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    if (hp < prevHp.current) {
      setShaking(true);
      const timer = setTimeout(() => setShaking(false), SHAKE_DURATION_MS);
      prevHp.current = hp;
      return () => clearTimeout(timer);
    }
    prevHp.current = hp;
  }, [hp]);

  return shaking;
}
