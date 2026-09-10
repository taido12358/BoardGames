using BoardGame.Api.Data;
using BoardGame.Api.Platform.Auth;
using BoardGame.Api.Platform.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BoardGame.Api.Platform;

/// <summary>
/// Trang quản trị READ-ONLY cho người vận hành xem tổng quan phòng/ván đang chạy trên toàn hệ
/// thống — CHỦ Ý không có thao tác phá huỷ (huỷ/xoá phòng) để tránh lặp lại sự cố mất dữ liệu
/// dev thật 2026-09-05 (xem rules/logs/2026-09-05.md). Cần thao tác phá huỷ thật thì làm ở đợt
/// sau, có xác nhận riêng, và phải log ai-làm-gì-lúc-nào theo rules/coding/security.md.
///
/// Phân quyền: role "Admin" được gán vào claim JWT lúc đăng nhập (<see cref="Auth.TokenService.CreateToken"/>)
/// nếu email nằm trong ADMIN_EMAILS (CSV, rỗng mặc định — xem .env.example) — kiểm bằng
/// <see cref="AuthorizeAttribute.Roles"/> chuẩn ASP.NET Core, KHÔNG tự đọc config/so sánh email
/// thủ công trong từng action (đúng pattern rules/coding/security.md mục "Phân quyền").
/// </summary>
[Authorize]
[ApiController]
[Route("api/admin")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<AdminController> _log;

    public AdminController(AppDbContext db, ILogger<AdminController> log)
    {
        _db = db;
        _log = log;
    }

    /// <summary>Bất kỳ ai đã đăng nhập gọi được (không yêu cầu role Admin) — frontend dùng để
    /// quyết định có hiện mục "Quản trị" hay không, trả `false` cho người dùng thường thay vì 403.</summary>
    [HttpGet("check")]
    public ActionResult<object> Check() => Ok(new { isAdmin = User.IsInRole("Admin") });

    /// <summary>Danh sách phòng gần đây nhất trên toàn hệ thống (mọi trạng thái), có thể lọc.</summary>
    [HttpGet("rooms")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<object>> Rooms([FromQuery] string? status, [FromQuery] string? gameKey)
    {
        _log.LogInformation("Admin {Email} xem danh sách phòng (status={Status}, gameKey={GameKey})",
            User.TryGetEmail(), status, gameKey);

        var query = _db.GameRooms.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(r => r.Status == status);
        if (!string.IsNullOrWhiteSpace(gameKey)) query = query.Where(r => r.GameKey == gameKey);

        // Giới hạn 200 — trang quản trị xem nhanh tình trạng hiện tại, không phải báo cáo lịch sử đầy đủ.
        var rooms = await query.OrderByDescending(r => r.UpdatedAt).Take(200).ToListAsync();

        var ownerIds = rooms.Select(r => r.OwnerUserId).Distinct().ToList();
        var owners = await _db.Users.AsNoTracking()
            .Where(u => ownerIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.DisplayName);

        var result = rooms.Select(r => new
        {
            r.Id,
            r.GameKey,
            r.Status,
            r.Winner,
            r.SeatCount,
            Seats = SeatCodec.SeatsOf(r).Select(s => s?.DisplayName).ToList(),
            OwnerDisplayName = owners.GetValueOrDefault(r.OwnerUserId, "?"),
            r.CreatedAt,
            r.UpdatedAt,
        });
        return Ok(result);
    }

    /// <summary>Thống kê nhanh — số phòng theo trạng thái/theo game, tổng số tài khoản.</summary>
    [HttpGet("stats")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<object>> Stats()
    {
        var byStatus = await _db.GameRooms.AsNoTracking()
            .GroupBy(r => r.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();
        var byGame = await _db.GameRooms.AsNoTracking()
            .GroupBy(r => r.GameKey)
            .Select(g => new { GameKey = g.Key, Count = g.Count() })
            .ToListAsync();
        var totalUsers = await _db.Users.CountAsync();

        return Ok(new { byStatus, byGame, totalUsers });
    }
}
