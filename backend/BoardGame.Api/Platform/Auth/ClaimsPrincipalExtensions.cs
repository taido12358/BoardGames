using System.Security.Claims;

namespace BoardGame.Api.Platform.Auth;

/// <summary>
/// Đọc danh tính từ ClaimsPrincipal ĐÃ XÁC THỰC (JWT cookie qua middleware) — dùng ở mọi nơi
/// cần biết "ai đang gọi" (GameHub, GamesController…), thay vì tin tham số client tự gửi.
/// Lỗ hổng đã sửa 2026-08-05: GameHub từng nhận "playerName" thẳng từ client để gán ghế —
/// ai cũng giả được người khác chỉ bằng cách gửi đúng chuỗi tên (xem rules/history/decisions.md).
/// </summary>
public static class ClaimsPrincipalExtensions
{
    /// <summary>User id (Guid) — null nếu chưa đăng nhập/token không hợp lệ.</summary>
    public static Guid? TryGetUserId(this ClaimsPrincipal user)
    {
        // JwtSecurityTokenHandler mặc định map "sub" -> ClaimTypes.NameIdentifier khi đọc lại
        // token — kiểm cả hai để không phụ thuộc cấu hình MapInboundClaims (xem TokenService).
        var idClaim = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("sub");
        return Guid.TryParse(idClaim, out var id) ? id : null;
    }

    /// <summary>Tên hiển thị hiện tại (đồng bộ mỗi lần đăng nhập/đổi tên — xem AuthController).</summary>
    public static string GetDisplayName(this ClaimsPrincipal user) =>
        user.FindFirstValue(ClaimTypes.Name) ?? user.FindFirstValue("name") ?? "Ẩn danh";
}
