using System.Text.Json;
using BoardGame.Api.Data;
using BoardGame.Api.Games.Bang;
using BoardGame.Api.Games.VayBat;
using BoardGame.Api.Platform;
using BoardGame.Api.Platform.Abstractions;
using BoardGame.Api.Platform.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Testcontainers.PostgreSql;
using Xunit;

namespace BoardGame.Api.Tests.Platform;

/// <summary>
/// Test tích hợp CHẠM POSTGRES THẬT (Testcontainers — container Postgres tạm cho riêng từng
/// test, tự huỷ sau khi chạy xong, KHÔNG BAO GIỜ đụng tới DB dev/production nào). Trả nợ kỹ
/// thuật ghi trong rules/tasks/backlog.md từ 2026-08-05/2026-09-05: các hành vi dưới đây chỉ có
/// ý nghĩa khi có khoá hàng THẬT (<c>SELECT ... FOR UPDATE</c> / <c>FOR UPDATE SKIP LOCKED</c>)
/// — EF Core InMemory hay test luật thuần không mô phỏng được race condition thật giữa nhiều
/// connection/transaction đồng thời.
///
/// Mỗi test tự dựng <see cref="AppDbContext"/>/<see cref="RoomService"/> RIÊNG cho mỗi "request"
/// mô phỏng (không share instance giữa các cuộc gọi đồng thời) — đúng vòng đời "1 DbContext /
/// 1 request" thật của ASP.NET Core; DbContext không thread-safe nếu dùng chung.
///
/// xUnit tạo lại instance class này (và chạy lại <see cref="InitializeAsync"/>) cho MỖI test —
/// đổi lấy tốc độ (mỗi test ~1 container Postgres riêng) để lấy cô lập tuyệt đối, không rủi ro
/// test này ảnh hưởng dữ liệu của test khác.
/// </summary>
public class RoomServiceIntegrationTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder("postgres:16-alpine")
        .WithDatabase("boardgame_test")
        .WithUsername("postgres")
        .WithPassword("test")
        .Build();

    public async Task InitializeAsync()
    {
        await _container.StartAsync();
        using var db = NewDbContext();
        // maxAttempts:1 — container Testcontainers chỉ trả StartAsync xong khi Postgres đã sẵn
        // sàng nhận kết nối, không cần retry như lúc app thật boot cùng lúc với Docker Compose.
        await SchemaBootstrapper.ApplyAsync(db, NullLogger.Instance, maxAttempts: 1);
    }

    public Task DisposeAsync() => _container.DisposeAsync().AsTask();

    private AppDbContext NewDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(_container.GetConnectionString())
            .Options;
        return new AppDbContext(options);
    }

    private static GameEngineRegistry NewRegistry()
        => new(new IGameEngine[] { new VayBatEngine(), new BangEngine() });

    /// <summary>DbContext + RoomService MỚI mỗi lần gọi — mô phỏng đúng 1 request thật.</summary>
    private RoomService NewRoomService() => new(NewDbContext(), NewRegistry(), NullLogger<RoomService>.Instance);

    [Fact]
    public async Task CreateRoomAsync_PersistsRoomWithOwnerSeatedAndCorrectSeatCount()
    {
        var userId = Guid.NewGuid();

        var (room, error) = await NewRoomService().CreateRoomAsync(
            "bang", userId, "Alice", JsonSerializer.SerializeToElement(new { seatCount = 4 }));

        Assert.Null(error);
        Assert.NotNull(room);
        Assert.Equal(4, room!.SeatCount);
        Assert.Equal(RoomStatus.Waiting, room.Status);

        // Đọc lại bằng DbContext KHÁC — xác nhận đã thật sự persist xuống Postgres, không phải
        // chỉ còn trong bộ nhớ của instance vừa gọi.
        using var verifyDb = NewDbContext();
        var persisted = await verifyDb.GameRooms.FindAsync(room.Id);
        Assert.NotNull(persisted);
        var seats = SeatCodec.SeatsOf(persisted!);
        Assert.Equal(userId, seats[0]?.UserId);
    }

    [Fact]
    public async Task JoinRoomAsync_ConcurrentJoinsMoreThanOpenSeats_NoTwoUsersGetSameSeat()
    {
        var ownerId = Guid.NewGuid();
        var (room, _) = await NewRoomService().CreateRoomAsync(
            "bang", ownerId, "Owner", JsonSerializer.SerializeToElement(new { seatCount = 4 }));
        Assert.NotNull(room);

        // Chủ phòng đã chiếm ghế 0 -> còn 3 ghế trống. Cho 5 người tranh cùng lúc: nếu khoá FOR
        // UPDATE không hoạt động đúng, có thể 2 người cùng đọc thấy "ghế 1 còn trống" rồi cùng
        // ghi vào ghế 1, làm mất 1 người/ghi đè lẫn nhau.
        var joiners = Enumerable.Range(0, 5).Select(i => (UserId: Guid.NewGuid(), Name: $"P{i}")).ToList();
        var results = await Task.WhenAll(joiners.Select(j => NewRoomService().JoinRoomAsync(room!.Id, j.UserId, j.Name)));

        var seatedSides = results.Select(r => r.Side).Where(s => s is not null).ToList();
        Assert.Equal(3, seatedSides.Count); // đúng bằng số ghế trống, 2 người thừa thành khán giả
        Assert.Equal(seatedSides.Count, seatedSides.Distinct().Count()); // không ai bị gán trùng ghế

        using var verifyDb = NewDbContext();
        var persisted = await verifyDb.GameRooms.FindAsync(room!.Id);
        var seats = SeatCodec.SeatsOf(persisted!);
        Assert.All(seats, Assert.NotNull); // đủ 4 ghế đều có người — không ghế nào bị "mất" giữa chừng
        Assert.Equal(4, seats.Select(s => s!.UserId).Distinct().Count()); // 4 UserId khác nhau, không trùng
    }

    [Fact]
    public async Task CancelRoomAsync_ConcurrentCancelAttemptsByOwner_OnlyOneSucceeds()
    {
        var ownerId = Guid.NewGuid();
        var (room, _) = await NewRoomService().CreateRoomAsync("vaybat", ownerId, "Owner", null);
        Assert.NotNull(room);

        // Không có khoá FOR UPDATE thật, 2+ transaction có thể cùng đọc thấy Status=Waiting
        // trước khi transaction nào commit -> cùng trả Ok (mâu thuẫn logic "huỷ 1 phòng 2 lần").
        var outcomes = await Task.WhenAll(
            Enumerable.Range(0, 5).Select(_ => NewRoomService().CancelRoomAsync(room!.Id, ownerId)));

        Assert.Single(outcomes, o => o == RoomService.CancelOutcome.Ok);
        Assert.Equal(4, outcomes.Count(o => o == RoomService.CancelOutcome.NotWaiting));

        using var verifyDb = NewDbContext();
        var persisted = await verifyDb.GameRooms.FindAsync(room!.Id);
        Assert.Equal(RoomStatus.Cancelled, persisted!.Status);
    }

    [Fact]
    public async Task QuickMatchAsync_ConcurrentRequestsForLastOpenSeat_OnlyOneJoinsExistingRoom()
    {
        // Phòng VayBat (2 ghế) có sẵn 1 người -> còn đúng 1 ghế trống, là "ứng viên ghép trận"
        // duy nhất. Không có SKIP LOCKED đúng cách, nhiều QuickMatch đồng thời có thể cùng thấy
        // ghế này còn trống và cùng ghi vào, làm hỏng SeatsJson (ghi đè lẫn nhau).
        var firstUserId = Guid.NewGuid();
        var (existingRoom, _) = await NewRoomService().CreateRoomAsync("vaybat", firstUserId, "First", null);
        Assert.NotNull(existingRoom);

        var joiners = Enumerable.Range(0, 4).Select(i => (UserId: Guid.NewGuid(), Name: $"Q{i}")).ToList();
        var results = await Task.WhenAll(joiners.Select(j => NewRoomService().QuickMatchAsync("vaybat", j.UserId, j.Name)));

        // Đúng 1 người ghép được vào phòng có sẵn; những người còn lại server tự tạo phòng mới
        // riêng cho từng người (vaybat chỉ 2 ghế nên mỗi phòng mới đó lại chờ người thứ 2 khác).
        var joinedExisting = results.Count(r => r.Room?.Id == existingRoom!.Id);
        Assert.Equal(1, joinedExisting);

        using var verifyDb = NewDbContext();
        var persistedExisting = await verifyDb.GameRooms.FindAsync(existingRoom!.Id);
        var seats = SeatCodec.SeatsOf(persistedExisting!);
        Assert.All(seats, Assert.NotNull); // ghế cuối có ĐÚNG 1 người, không bị ghi đè/mất
        Assert.Equal(2, seats.Select(s => s!.UserId).Distinct().Count());
    }

    [Fact]
    public async Task ApplySeatTimeoutAsync_ConcurrentCallsOnSameSeat_OnlyFirstProducesOutcome()
    {
        var redId = Guid.NewGuid();
        var whiteId = Guid.NewGuid();
        var (room, _) = await NewRoomService().CreateRoomAsync("vaybat", redId, "Red", null);
        Assert.NotNull(room);
        await NewRoomService().JoinRoomAsync(room!.Id, whiteId, "White"); // đủ 2 ghế -> tự chuyển Playing

        // Không có khoá FOR UPDATE thật, nhiều lần gọi timeout đồng thời cho CÙNG 1 ghế có thể
        // cùng đọc thấy "chưa có Winner" và cùng ghi kết quả (2 GameMove __seat_timeout__ thay vì 1).
        var results = await Task.WhenAll(
            Enumerable.Range(0, 5).Select(_ => NewRoomService().ApplySeatTimeoutAsync(room!.Id, "RED")));

        Assert.Equal(1, results.Count(r => r.Outcome is not null)); // chỉ lần đầu tạo kết quả thật

        using var verifyDb = NewDbContext();
        var persisted = await verifyDb.GameRooms.FindAsync(room!.Id);
        Assert.Equal(RoomStatus.Finished, persisted!.Status);
        Assert.Equal("WHITE", persisted.Winner);

        // Lọc riêng Side="RED" (không đếm luôn move "__room_full__" Side="SYSTEM" mà
        // JoinRoomAsync đã ghi lúc đủ ghế) — chỉ quan tâm move timeout có bị ghi trùng không.
        var timeoutMoveCount = await verifyDb.GameMoves.CountAsync(m => m.RoomId == room.Id && m.Side == "RED");
        Assert.Equal(1, timeoutMoveCount); // đúng 1 GameMove __seat_timeout__, không bị ghi trùng
    }
}
