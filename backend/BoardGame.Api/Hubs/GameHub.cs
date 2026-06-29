using BoardGame.Api.Data;
using BoardGame.Api.Game;
using BoardGame.Api.Models;
using BoardGame.Api.Services;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace BoardGame.Api.Hubs;

/// <summary>
/// SignalR hub: vừa giữ demo Hello World ("GreetingCreated"), vừa điều phối
/// game thời gian thực. Rule engine chạy tại đây (authoritative): client chỉ
/// gửi ý định, server validate → áp dụng → lưu (PostgreSQL/Redis) → phát
/// (RabbitMQ) → khi kết thúc index (OpenSearch) + lưu replay (MinIO) →
/// broadcast state mới cho cả phòng.
/// </summary>
public class GameHub : Hub
{
    private readonly AppDbContext _db;
    private readonly RedisCacheService _cache;
    private readonly RabbitMqPublisher _queue;
    private readonly OpenSearchService _search;
    private readonly MinioStorageService _storage;

    public GameHub(AppDbContext db, RedisCacheService cache, RabbitMqPublisher queue,
        OpenSearchService search, MinioStorageService storage)
    {
        _db = db;
        _cache = cache;
        _queue = queue;
        _search = search;
        _storage = storage;
    }

    // ----- Hello World demo (giữ nguyên) -----
    public async Task SendHello(string message)
        => await Clients.All.SendAsync("GreetingCreated", message);

    // ----- Game realtime -----

    /// <summary>Tham gia phòng: nhận ghế (Đỏ/Trắng) và subscribe nhóm phòng.</summary>
    public async Task JoinRoom(string roomId, string playerName)
    {
        if (!Guid.TryParse(roomId, out var id)) { await Err("roomId không hợp lệ"); return; }
        var room = await _db.GameRooms.FindAsync(id);
        if (room is null) { await Err("Không tìm thấy phòng"); return; }

        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);

        // Gán ghế: giữ ghế cũ nếu trùng tên, không thì lấp chỗ trống, còn lại là khán giả.
        string? side = null;
        if (room.RedPlayer == playerName) side = "RED";
        else if (room.WhitePlayer == playerName) side = "WHITE";
        else if (room.RedPlayer is null) { room.RedPlayer = playerName; side = "RED"; }
        else if (room.WhitePlayer is null) { room.WhitePlayer = playerName; side = "WHITE"; }

        if (room.RedPlayer is not null && room.WhitePlayer is not null && room.Status == "Waiting")
            room.Status = "Playing";

        room.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await Clients.Caller.SendAsync("Seated", new { side });
        await Clients.Group(roomId).SendAsync("GameStateUpdated", GameMapper.ToDto(room));
    }

    public Task LeaveRoom(string roomId)
        => Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);

    /// <summary>Thực hiện một nước đi — toàn bộ luồng authoritative.</summary>
    public async Task MakeMove(string roomId, string pieceId, int toNode, string playerName)
    {
        if (!Guid.TryParse(roomId, out var id)) { await Err("roomId không hợp lệ"); return; }
        var room = await _db.GameRooms.FindAsync(id);
        if (room is null || room.Status != "Playing") { await Err("Phòng chưa thể chơi"); return; }

        var map = GameJson.Deserialize<MapDefinition>(room.MapJson);
        var state = GameJson.Deserialize<GameState>(room.StateJson);
        var adj = GameEngine.BuildAdjacency(map);

        var side = GameEngine.Side(pieceId);
        var owner = side == "RED" ? room.RedPlayer : room.WhitePlayer;
        if (owner != playerName) { await Err("Không phải quân của bạn"); return; }
        if (!GameEngine.ValidMove(state, adj, pieceId, toNode)) { await Err("Nước đi không hợp lệ"); return; }

        var from = state.Pieces[pieceId];
        GameEngine.ApplyMove(state, adj, pieceId, toNode);

        // Lưu replay + cập nhật state (PostgreSQL)
        var moveNumber = await _db.GameMoves.CountAsync(m => m.RoomId == id) + 1;
        _db.GameMoves.Add(new GameMove
        {
            RoomId = id, MoveNumber = moveNumber, Side = side,
            PieceId = pieceId, FromNode = from, ToNode = toNode,
        });

        room.StateJson = GameJson.Serialize(state);
        if (state.Winner is not null) { room.Status = "Finished"; room.Winner = state.Winner; }
        room.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await _cache.SetAsync($"game:{id}:state", room.StateJson);      // Redis
        _queue.PublishGameEvent(GameJson.Serialize(new                  // RabbitMQ
        {
            type = "Move", roomId, pieceId, from, to = toNode, side, winner = state.Winner
        }));

        if (state.Winner is not null) await FinishGame(room, id);       // OpenSearch + MinIO

        await Clients.Group(roomId).SendAsync("GameStateUpdated", GameMapper.ToDto(room));
    }

    private async Task FinishGame(GameRoom room, Guid id)
    {
        var moves = await _db.GameMoves
            .Where(m => m.RoomId == id)
            .OrderBy(m => m.MoveNumber)
            .ToListAsync();

        await _search.IndexGameAsync(new GameRecord                     // index để tìm kiếm
        {
            Id = room.Id.ToString(),
            Status = room.Status,
            Winner = room.Winner,
            RedTurnsUsed = GameJson.Deserialize<GameState>(room.StateJson).RedTurnsUsed,
            MoveCount = moves.Count,
            RedPlayer = room.RedPlayer,
            WhitePlayer = room.WhitePlayer,
            CreatedAt = room.CreatedAt,
            FinishedAt = room.UpdatedAt,
        });

        await _storage.SaveReplayAsync($"replay-{room.Id}.json", GameJson.Serialize(new // artifact replay
        {
            room.Id, room.Winner, room.RedPlayer, room.WhitePlayer,
            map = GameJson.Deserialize<MapDefinition>(room.MapJson),
            finalState = GameJson.Deserialize<GameState>(room.StateJson),
            moves,
        }));
    }

    private Task Err(string message) => Clients.Caller.SendAsync("Error", message);
}
