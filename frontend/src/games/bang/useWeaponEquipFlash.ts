import { useChangeFlash, type ChangeFlashState } from "../useChangeFlash";

/**
 * Trả `true` trong {@link EQUIP_FLASH_DURATION_MS}ms ngay sau khi `weaponName` ĐỔI so với lần
 * render trước — dùng để kích hoạt animation "trang bị vũ khí" (van-de.md §46, "Weapon: weapon
 * equip animation"). Cùng khuôn với `useDamageShake`/`useCardDrawFlash` nhưng so sánh THAY ĐỔI
 * chuỗi thay vì tăng/giảm số. Không kích hoạt ở lần render đầu tiên (mount không phải là "vừa
 * trang bị" — đó chỉ là vũ khí mặc định Cattleman lúc vào ván).
 */
export function useWeaponEquipFlashState(weaponName: string, roomId?: string): ChangeFlashState {
  return useChangeFlash(weaponName, 500, roomId);
}

/** Boolean compatibility API for callers that only need an active flag. */
export function useWeaponEquipFlash(weaponName: string, roomId?: string): boolean {
  return useWeaponEquipFlashState(weaponName, roomId).active;
}
