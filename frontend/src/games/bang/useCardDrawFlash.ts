import { useEffect, useRef, useState } from "react";

const DRAW_FLASH_DURATION_MS = 500;

/**
 * Trả `true` trong {@link DRAW_FLASH_DURATION_MS}ms ngay sau khi `handLength` TĂNG so với lần
 * render trước — dùng để kích hoạt animation "bài bay từ nọc vào tay" (van-de.md §46, "Card draw:
 * card moves from deck to hand"). Cùng khuôn với `useDamageShake` (mất máu) nhưng đổi chiều: ở
 * đây là số lá TĂNG (rút bài đầu lượt/Wells Fargo/Xe ngựa…) mới coi là "vừa rút", không phải
 * GIẢM (đánh/bỏ bài — không cần hiệu ứng bay vào, chỉ biến mất khỏi tay).
 * Không kích hoạt ở lần render đầu tiên (mount không phải là "vừa rút bài").
 */
export function useCardDrawFlash(handLength: number): boolean {
  const prevLength = useRef(handLength);
  const [flashing, setFlashing] = useState(false);

  useEffect(() => {
    if (handLength > prevLength.current) {
      setFlashing(true);
      const timer = setTimeout(() => setFlashing(false), DRAW_FLASH_DURATION_MS);
      prevLength.current = handLength;
      return () => clearTimeout(timer);
    }
    prevLength.current = handLength;
  }, [handLength]);

  return flashing;
}
