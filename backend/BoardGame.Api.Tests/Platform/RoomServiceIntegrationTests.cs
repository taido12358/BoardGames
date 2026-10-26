using System.Text.Json;
using BoardGame.Api.Data;
using BoardGame.Api.Games.Bang;
using BoardGame.Api.Games.Monopoly;
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
        => new(new IGameEngine[] { new VayBatEngine(), new BangEngine(), new MonopolyEngine() });

    /// <summary>DbContext + RoomService MỚI mỗi lần gọi — mô phỏng đúng 1 request thật.</summary>
    private RoomService NewRoomService() => new(NewDbContext(), NewRegistry(), NullLogger<RoomService>.Instance);

    [Theory]
    [InlineData("LocalHeartbeat")]
    [InlineData("OtherHostHeartbeat")]
    [InlineData("LeaveAfterSnapshot")]
    [InlineData("ExpiredAfterCrash")]
    public async Task PresenceRefreshUsesLockedTimestampsWithoutChangingGameOrCreatingMoves(string scenario)
    {
        var users = new[] { Guid.NewGuid(), Guid.NewGuid() };
        var (created, _) = await NewRoomService().CreateRoomAsync("monopoly", users[0], "Alice",
            JsonSerializer.SerializeToElement(new { seatCount = 2 }));
        Assert.NotNull(created);
        await NewRoomService().JoinRoomAsync(created.Id, users[1], "Bob");
        var observedAt = DateTime.UtcNow.AddSeconds(-1);
        using (var arrange = NewDbContext())
        {
            var room = await arrange.GameRooms.SingleAsync(r => r.Id == created.Id);
            SeatCodec.SetSeats(room, SeatCodec.SeatsOf(room).Select(seat => seat! with
                { Connected = true, LastSeenAt = observedAt.AddMinutes(-2) }).ToArray());
            await arrange.SaveChangesAsync();
        }
        using var scanningDb = NewDbContext();
        var scanned = await scanningDb.GameRooms.SingleAsync(r => r.Id == created.Id);
        var stateBefore = scanned.StateJson;
        var countBefore = await scanningDb.GameMoves.CountAsync(m => m.RoomId == created.Id);
        if (scenario == "OtherHostHeartbeat")
            await NewRoomService().RefreshSeatPresenceAsync(created.Id, new HashSet<Guid> { users[1] },
                DateTime.UtcNow, observedAt.AddSeconds(-45));
        if (scenario == "LeaveAfterSnapshot")
            await NewRoomService().MarkSeatDisconnectedAsync(created.Id, users[1]);
        var localUsers = scenario is "LocalHeartbeat" or "LeaveAfterSnapshot" ? new HashSet<Guid> { users[1] } : [];
        await new RoomService(scanningDb, NewRegistry(), NullLogger<RoomService>.Instance)
            .RefreshSeatPresenceAsync(created.Id, localUsers, observedAt, observedAt.AddSeconds(-45));
        using var verify = NewDbContext();
        var persisted = await verify.GameRooms.SingleAsync(r => r.Id == created.Id);
        var seat = SeatCodec.SeatsOf(persisted)[1]!;
        Assert.Equal(scenario is "LocalHeartbeat" or "OtherHostHeartbeat", seat.Connected);
        if (scenario == "ExpiredAfterCrash") Assert.True(seat.LastSeenAt < observedAt.AddSeconds(-45));
        else Assert.True(seat.LastSeenAt > observedAt.AddSeconds(-1));
        Assert.Equal(stateBefore, persisted.StateJson);
        Assert.Equal(countBefore, await verify.GameMoves.CountAsync(m => m.RoomId == created.Id));
    }

    [Fact]
    public async Task TimeoutRefreshesTrackedRoomAfterConcurrentPurchaseWithoutConcurrencyFailure()
    {
        var users=new[]{Guid.NewGuid(),Guid.NewGuid()};
        var (created,_)=await NewRoomService().CreateRoomAsync("monopoly",users[0],"Alice",JsonSerializer.SerializeToElement(new{seatCount=2}));
        Assert.NotNull(created);await NewRoomService().JoinRoomAsync(created.Id,users[1],"Bob");
        using(var prepare=NewDbContext())
        {
            var room=await prepare.GameRooms.FindAsync(created.Id);Assert.NotNull(room);
            var state=GameJson.Deserialize<MonopolyState>(room.StateJson);
            state.Turn=0;state.Phase="Buy";state.Players[0].Position=1;
            room.StateJson=GameJson.Serialize(state);await prepare.SaveChangesAsync();
        }
        // SeatTimeoutService scans tracked rooms before locking any one room. Another request
        // may commit between those operations, even though the later SELECT obtains a row lock.
        using var scanningDb=NewDbContext();
        var scanned=await scanningDb.GameRooms.SingleAsync(r=>r.Id==created.Id);
        Assert.Equal("Buy",GameJson.Deserialize<MonopolyState>(scanned.StateJson).Phase);
        var (_,purchase,_,error)=await NewRoomService().MakeMoveAsync(created.Id,users[0],"{\"type\":\"BUY\"}");
        Assert.Null(error);Assert.NotNull(purchase);Assert.True(purchase.Ok);
        var timeoutService=new RoomService(scanningDb,NewRegistry(),NullLogger<RoomService>.Instance);
        var (_,outcome)=await timeoutService.ApplySeatTimeoutAsync(created.Id,"P0");
        Assert.NotNull(outcome);Assert.True(outcome.Ok);
        using var verify=NewDbContext();var persisted=await verify.GameRooms.AsNoTracking().SingleAsync(r=>r.Id==created.Id);
        var final=GameJson.Deserialize<MonopolyState>(persisted.StateJson);
        Assert.Equal(0,final.Properties[1].Owner);Assert.Equal(1440,final.Players[0].Cash);
        Assert.Equal(1,final.Turn);Assert.Equal("Roll",final.Phase);Assert.Null(final.Auction);
    }

    [Fact]
    public async Task Monopoly_BuildingDemandPersistsWithoutSpendingAndTimeoutBuysAtFaceValue()
    {
        var users=new[]{Guid.NewGuid(),Guid.NewGuid()};
        var (created,error)=await NewRoomService().CreateRoomAsync("monopoly",users[0],"Alice",JsonSerializer.SerializeToElement(new{seatCount=2}));
        Assert.Null(error);Assert.NotNull(created);await NewRoomService().JoinRoomAsync(created.Id,users[1],"Bob");
        using(var db=NewDbContext())
        {
            var room=await db.GameRooms.FindAsync(created.Id);Assert.NotNull(room);
            var state=GameJson.Deserialize<MonopolyState>(room.StateJson);state.Turn=0;state.Phase="Roll";state.Houses=1;
            foreach(var i in new[]{1,3})state.Properties[i].Owner=0;
            foreach(var i in new[]{37,39})state.Properties[i].Owner=1;
            room.StateJson=GameJson.Serialize(state);await db.SaveChangesAsync();
        }
        var (_,built,_,buildError)=await NewRoomService().MakeMoveAsync(created.Id,users[0],"{\"type\":\"BUILD\",\"tile\":1}");
        Assert.Null(buildError);Assert.NotNull(built);Assert.True(built.Ok);
        using(var verify=NewDbContext())
        {
            var room=await verify.GameRooms.AsNoTracking().SingleAsync(r=>r.Id==created.Id);
            var state=GameJson.Deserialize<MonopolyState>(room.StateJson);
            Assert.Equal("BuildingDemand",state.Phase);Assert.Equal(1,MonopolyRules.Actor(state));
            Assert.Equal(1500,state.Players[0].Cash);Assert.Equal(0,state.Properties[1].Buildings);
            Assert.Equal(1,state.BuildingDemand!.Requests[0]);
            var frame=await verify.GameMoves.AsNoTracking().Where(m=>m.RoomId==created.Id).OrderByDescending(m=>m.MoveNumber).FirstAsync();
            Assert.Equal("BuildingDemand",GameJson.Element(frame.ReplayStateJson!).GetProperty("phase").GetString());
        }
        var (_,rejected,_,wrongError)=await NewRoomService().MakeMoveAsync(created.Id,users[0],"{\"type\":\"REQUEST_BUILD\",\"tile\":3}");
        Assert.Null(rejected);Assert.NotNull(wrongError);
        var (finished,outcome)=await NewRoomService().ApplySeatTimeoutAsync(created.Id,"P1");
        Assert.NotNull(outcome);Assert.True(outcome.Ok);Assert.NotNull(finished);
        var final=GameJson.Deserialize<MonopolyState>(finished.StateJson);
        Assert.Equal("Roll",final.Phase);Assert.Null(final.BuildingDemand);Assert.Null(final.Auction);
        Assert.Equal(1450,final.Players[0].Cash);Assert.Equal(1500,final.Players[1].Cash);Assert.Equal(0,final.Houses);
        using var check=NewDbContext();
        Assert.Equal(3,await check.GameMoves.CountAsync(m=>m.RoomId==created.Id));
    }

    [Fact]
    public async Task ReplaySnapshotSchemaUpgradePreservesLegacyRowsAndIsIdempotent()
    {
        // This fixture owns a disposable PostgreSQL container per test; emulate its old table only.
        using var db=NewDbContext();var roomId=Guid.NewGuid();
        await db.Database.ExecuteSqlRawAsync("ALTER TABLE \"GameMoves\" DROP COLUMN \"ReplayStateJson\"");
        var legacyMove="{\"type\":\"legacy\"}";
        await db.Database.ExecuteSqlInterpolatedAsync($"INSERT INTO \"GameMoves\" (\"RoomId\",\"MoveNumber\",\"Side\",\"MoveJson\",\"CreatedAt\") VALUES ({roomId},1,'P0',{legacyMove}::jsonb,now())");
        await SchemaBootstrapper.ApplyAsync(db,NullLogger.Instance,maxAttempts:1);
        await SchemaBootstrapper.ApplyAsync(db,NullLogger.Instance,maxAttempts:1);
        var preserved=await db.GameMoves.AsNoTracking().SingleAsync(m=>m.RoomId==roomId);
        Assert.Null(preserved.ReplayStateJson);Assert.Equal("legacy",GameJson.Element(preserved.MoveJson).GetProperty("type").GetString());
    }

    [Fact]
    public async Task Monopoly_InheritedMortgageChoiceSurvivesReloadAndResumesCorrectSeat()
    {
        var users=new[]{Guid.NewGuid(),Guid.NewGuid(),Guid.NewGuid()};
        var (created,error)=await NewRoomService().CreateRoomAsync("monopoly",users[0],"Alice",JsonSerializer.SerializeToElement(new{seatCount=3}));
        Assert.Null(error);Assert.NotNull(created);
        await NewRoomService().JoinRoomAsync(created.Id,users[1],"Bob");
        await NewRoomService().JoinRoomAsync(created.Id,users[2],"Carol");
        using(var db=NewDbContext())
        {
            var room=await db.GameRooms.FindAsync(created.Id);Assert.NotNull(room);
            var state=GameJson.Deserialize<MonopolyState>(room.StateJson);
            state.Turn=0;state.Phase="Inheritance";state.InheritanceResumePhase="End";
            state.Players[0].Bankrupt=true;state.Players[1].Cash=50;
            state.Properties[1].Owner=1;state.Properties[1].Mortgaged=true;
            state.InheritedMortgages=[new InheritedMortgage(1,1)];room.StateJson=GameJson.Serialize(state);
            await db.SaveChangesAsync();
        }
        var (_,wrong,_,wrongError)=await NewRoomService().MakeMoveAsync(created.Id,users[2],"{\"type\":\"REDEEM_INHERITED\"}");
        Assert.True(wrong is null || !wrong.Ok);Assert.NotNull(wrongError);
        var (moved,outcome,side,moveError)=await NewRoomService().MakeMoveAsync(created.Id,users[1],"{\"type\":\"REDEEM_INHERITED\"}");
        Assert.Null(moveError);Assert.NotNull(outcome);Assert.True(outcome.Ok);Assert.Equal("P1",side);Assert.NotNull(moved);
        using var verify=NewDbContext();var persisted=await verify.GameRooms.AsNoTracking().SingleAsync(r=>r.Id==created.Id);
        var final=GameJson.Deserialize<MonopolyState>(persisted.StateJson);
        Assert.Equal(17,final.Players[1].Cash);Assert.False(final.Properties[1].Mortgaged);
        Assert.Empty(final.InheritedMortgages);Assert.Equal(1,final.Turn);Assert.Equal("Roll",final.Phase);
    }

    [Fact]
    public async Task Monopoly_RoomStartMoveAndHiddenDecksSurviveDatabaseReload()
    {
        var users = new[] { Guid.NewGuid(), Guid.NewGuid() };
        var (created, createError) = await NewRoomService().CreateRoomAsync("monopoly", users[0], "Alice",
            JsonSerializer.SerializeToElement(new { seatCount = 2 }));
        Assert.Null(createError); Assert.NotNull(created);
        var (joined, side, joinError) = await NewRoomService().JoinRoomAsync(created.Id, users[1], "Bob");
        Assert.Null(joinError); Assert.Equal("P1", side); Assert.NotNull(joined);
        var initial = GameJson.Deserialize<MonopolyState>(joined.StateJson);
        Assert.True(initial.Started); Assert.Equal(2, initial.Players.Count);
        var (moved, outcome, _, error) = await NewRoomService().MakeMoveAsync(created.Id, users[initial.Turn], "{\"type\":\"ROLL\"}");
        Assert.Null(error); Assert.NotNull(outcome); Assert.True(outcome.Ok); Assert.NotNull(moved);
        using var db = NewDbContext();
        var persisted = await db.GameRooms.AsNoTracking().SingleAsync(r => r.Id == created.Id);
        var state = GameJson.Deserialize<MonopolyState>(persisted.StateJson);
        Assert.All(state.Dice, value => Assert.InRange(value, 1, 6));
        Assert.Equal(GameJson.Serialize(GameJson.Deserialize<MonopolyState>(moved.StateJson)), GameJson.Serialize(state));
        Assert.True(GameJson.Element(persisted.StateJson).TryGetProperty("chance", out _));
        Assert.False(GameJson.Element(new MonopolyEngine().RedactStateForViewer(persisted.StateJson, null)).TryGetProperty("chance", out _));
        Assert.Equal(1, await db.GameMoves.CountAsync(m => m.RoomId == created.Id && m.MoveJson == "{\"type\":\"ROLL\"}"));
        var frames=await db.GameMoves.AsNoTracking().Where(m=>m.RoomId==created.Id).OrderBy(m=>m.MoveNumber).ToListAsync();
        Assert.Equal(2,frames.Count);
        Assert.All(frames,m=>
        {
            Assert.NotNull(m.ReplayStateJson);
            Assert.False(GameJson.Element(m.ReplayStateJson).TryGetProperty("chance",out _));
        });
        Assert.Equal(state.Dice,GameJson.Deserialize<MonopolyState>(frames[^1].ReplayStateJson!).Dice);
        var (_,timedOut)=await NewRoomService().ApplySeatTimeoutAsync(created.Id,$"P{MonopolyRules.Actor(state)}");
        Assert.NotNull(timedOut);Assert.True(timedOut.Ok);
        var timeoutFrame=await db.GameMoves.AsNoTracking().Where(m=>m.RoomId==created.Id).OrderByDescending(m=>m.MoveNumber).FirstAsync();
        Assert.NotNull(timeoutFrame.ReplayStateJson);
        Assert.Equal(GameJson.Serialize(GameJson.Deserialize<MonopolyState>(new MonopolyEngine().CreatePublicReplaySnapshot(timedOut.StateJson)!)),
            GameJson.Serialize(GameJson.Deserialize<MonopolyState>(timeoutFrame.ReplayStateJson)));
    }

    [Fact]
    public async Task Monopoly_BankruptcyPersistsWinnerAndRematchCreatesFreshClassicBoard()
    {
        var owner=Guid.NewGuid();var opponent=Guid.NewGuid();
        var (created,_)=await NewRoomService().CreateRoomAsync("monopoly",owner,"Alice",JsonSerializer.SerializeToElement(new{seatCount=2}));
        Assert.NotNull(created);await NewRoomService().JoinRoomAsync(created.Id,opponent,"Bob");
        // Arrange a real unpaid bank debt in this isolated test database, then use the real move path.
        using(var db=NewDbContext())
        {
            var room=await db.GameRooms.FindAsync(created.Id);Assert.NotNull(room);
            var state=GameJson.Deserialize<MonopolyState>(room.StateJson);
            state.Turn=0;state.Phase="Debt";state.ResumePhase="End";state.Players[0].Cash=0;
            state.Payments=[new Payment(0,null,50)];room.StateJson=GameJson.Serialize(state);
            await db.SaveChangesAsync();
        }
        var (finished,outcome,_,error)=await NewRoomService().MakeMoveAsync(created.Id,owner,"{\"type\":\"BANKRUPT\"}");
        Assert.Null(error);Assert.NotNull(outcome);Assert.True(outcome.Ok);Assert.NotNull(finished);
        Assert.Equal(RoomStatus.Finished,finished.Status);Assert.Equal("P1",finished.Winner);
        var (rematch,rematchError)=await NewRoomService().CreateRematchAsync(created.Id,owner,"Alice");
        Assert.Null(rematchError);Assert.NotNull(rematch);Assert.Equal("monopoly",rematch.GameKey);
        Assert.Equal(2,rematch.SeatCount);Assert.Equal(RoomStatus.Waiting,rematch.Status);
        var fresh=GameJson.Deserialize<MonopolyState>(rematch.StateJson);
        Assert.False(fresh.Started);Assert.Null(fresh.Winner);Assert.Empty(fresh.Players);
        Assert.All(fresh.Properties,p=>Assert.Null(p.Owner));
        using var verify=NewDbContext();var persisted=await verify.GameRooms.FindAsync(created.Id);
        Assert.Equal("P1",persisted?.Winner);
    }

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
