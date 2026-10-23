import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * React Router (mặc định) không tự cuộn về đầu trang khi đổi route — khác hành vi
 * điều hướng trang thường của trình duyệt. Không có cái này, chuyển từ giữa trang
 * chi tiết game (đã cuộn xuống) sang trang khác sẽ giữ nguyên vị trí cuộn cũ, gây
 * cảm giác trang bị lỗi/trống. Đặt component này bên trong <BrowserRouter>.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();
  const previousPath = useRef(pathname);
  useEffect(() => {
    window.scrollTo(0, 0);
    if (previousPath.current !== pathname) {
      document.getElementById("main-content")?.focus({ preventScroll: true });
      previousPath.current = pathname;
    }
  }, [pathname]);
  return null;
}
