import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ChangeFlashState } from "../useChangeFlash";
import { useReducedMotionPreference } from "../../hooks/useReducedMotionPreference";

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
export function useMuzzleFlashState(gameLog: string[], roomId?: string): ChangeFlashState {
  const reducedMotion = useReducedMotionPreference();
  const prevLength = useRef(gameLog.length);
  const previousRoomId = useRef(roomId);
  const sequence = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const [flashing, setFlashing] = useState<ChangeFlashState>({ active: false, sequence: 0 });

  useLayoutEffect(() => {
    if (roomId !== previousRoomId.current) {
      previousRoomId.current = roomId;
      prevLength.current = gameLog.length;
      setFlashing({ active: false, sequence: sequence.current });
      window.clearTimeout(timer.current);
      return;
    }
    if (gameLog.length > prevLength.current) {
      const newEntries = gameLog.slice(prevLength.current);
      if (newEntries.some((entry) => SHOT_PATTERN.test(entry))) {
        sequence.current += 1;
        const activeSequence = sequence.current;
        setFlashing({ active: true, sequence: activeSequence });
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => {
          if (sequence.current !== activeSequence) return;
          setFlashing((current) => current.sequence === activeSequence ? { ...current, active: false } : current);
        }, reducedMotion ? 180 : MUZZLE_FLASH_DURATION_MS);
      }
    }
    prevLength.current = gameLog.length;
  }, [gameLog, roomId, reducedMotion]);

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

/** Boolean compatibility wrapper for callers that only need to know whether a flash is active. */
export function useMuzzleFlash(gameLog: string[], roomId?: string): boolean {
  return useMuzzleFlashState(gameLog, roomId).active;
}
