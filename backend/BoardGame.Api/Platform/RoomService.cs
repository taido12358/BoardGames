using System.Text.Json;
using BoardGame.Api.Data;
using BoardGame.Api.Platform.Abstractions;
using BoardGame.Api.Platform.Models;
using Microsoft.EntityFrameworkCore;

namespace BoardGame.Api.Platform;

/// <summary>
/// Toàn bộ logic phòng/ghế/ván (join/create/cancel/quick-match/timeout) — GOM VỀ MỘT CHỖ thay
/// vì trước đây GameHub và GamesController mỗi nơi tự rẽ nhánh "engine.MaxPlayers &lt;= 2" riêng
/// (4 bản sao rải rác). RoomService không chứa side-effect SignalR/Redis/RabbitMQ — gọi nơi
/// (GameHub/GamesController/SeatTimeoutService) tự lo phần transport/best-effort của mình sau
/// khi RoomService trả kết quả, để giữ đúng thứ tự bắt buộc: validate → ghi DB (ở đây) → cache/
/// broadcast/publish (ở nơi gọi).
/// </summary>
public class RoomService
{
    private readonly AppDbContext _db;
    private readonly GameEngineRegistry _engines;
    private readonly ILogger<RoomService> _log;

    public RoomService(AppDbContext db, GameEngineRegistry engines, ILogger<RoomService> log)
    {
        _db = db;
        _engines = engines;
        _log = log;
    }

    private async Task<GameRoom?> LockRoomAsync(Guid roomId)
        => (await _db.GameRooms
            .FromSqlRaw("SELECT * FROM \"GameRooms\" WHERE \"Id\" = {0} FOR UPDATE", roomId)
            .ToListAsync()).FirstOrDefault();

    /// <summary>Ghế của một user trong phòng — dùng ở cả JoinRoom/MakeMove và GameHub.BroadcastState.</summary>
    public static string? ResolveSide(GameRoom room, IGameEngine engine, Guid userId)
    {
        var seats = SeatCodec.SeatsOf(room);
        var idx = seats.FindIndex(s => s?.UserId == userId);
        return idx >= 0 ? engine.SideForSeat(idx) : null;
    }

    private static int ResolveSeatCount(JsonElement? options, int min, int max)
    {
        if (options is { ValueKind: JsonValueKind.Object } o &&
            o.TryGetProperty("seatCount", out var sc) &&
            sc.TryGetInt32(out var n) && n >= min && n <= max)
        {
            return n;
        }
        return max;
    }

    /// <summary>Gán ghế cho userId: reconnect nếu đã có ghế, chiếm ghế trống nếu còn Waiting, hoặc null = khán giả.</summary>
    private static string? AssignSeat(GameRoom room, IGameEngine engine, Guid userId, string displayName)
    {
        var seats = SeatCodec.SeatsOf(room);
        var idx = seats.FindIndex(s => s?.UserId == userId);
        if (idx >= 0)
        {
            // Reconnect — ngồi lại đúng ghế cũ, luôn refresh tên hiển thị + trạng thái kết nối.
            // seats[idx]! an toàn: idx tìm được từ predicate "s?.UserId == userId" nên chắc chắn khác null.
            seats[idx] = seats[idx]! with { DisplayName = displayName, Connected = true, LastSeenAt = DateTime.UtcNow };
            SeatCodec.SetSeats(room, seats);
            return engine.SideForSeat(idx);
        }

        if (room.Status != RoomStatus.Waiting) return null; // ván đã chạy/kết thúc, không nhận ghế mới — khán giả

        var emptyIdx = seats.FindIndex(s => s is null);
        if (emptyIdx < 0) return null; // đầy — khán giả

        seats[emptyIdx] = new SeatSlot(userId, displayName, true, DateTime.UtcNow);
        SeatCodec.SetSeats(room, seats);
        return engine.SideForSeat(emptyIdx);
    }

    /// <summary>
    /// Ghế vừa đủ (không còn null) trong khi phòng còn Waiting: giao engine tự chia state ban
    /// đầu thật (đã biết tên thật của mọi người, điều NewGame() chưa biết). Lỗi ở bước này KHÔNG
    /// chuyển phòng sang Playing — thà kẹt Waiting còn hơn vào ván với state hỏng.
    /// </summary>
    private async Task MaybeStartGame(GameRoom room, IGameEngine engine)
    {
        if (room.Status != RoomStatus.Waiting) return;
        var seats = SeatCodec.SeatsOf(room);
        if (seats.Count != room.SeatCount || seats.Any(s => s is null)) return;

        var seatNames = seats.Select(s => s!.DisplayName).ToList();
        MoveOutcome outcome;
        try { outcome = engine.OnRoomFull(room.MapJson, room.StateJson, seatNames); }
        catch (Exception ex)
        {
            _log.LogError(ex, "OnRoomFull ném exception cho game '{GameKey}', phòng {RoomId} vẫn Waiting", room.GameKey, room.Id);
            return;
        }
        if (!outcome.Ok)
        {
            _log.LogError("OnRoomFull thất bại cho game '{GameKey}', phòng {RoomId} vẫn Waiting: {Error}", room.GameKey, room.Id, outcome.Error);
            return;
        }

        room.StateJson = outcome.StateJson;
        room.Status = RoomStatus.Playing;

        var moveNumber = await _db.GameMoves.CountAsync(m => m.RoomId == room.Id) + 1;
        _db.GameMoves.Add(new GameMove
        {
            RoomId = room.Id, MoveNumber = moveNumber, Side = "SYSTEM",
            MoveJson = GameJson.Serialize(new { type = "__room_full__", seats = seatNames }),
        });
    }

    public async Task<(GameRoom? Room, string? Error)> CreateRoomAsync(string gameKey, Guid userId, string displayName, JsonElement? options)
    {
        if (string.IsNullOrWhiteSpace(gameKey) || !_engines.Has(gameKey))
            return (null, $"Game '{gameKey}' chưa được hỗ trợ");

        var engine = _engines.Get(gameKey);
        var (mapJson, stateJson) = engine.NewGame(options);
        var seatCount = ResolveSeatCount(options, engine.MinPlayers, engine.MaxPlayers);

        var seats = new SeatSlot?[seatCount];
        seats[0] = new SeatSlot(userId, displayName, true, DateTime.UtcNow);

        var room = new GameRoom
        {
            GameKey = engine.Key,
            Status = RoomStatus.Waiting,
            MapJson = mapJson,
            StateJson = stateJson,
            OwnerUserId = userId,
            SeatCount = seatCount,
        };
        SeatCodec.SetSeats(room, seats);

        _db.GameRooms.Add(room);
        await _db.SaveChangesAsync();
        return (room, null);
    }

    public async Task<(GameRoom? Room, string? Side, string? Error)> JoinRoomAsync(Guid roomId, Guid userId, string displayName)
    {
        // SELECT FOR UPDATE: serialize concurrent joins để hai người không cùng lấy một ghế.
        await using var tx = await _db.Database.BeginTransactionAsync();
        var room = await LockRoomAsync(roomId);
        if (room is null) { await tx.RollbackAsync(); return (null, null, "Không tìm thấy phòng"); }
        if (!_engines.Has(room.GameKey)) { await tx.RollbackAsync(); return (null, null, $"Game '{room.GameKey}' không được hỗ trợ"); }
        var engine = _engines.Get(room.GameKey);

        var side = AssignSeat(room, engine, userId, displayName);
        await MaybeStartGame(room, engine);

        room.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await tx.CommitAsync();
        return (room, side, null);
    }

    public async Task<(GameRoom? Room, MoveOutcome? Outcome, string? Side, string? Error)> MakeMoveAsync(Guid roomId, Guid userId, string moveJson)
    {
        // SELECT FOR UPDATE: serialize concurrent moves trên cùng phòng — state đọc luôn mới
        // nhất, moveNumber không bị trùng.
        await using var tx = await _db.Database.BeginTransactionAsync();
        var room = await LockRoomAsync(roomId);
        if (room is null || room.Status != RoomStatus.Playing) { await tx.RollbackAsync(); return (null, null, null, "Phòng chưa thể chơi"); }
        if (!_engines.Has(room.GameKey)) { await tx.RollbackAsync(); return (null, null, null, $"Game '{room.GameKey}' không được hỗ trợ"); }
        var engine = _engines.Get(room.GameKey);

        var side = ResolveSide(room, engine, userId);
        if (side is null) { await tx.RollbackAsync(); return (null, null, null, "Bạn không phải người chơi trong phòng này"); }

        MoveOutcome outcome;
        try { outcome = engine.ApplyMove(room.MapJson, room.StateJson, side, moveJson); }
        catch (Exception ex) { await tx.RollbackAsync(); _log.LogWarning(ex, "ApplyMove ném exception"); return (null, null, null, "Nước đi không hợp lệ"); }
        if (!outcome.Ok) { await tx.RollbackAsync(); return (null, null, null, outcome.Error ?? "Nước đi không hợp lệ"); }

        var moveNumber = await _db.GameMoves.CountAsync(m => m.RoomId == roomId) + 1;
        _db.GameMoves.Add(new GameMove { RoomId = roomId, MoveNumber = moveNumber, Side = side, MoveJson = moveJson });

        room.StateJson = outcome.StateJson;
        if (outcome.Winner is not null) { room.Status = RoomStatus.Finished; room.Winner = outcome.Winner; }
        room.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        return (room, outcome, side, null);
    }

    public enum CancelOutcome { Ok, NotFound, NotWaiting, Forbidden }

    public async Task<CancelOutcome> CancelRoomAsync(Guid roomId, Guid userId)
    {
        await using var tx = await _db.Database.BeginTransactionAsync();
        var room = await LockRoomAsync(roomId);
        if (room is null) { await tx.RollbackAsync(); return CancelOutcome.NotFound; }
        if (room.Status != RoomStatus.Waiting) { await tx.RollbackAsync(); return CancelOutcome.NotWaiting; }
        if (room.OwnerUserId != userId) { await tx.RollbackAsync(); return CancelOutcome.Forbidden; }

        room.Status = RoomStatus.Cancelled;
        room.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await tx.CommitAsync();
        return CancelOutcome.Ok;
    }

    /// <summary>Ghép vào phòng Waiting còn ghế trống gần nhất (cùng gameKey), hết thì tạo phòng mới.</summary>
    public async Task<(GameRoom? Room, string? Error)> QuickMatchAsync(string gameKey, Guid userId, string displayName)
    {
        if (string.IsNullOrWhiteSpace(gameKey) || !_engines.Has(gameKey))
            return (null, $"Game '{gameKey}' chưa được hỗ trợ");
        var engine = _engines.Get(gameKey);

        // FOR UPDATE SKIP LOCKED: quét nhiều ứng viên cùng lúc — bỏ qua phòng đang bị một
        // QuickMatch/JoinRoom khác khoá thay vì chờ (khác JoinRoom/MakeMove chặn cứng vì ở đó
        // đích đã biết trước — 1 roomId cụ thể).
        await using var tx = await _db.Database.BeginTransactionAsync();
        var candidates = await _db.GameRooms
            .FromSqlRaw(
                "SELECT * FROM \"GameRooms\" WHERE \"GameKey\" = {0} AND \"Status\" = {1} ORDER BY \"CreatedAt\" ASC LIMIT 5 FOR UPDATE SKIP LOCKED",
                gameKey, RoomStatus.Waiting)
            .ToListAsync();

        var room = candidates.FirstOrDefault(r => SeatCodec.SeatsOf(r).Any(s => s is null));
        if (room is null)
        {
            await tx.RollbackAsync(); // chỉ đọc, không có gì cần giữ khoá — tạo phòng mới là insert độc lập
            return await CreateRoomAsync(gameKey, userId, displayName, null);
        }

        AssignSeat(room, engine, userId, displayName);
        await MaybeStartGame(room, engine);

        room.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await tx.CommitAsync();
        return (room, null);
    }

    /// <summary>Ghế "side" mất kết nối quá lâu — giao engine tự quyết (xem IGameEngine.OnSeatTimedOut). Trả (null,null) nếu không có gì thay đổi.</summary>
    public async Task<(GameRoom? Room, MoveOutcome? Outcome)> ApplySeatTimeoutAsync(Guid roomId, string side)
    {
        await using var tx = await _db.Database.BeginTransactionAsync();
        var room = await LockRoomAsync(roomId);
        if (room is null || room.Status != RoomStatus.Playing || !_engines.Has(room.GameKey))
        {
            await tx.RollbackAsync();
            return (null, null);
        }
        var engine = _engines.Get(room.GameKey);

        MoveOutcome outcome;
        try { outcome = engine.OnSeatTimedOut(room.MapJson, room.StateJson, side); }
        catch (Exception ex)
        {
            await tx.RollbackAsync();
            _log.LogWarning(ex, "OnSeatTimedOut ném exception cho game '{GameKey}', phòng {RoomId}, side {Side}", room.GameKey, roomId, side);
            return (null, null);
        }
        if (!outcome.Ok) { await tx.RollbackAsync(); return (null, null); }

        var moveNumber = await _db.GameMoves.CountAsync(m => m.RoomId == roomId) + 1;
        _db.GameMoves.Add(new GameMove { RoomId = roomId, MoveNumber = moveNumber, Side = side, MoveJson = "{\"type\":\"__seat_timeout__\"}" });

        room.StateJson = outcome.StateJson;
        if (outcome.Winner is not null) { room.Status = RoomStatus.Finished; room.Winner = outcome.Winner; }
        room.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await tx.CommitAsync();
        return (room, outcome);
    }

    /// <summary>Đánh dấu ghế của userId mất kết nối (connection cuối cùng của họ trong phòng vừa ngắt) — trả true nếu có thay đổi thật (cần broadcast lại).</summary>
    public async Task<bool> MarkSeatDisconnectedAsync(Guid roomId, Guid userId)
    {
        await using var tx = await _db.Database.BeginTransactionAsync();
        var room = await LockRoomAsync(roomId);
        if (room is null) { await tx.RollbackAsync(); return false; }

        var seats = SeatCodec.SeatsOf(room);
        var idx = seats.FindIndex(s => s?.UserId == userId);
        if (idx < 0 || !seats[idx]!.Connected) { await tx.RollbackAsync(); return false; }

        seats[idx] = seats[idx]! with { Connected = false, LastSeenAt = DateTime.UtcNow }; // an toàn: vừa check ở dòng trên
        SeatCodec.SetSeats(room, seats);
        room.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await tx.CommitAsync();
        return true;
    }
}
