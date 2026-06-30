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
/// </summary>
public class GameHub : Hub
{
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

    // ----- Game realtime -----

    /// <summary>Tham gia phòng: nhận ghế (Đỏ/Trắng) và subscribe nhóm phòng.</summary>
    public async Task JoinRoom(string roomId, string playerName)
    {
        if (!Guid.TryParse(roomId, out var id)) { await Err("roomId không hợp lệ"); return; }

        // SELECT FOR UPDATE: serialize concurrent joins để hai người không cùng lấy một ghế.
        await using var tx = await _db.Database.BeginTransactionAsync();
        var room = (await _db.GameRooms
            .FromSqlRaw("SELECT * FROM \"GameRooms\" WHERE \"Id\" = {0} FOR UPDATE", id)
            .ToListAsync()).FirstOrDefault();
        if (room is null) { await tx.RollbackAsync(); await Err("Không tìm thấy phòng"); return; }

        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);

        string? side = null;
        if (room.RedPlayer == playerName) side = "RED";
        else if (room.WhitePlayer == playerName) side = "WHITE";
        else if (room.RedPlayer is null) { room.RedPlayer = playerName; side = "RED"; }
        else if (room.WhitePlayer is null) { room.WhitePlayer = playerName; side = "WHITE"; }

        if (room.RedPlayer is not null && room.WhitePlayer is not null && room.Status == "Waiting")
            room.Status = "Playing";

        room.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        await Clients.Caller.SendAsync("Seated", new { side });
        await Clients.Group(roomId).SendAsync("GameStateUpdated", GameMapper.ToDto(room));
    }

    public Task LeaveRoom(string roomId)
        => Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);

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

        string? side = room.RedPlayer == playerName ? "RED"
                     : room.WhitePlayer == playerName ? "WHITE" : null;
        if (side is null) { await tx.RollbackAsync(); await Err("Bạn không phải người chơi trong phòng này"); return; }

        if (!_engines.Has(room.GameKey)) { await tx.RollbackAsync(); await Err($"Game '{room.GameKey}' không được hỗ trợ"); return; }
        var engine = _engines.Get(room.GameKey);
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

        await _cache.SetAsync($"game:{id}:state", room.StateJson);        // Redis (cốt lõi)

        try { _queue.PublishGameEvent(GameJson.Serialize(new { type = "Move", roomId, side, move = GameJson.Element(moveJson), winner = outcome.Winner })); }
        catch (Exception ex) { _log.LogWarning(ex, "Publish Move thất bại"); }

        if (outcome.Winner is not null)
        {
            try { await FinishGame(room, id); }
            catch (Exception ex) { _log.LogWarning(ex, "Lưu kết quả/replay thất bại"); }
        }

        await Clients.Group(roomId).SendAsync("GameStateUpdated", GameMapper.ToDto(room));
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
            map = GameJson.Element(room.MapJson),
            finalState = GameJson.Element(room.StateJson),
            moves = moves.Select(m => new { m.MoveNumber, m.Side, move = GameJson.Element(m.MoveJson) }),
        }));
    }

    private Task Err(string message) => Clients.Caller.SendAsync("Error", message);
}
