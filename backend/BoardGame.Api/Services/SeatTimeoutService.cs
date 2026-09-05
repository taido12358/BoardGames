using BoardGame.Api.Data;
using BoardGame.Api.Platform;
using BoardGame.Api.Platform.Abstractions;
using BoardGame.Api.Platform.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace BoardGame.Api.Services;

/// <summary>
/// Phát hiện &amp; xử lý ghế mất kết nối quá lâu GIỮA VÁN (khác StaleRoomCleanupService — service
/// đó chỉ dọn phòng "Waiting" bỏ dở, không đụng "Playing"). GameHub.OnDisconnectedAsync đã đánh
/// dấu Connected=false qua RoomService.MarkSeatDisconnectedAsync ngay khi rớt mạng; sau
/// DisconnectGracePeriod service này giao engine tự quyết xử lý (IGameEngine.OnSeatTimedOut) —
/// generic ở Platform, mỗi game tự định nghĩa hành vi (VayBat: xử thua ngay vì chỉ 2 người;
/// Bang: tự động kết thúc lượt/tự động "không đáp trả" đúng luật mặc định).
///
/// Nếu MỌI ghế đã có người đều mất kết nối quá lâu mà engine vẫn không xử lý ra được kết quả
/// (hiếm — ví dụ mọi người cùng rớt mạng một lúc, không ai để "kết thúc lượt"/"phản hồi" mà
/// timeout), đánh dấu Abandoned thay vì để phòng kẹt "Playing" vĩnh viễn.
/// </summary>
public class SeatTimeoutService : BackgroundService
{
    private static readonly TimeSpan ScanInterval = TimeSpan.FromSeconds(10);
    private static readonly TimeSpan DisconnectGracePeriod = TimeSpan.FromSeconds(45);
    private static readonly TimeSpan AbandonedPlayingAfter = TimeSpan.FromMinutes(10);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<SeatTimeoutService> _log;

    public SeatTimeoutService(IServiceScopeFactory scopeFactory, ILogger<SeatTimeoutService> log)
    {
        _scopeFactory = scopeFactory;
        _log = log;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try { await ScanOnce(stoppingToken); }
            catch (Exception ex) { _log.LogWarning(ex, "Quét ghế mất kết nối thất bại — thử lại ở lần sau"); }

            try { await Task.Delay(ScanInterval, stoppingToken); }
            catch (OperationCanceledException) { /* app đang tắt — thoát vòng lặp qua điều kiện while */ }
        }
    }

    private async Task ScanOnce(CancellationToken ct)
    {
        // DbContext/RoomService là scoped — BackgroundService là singleton, phải tự tạo scope.
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var rooms = scope.ServiceProvider.GetRequiredService<RoomService>();
        var engines = scope.ServiceProvider.GetRequiredService<GameEngineRegistry>();
        var hub = scope.ServiceProvider.GetRequiredService<IHubContext<GameHub>>();

        var now = DateTime.UtcNow;
        var playingRooms = await db.GameRooms.Where(r => r.Status == RoomStatus.Playing).ToListAsync(ct);

        foreach (var room in playingRooms)
        {
            if (!engines.Has(room.GameKey)) continue;
            var engine = engines.Get(room.GameKey);

            var timedOutIdx = SeatCodec.SeatsOf(room)
                .Select((s, idx) => (Seat: s, Index: idx))
                .Where(x => x.Seat is not null && !x.Seat.Connected && now - x.Seat.LastSeenAt > DisconnectGracePeriod)
                .Select(x => x.Index)
                .ToList();

            foreach (var idx in timedOutIdx)
            {
                // RoomService.ApplySeatTimeoutAsync dùng CHUNG DbContext (cùng scope) — EF tự
                // identity-resolve về đúng "room" instance ở trên, nên sau lời gọi này room đã
                // phản ánh state/status mới nhất mà không cần đọc lại.
                var (updatedRoom, outcome) = await rooms.ApplySeatTimeoutAsync(room.Id, engine.SideForSeat(idx));
                if (updatedRoom is null || outcome is null) continue; // no-op (chưa liên quan lượt/phản hồi hiện tại) — thử lại lần quét sau

                await GameHub.BroadcastRoomStateAsync(hub.Clients, room.Id.ToString(), updatedRoom, engine);
                break; // state đã đổi hẳn — các ghế timeout còn lại của phòng này để lần quét sau
            }

            if (room.Status != RoomStatus.Playing) continue; // vừa có kết quả ở trên, hoặc vốn đã đổi

            var seatedNow = SeatCodec.SeatsOf(room).Where(s => s is not null).ToList();
            if (seatedNow.Count == 0) continue;
            var allDisconnectedTooLong = seatedNow.All(s => !s!.Connected) &&
                now - seatedNow.Max(s => s!.LastSeenAt) > AbandonedPlayingAfter;
            if (!allDisconnectedTooLong) continue;

            room.Status = RoomStatus.Abandoned;
            room.UpdatedAt = now;
            try { await db.SaveChangesAsync(ct); }
            catch (DbUpdateConcurrencyException) { db.Entry(room).Reload(); } // vừa đổi lúc khác — bỏ qua, xử lý lần sau
        }
    }
}
