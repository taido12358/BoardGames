using System.Collections.Concurrent;
using BoardGame.Api.Data;
using BoardGame.Api.Platform.Abstractions;
using BoardGame.Api.Platform.Models;
using BoardGame.Api.Services;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace BoardGame.Api.Platform;

/// <summary>
/// SignalR hub — GENERIC cho mọi game (giữ thêm demo Hello World).
/// Engine của từng game được tra qua GameEngineRegistry theo room.GameKey, nên
/// hub không hardcode luật game nào: chỉ điều phối room/persist/realtime và đẩy
/// JSON nước đi cho đúng engine xử lý (authoritative).
///
/// Hỗ trợ hai mô hình ghế song song, chọn theo engine.MaxPlayers:
///  - ≤ 2 người (vd VayBat): RedPlayer/WhitePlayer, side "RED"/"WHITE" — đường cũ,
///    KHÔNG đổi hành vi so với trước.
///  - > 2 người (vd Bang): SeatCount/SeatsJson generic, side "P0".."P{N-1}". Khi đủ
///    ghế, hub gọi engine.ApplyMove với side "SYSTEM" (moveJson {"type":"__start_game__"})
///    để engine tự chia vai trò/bài — đây là quy ước Platform, không phải luật riêng
///    của Bang; engine nào không cần thì không phải xử lý gì (chỉ engine > 2 người mới
///    nhận được lời gọi này).
/// </summary>
public class GameHub : Hub
{
    private const string SystemSide = "SYSTEM";

    // Hub instance là transient (tạo mới mỗi lần gọi) nên map connection -> (room, tên)
    // phải static để sống được giữa các lời gọi — cần cho việc gửi state RIÊNG theo
    // từng người xem (RedactStateForViewer) thay vì một bản y hệt cho cả nhóm.
    private static readonly ConcurrentDictionary<string, (string RoomId, string PlayerName)> _connections = new();

    private readonly AppDbContext _db;
    private readonly RedisCacheService _cache;
    private readonly RabbitMqPublisher _queue;
    private readonly OpenSearchService _search;
    private readonly MinioStorageService _storage;
    private readonly GameEngineRegistry _engines;
    private readonly ILogger<GameHub> _log;

    public GameHub(AppDbContext db, RedisCacheService cache, RabbitMqPublisher queue,
        OpenSearchService search, MinioStorageService storage, GameEngineRegistry engines,
        ILogger<GameHub> log)
    {
        _db = db;
        _cache = cache;
        _queue = queue;
        _search = search;
        _storage = storage;
        _engines = engines;
        _log = log;
    }

    // ----- Hello World demo (giữ nguyên) -----
    public async Task SendHello(string message)
        => await Clients.All.SendAsync("GreetingCreated", message);

    public override Task OnDisconnectedAsync(Exception? exception)
    {
        _connections.TryRemove(Context.ConnectionId, out _);
        return base.OnDisconnectedAsync(exception);
    }

    // ----- Game realtime -----

    /// <summary>Tham gia phòng: nhận ghế và subscribe nhóm phòng.</summary>
    public async Task JoinRoom(string roomId, string playerName)
    {
        if (!Guid.TryParse(roomId, out var id)) { await Err("roomId không hợp lệ"); return; }

        // SELECT FOR UPDATE: serialize concurrent joins để hai người không cùng lấy một ghế.
        await using var tx = await _db.Database.BeginTransactionAsync();
        var room = (await _db.GameRooms
            .FromSqlRaw("SELECT * FROM \"GameRooms\" WHERE \"Id\" = {0} FOR UPDATE", id)
            .ToListAsync()).FirstOrDefault();
        if (room is null) { await tx.RollbackAsync(); await Err("Không tìm thấy phòng"); return; }
        if (!_engines.Has(room.GameKey)) { await tx.RollbackAsync(); await Err($"Game '{room.GameKey}' không được hỗ trợ"); return; }
        var engine = _engines.Get(room.GameKey);

        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
        _connections[Context.ConnectionId] = (roomId, playerName);

        string? side = engine.MaxPlayers <= 2
            ? JoinTwoSeat(room, playerName)
            : JoinMultiSeat(room, playerName);

        if (room.Status == "Waiting" && IsRoomFull(room, engine))
        {
            if (engine.MaxPlayers <= 2)
            {
                // Đường cũ — không đổi hành vi so với trước khi có ghế generic.
                room.Status = "Playing";
            }
            else
            {
                await StartMultiSeatGame(room, engine, id);
            }
        }

        room.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        await Clients.Caller.SendAsync("Seated", new { side });
        await BroadcastState(roomId, room, engine);
    }

    private static string? JoinTwoSeat(GameRoom room, string playerName)
    {
        if (room.RedPlayer == playerName) return "RED";
        if (room.WhitePlayer == playerName) return "WHITE";
        if (room.RedPlayer is null) { room.RedPlayer = playerName; return "RED"; }
        if (room.WhitePlayer is null) { room.WhitePlayer = playerName; return "WHITE"; }
        return null; // hai ghế đã có người khác — khán giả
    }

    private static string? JoinMultiSeat(GameRoom room, string playerName)
    {
        var seats = GameMapper.SeatsOf(room);
        while (seats.Count < room.SeatCount) seats.Add(null); // phòng thủ với dữ liệu cũ/thiếu

        var existingIdx = seats.IndexOf(playerName);
        if (existingIdx >= 0) return $"P{existingIdx}"; // reconnect — ngồi lại ghế cũ

        if (room.Status != "Waiting") return null; // ván đã chạy, không nhận ghế mới — khán giả

        var emptyIdx = seats.FindIndex(s => s is null);
        if (emptyIdx < 0) return null; // đầy — khán giả

        seats[emptyIdx] = playerName;
        room.SeatsJson = GameJson.Serialize(seats);
        return $"P{emptyIdx}";
    }

    private static bool IsRoomFull(GameRoom room, IGameEngine engine)
    {
        if (engine.MaxPlayers <= 2) return room.RedPlayer is not null && room.WhitePlayer is not null;
        var seats = GameMapper.SeatsOf(room);
        return seats.Count == room.SeatCount && seats.All(s => s is not null);
    }

    /// <summary>
    /// Ghế đã đủ cho game > 2 người: giao engine một nước đi hệ thống để tự chia
    /// vai trò/nhân vật/bài (chỉ engine mới biết cách chia). Lỗi ở bước này KHÔNG
    /// được chuyển phòng sang Playing — thà kẹt Waiting còn hơn vào ván với state hỏng.
    /// </summary>
    private async Task StartMultiSeatGame(GameRoom room, IGameEngine engine, Guid roomId)
    {
        MoveOutcome outcome;
        var startMoveJson = GameJson.Serialize(new { type = "__start_game__", seats = GameMapper.SeatsOf(room) });
        try { outcome = engine.ApplyMove(room.MapJson, room.StateJson, SystemSide, startMoveJson); }
        catch (Exception ex)
        {
            _log.LogError(ex, "Khởi động ván '{GameKey}' ném exception, phòng {RoomId} vẫn Waiting", room.GameKey, roomId);
            return;
        }
        if (!outcome.Ok)
        {
            _log.LogError("Khởi động ván '{GameKey}' thất bại, phòng {RoomId} vẫn Waiting: {Error}", room.GameKey, roomId, outcome.Error);
            return;
        }

        room.StateJson = outcome.StateJson;
        room.Status = "Playing";

        var moveNumber = await _db.GameMoves.CountAsync(m => m.RoomId == roomId) + 1;
        _db.GameMoves.Add(new GameMove { RoomId = roomId, MoveNumber = moveNumber, Side = SystemSide, MoveJson = startMoveJson });
    }

    public Task LeaveRoom(string roomId)
    {
        _connections.TryRemove(Context.ConnectionId, out _);
        return Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);
    }

    /// <summary>
    /// Thực hiện một nước đi. moveJson là payload tuỳ game; hub xác định ghế của
    /// người chơi rồi giao cho engine tương ứng validate &amp; áp dụng.
    /// </summary>
    public async Task MakeMove(string roomId, string moveJson, string playerName)
    {
        if (!Guid.TryParse(roomId, out var id)) { await Err("roomId không hợp lệ"); return; }

        // SELECT FOR UPDATE: serialize concurrent moves trên cùng phòng.
        // Đảm bảo (1) state đọc là mới nhất, (2) moveNumber không bị duplicate.
        await using var tx = await _db.Database.BeginTransactionAsync();
        var room = (await _db.GameRooms
            .FromSqlRaw("SELECT * FROM \"GameRooms\" WHERE \"Id\" = {0} FOR UPDATE", id)
            .ToListAsync()).FirstOrDefault();
        if (room is null || room.Status != "Playing") { await tx.RollbackAsync(); await Err("Phòng chưa thể chơi"); return; }

        if (!_engines.Has(room.GameKey)) { await tx.RollbackAsync(); await Err($"Game '{room.GameKey}' không được hỗ trợ"); return; }
        var engine = _engines.Get(room.GameKey);

        var side = ResolveSide(room, engine, playerName);
        if (side is null) { await tx.RollbackAsync(); await Err("Bạn không phải người chơi trong phòng này"); return; }

        MoveOutcome outcome;
        try { outcome = engine.ApplyMove(room.MapJson, room.StateJson, side, moveJson); }
        catch (Exception ex) { await tx.RollbackAsync(); _log.LogWarning(ex, "ApplyMove ném exception"); await Err("Nước đi không hợp lệ"); return; }
        if (!outcome.Ok) { await tx.RollbackAsync(); await Err(outcome.Error ?? "Nước đi không hợp lệ"); return; }

        var moveNumber = await _db.GameMoves.CountAsync(m => m.RoomId == id) + 1;
        _db.GameMoves.Add(new GameMove
        {
            RoomId = id, MoveNumber = moveNumber, Side = side, MoveJson = moveJson,
        });

        room.StateJson = outcome.StateJson;
        if (outcome.Winner is not null) { room.Status = "Finished"; room.Winner = outcome.Winner; }
        room.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await tx.CommitAsync();                                           // PostgreSQL (cốt lõi)

        // Redis chỉ là cache — không được để lỗi Redis chặn broadcast GameStateUpdated
        // (nếu không client sẽ thấy "không đi được quân" dù nước đi đã lưu DB).
        try { await _cache.SetAsync($"game:{id}:state", room.StateJson); }
        catch (Exception ex) { _log.LogWarning(ex, "Ghi Redis cache thất bại"); }

        try { _queue.PublishGameEvent(GameJson.Serialize(new { type = "Move", roomId, side, move = GameJson.Element(moveJson), winner = outcome.Winner })); }
        catch (Exception ex) { _log.LogWarning(ex, "Publish Move thất bại"); }

        if (outcome.Winner is not null)
        {
            try { await FinishGame(room, id); }
            catch (Exception ex) { _log.LogWarning(ex, "Lưu kết quả/replay thất bại"); }
        }

        await BroadcastState(roomId, room, engine);
    }

    /// <summary>Ghế của một người chơi trong phòng, theo đúng mô hình ghế của engine (2 hoặc N người).</summary>
    private static string? ResolveSide(GameRoom room, IGameEngine engine, string playerName)
    {
        if (engine.MaxPlayers <= 2)
            return room.RedPlayer == playerName ? "RED"
                 : room.WhitePlayer == playerName ? "WHITE" : null;

        var seats = GameMapper.SeatsOf(room);
        var idx = seats.IndexOf(playerName);
        return idx >= 0 ? $"P{idx}" : null;
    }

    /// <summary>
    /// Gửi GameStateUpdated RIÊNG cho từng connection đang ở trong phòng — mỗi người
    /// nhận state đã qua engine.RedactStateForViewer(side) theo đúng ghế của họ, thay
    /// vì một bản y hệt cho cả nhóm. Với engine không có thông tin ẩn (vd VayBat),
    /// RedactStateForViewer mặc định trả nguyên state nên nội dung nhận được y hệt
    /// broadcast nhóm trước đây — chỉ đổi cơ chế gửi, không đổi dữ liệu.
    /// </summary>
    private async Task BroadcastState(string roomId, GameRoom room, IGameEngine engine)
    {
        var recipients = _connections.Where(kv => kv.Value.RoomId == roomId).ToList();
        if (recipients.Count == 0)
        {
            // Không track được connection nào (không nên xảy ra bình thường — mọi
            // connection trong group đều đã qua JoinRoom). An toàn nhất là gửi bản
            // đã ẩn tối đa (side=null) cho cả nhóm, tránh rò rỉ thông tin ẩn.
            var safeDto = GameMapper.ToDto(room) with { State = GameJson.Element(engine.RedactStateForViewer(room.StateJson, null)) };
            await Clients.Group(roomId).SendAsync("GameStateUpdated", safeDto);
            return;
        }

        foreach (var (connectionId, info) in recipients)
        {
            var side = ResolveSide(room, engine, info.PlayerName);
            var redacted = engine.RedactStateForViewer(room.StateJson, side);
            var dto = GameMapper.ToDto(room) with { State = GameJson.Element(redacted) };
            await Clients.Client(connectionId).SendAsync("GameStateUpdated", dto);
        }
    }

    private async Task FinishGame(GameRoom room, Guid id)
    {
        var moves = await _db.GameMoves
            .Where(m => m.RoomId == id)
            .OrderBy(m => m.MoveNumber)
            .ToListAsync();

        await _search.IndexGameAsync(new GameRecord                       // OpenSearch
        {
            Id = room.Id.ToString(),
            GameKey = room.GameKey,
            Status = room.Status,
            Winner = room.Winner,
            MoveCount = moves.Count,
            RedPlayer = room.RedPlayer,
            WhitePlayer = room.WhitePlayer,
            CreatedAt = room.CreatedAt,
            FinishedAt = room.UpdatedAt,
        });

        await _storage.SaveReplayAsync($"replay-{room.Id}.json", GameJson.Serialize(new // MinIO
        {
            room.Id, room.GameKey, room.Winner, room.RedPlayer, room.WhitePlayer,
            seats = GameMapper.SeatsOf(room),
            map = GameJson.Element(room.MapJson),
            finalState = GameJson.Element(room.StateJson),
            moves = moves.Select(m => new { m.MoveNumber, m.Side, move = GameJson.Element(m.MoveJson) }),
        }));
    }

    private Task Err(string message) => Clients.Caller.SendAsync("Error", message);
}
