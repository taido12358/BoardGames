import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ChangeFlashState } from "../useChangeFlash";
import { useReducedMotionPreference } from "../../hooks/useReducedMotionPreference";

const DRAW_FLASH_DURATION_MS = 500;

/**
 * Trả `true` trong {@link DRAW_FLASH_DURATION_MS}ms ngay sau khi `handLength` TĂNG so với lần
 * render trước — dùng để kích hoạt animation "bài bay từ nọc vào tay" (van-de.md §46, "Card draw:
 * card moves from deck to hand"). Cùng khuôn với `useDamageShake` (mất máu) nhưng đổi chiều: ở
 * đây là số lá TĂNG (rút bài đầu lượt/Wells Fargo/Xe ngựa…) mới coi là "vừa rút", không phải
 * GIẢM (đánh/bỏ bài — không cần hiệu ứng bay vào, chỉ biến mất khỏi tay).
 * Không kích hoạt ở lần render đầu tiên (mount không phải là "vừa rút bài").
 */
export function useCardDrawFlashState(handLength: number, roomId?: string): ChangeFlashState {
  const reducedMotion = useReducedMotionPreference();
  const prevLength = useRef(handLength);
  const previousRoomId = useRef(roomId);
  const sequence = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const [flashing, setFlashing] = useState<ChangeFlashState>({ active: false, sequence: 0 });

  useLayoutEffect(() => {
    if (roomId !== previousRoomId.current) {
      previousRoomId.current = roomId;
      prevLength.current = handLength;
      setFlashing({ active: false, sequence: sequence.current });
      window.clearTimeout(timer.current);
      return;
    }
    if (handLength > prevLength.current) {
      sequence.current += 1;
      const activeSequence = sequence.current;
      setFlashing({ active: true, sequence: activeSequence });
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        if (sequence.current !== activeSequence) return;
        setFlashing((current) => current.sequence === activeSequence ? { ...current, active: false } : current);
      }, reducedMotion ? 180 : DRAW_FLASH_DURATION_MS);
      prevLength.current = handLength;
      return;
    }
    prevLength.current = handLength;
  }, [handLength, roomId, reducedMotion]);

  useEffect(() => {
    if (!reducedMotion || !flashing.active) return;
    const activeSequence = flashing.sequence;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (sequence.current !== activeSequence) return;
      setFlashing((current) => current.sequence === activeSequence ? { ...current, active: false } : current);
    }, 180);
  }, [reducedMotion, flashing.active, flashing.sequence]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return flashing;
}

/** Boolean compatibility API for callers that only need an active flag. */
export function useCardDrawFlash(handLength: number, roomId?: string): boolean {
  return useCardDrawFlashState(handLength, roomId).active;
}
