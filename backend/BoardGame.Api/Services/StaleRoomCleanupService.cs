using BoardGame.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace BoardGame.Api.Services;

/// <summary>
/// Dọn định kỳ các phòng "Waiting" bị bỏ dở quá lâu (không đủ người, không ai quay lại) —
/// tránh phòng rác tồn đọng vĩnh viễn làm nhiễu danh sách phòng thật (bài học 2026-08-05:
/// phòng test "Waiting" từ nhiều giờ trước vẫn hiện trong sảnh vì chưa có gì dọn chúng).
///
/// Đánh dấu "Finished" (không xoá — vẫn giữ lịch sử) — GamesController.List() đã lọc
/// "Status != Finished" nên phòng tự động biến mất khỏi sảnh, không cần sửa gì thêm.
/// </summary>
public class StaleRoomCleanupService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(5);
    private static readonly TimeSpan StaleAfter = TimeSpan.FromMinutes(30);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<StaleRoomCleanupService> _log;

    public StaleRoomCleanupService(IServiceScopeFactory scopeFactory, ILogger<StaleRoomCleanupService> log)
    {
        _scopeFactory = scopeFactory;
        _log = log;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try { await CleanupOnce(stoppingToken); }
            catch (Exception ex) { _log.LogWarning(ex, "Dọn phòng rác thất bại — thử lại ở lần chạy sau"); }

            try { await Task.Delay(Interval, stoppingToken); }
            catch (OperationCanceledException) { /* app đang tắt — thoát vòng lặp qua điều kiện while */ }
        }
    }

    private async Task CleanupOnce(CancellationToken ct)
    {
        // DbContext là scoped — BackgroundService là singleton, phải tự tạo scope mỗi lần chạy.
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var cutoff = DateTime.UtcNow - StaleAfter;
        var staleIds = await db.GameRooms
            .Where(r => r.Status == "Waiting" && r.UpdatedAt < cutoff)
            .Select(r => r.Id)
            .ToListAsync(ct);

        var cleaned = 0;
        foreach (var roomId in staleIds)
        {
            // Đọc lại + lưu từng phòng riêng — một phòng vừa có người vào (đổi UpdatedAt,
            // trượt concurrency token) không được chặn việc dọn các phòng còn lại.
            var room = await db.GameRooms.FindAsync([roomId], ct);
            if (room is null || room.Status != "Waiting") continue;

            room.Status = "Finished";
            room.UpdatedAt = DateTime.UtcNow;
            try { await db.SaveChangesAsync(ct); cleaned++; }
            catch (DbUpdateConcurrencyException) { db.Entry(room).Reload(); } // vừa bị đổi — bỏ qua, dọn lần sau
        }

        if (cleaned > 0)
            _log.LogInformation("Đã dọn {Count} phòng Waiting bỏ dở quá {Minutes} phút.", cleaned, StaleAfter.TotalMinutes);
    }
}
