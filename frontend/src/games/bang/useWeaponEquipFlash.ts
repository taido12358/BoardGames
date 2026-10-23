import { useEffect, useRef, useState } from "react";

const EQUIP_FLASH_DURATION_MS = 500;

/**
 * Trả `true` trong {@link EQUIP_FLASH_DURATION_MS}ms ngay sau khi `weaponName` ĐỔI so với lần
 * render trước — dùng để kích hoạt animation "trang bị vũ khí" (van-de.md §46, "Weapon: weapon
 * equip animation"). Cùng khuôn với `useDamageShake`/`useCardDrawFlash` nhưng so sánh THAY ĐỔI
 * chuỗi thay vì tăng/giảm số. Không kích hoạt ở lần render đầu tiên (mount không phải là "vừa
 * trang bị" — đó chỉ là vũ khí mặc định Cattleman lúc vào ván).
 */
export function useWeaponEquipFlash(weaponName: string): boolean {
  const prevWeapon = useRef(weaponName);
  const [flashing, setFlashing] = useState(false);

  useEffect(() => {
    if (weaponName !== prevWeapon.current) {
      setFlashing(true);
      const timer = setTimeout(() => setFlashing(false), EQUIP_FLASH_DURATION_MS);
      prevWeapon.current = weaponName;
      return () => clearTimeout(timer);
    }
    prevWeapon.current = weaponName;
  }, [weaponName]);

  return flashing;
}
