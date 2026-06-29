using BoardGame.Api.Data;
using BoardGame.Api.Game;
using BoardGame.Api.Models;
using BoardGame.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BoardGame.Api.Controllers;

/// <summary>
/// REST cho sảnh chờ (lobby): tạo phòng, liệt kê, xem, tìm kiếm lịch sử.
/// Nước đi thời gian thực đi qua SignalR (GameHub), không qua REST.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class GamesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly RedisCacheService _cache;
    private readonly RabbitMqPublisher _queue;
    private readonly OpenSearchService _search;

    public GamesController(AppDbContext db, RedisCacheService cache,
        RabbitMqPublisher queue, OpenSearchService search)
    {
        _db = db;
        _cache = cache;
        _queue = queue;
        _search = search;
    }

    /// <summary>Tạo phòng mới (đi qua PostgreSQL → Redis → RabbitMQ → OpenSearch).</summary>
    [HttpPost]
    public async Task<ActionResult<RoomDto>> Create([FromBody] CreateGameRequest req)
    {
        var map = GameEngine.DefaultMap();
        if (req.MaxRedTurns is int x && x > 0) map.MaxRedTurns = x;

        var state = GameEngine.CreateState(map, randomRed: true);
        var room = new GameRoom
        {
            Status = "Waiting",
            MaxRedTurns = map.MaxRedTurns,
            RedPlayer = string.IsNullOrWhiteSpace(req.PlayerName) ? null : req.PlayerName, // người tạo cầm Đỏ
            MapJson = GameJson.Serialize(map),
            StateJson = GameJson.Serialize(state),
        };

        _db.GameRooms.Add(room);                                   // 1. PostgreSQL
        await _db.SaveChangesAsync();
        await _cache.SetAsync($"game:{room.Id}:state", room.StateJson); // 2. Redis
        _queue.PublishGameEvent(GameJson.Serialize(new { type = "RoomCreated", roomId = room.Id })); // 3. RabbitMQ
        await _search.IndexGameAsync(ToRecord(room, 0));           // 4. OpenSearch

        return Ok(GameMapper.ToDto(room));
    }

    /// <summary>Danh sách phòng đang chờ/đang chơi.</summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<RoomDto>>> List()
    {
        var rooms = await _db.GameRooms
            .Where(r => r.Status != "Finished")
            .OrderByDescending(r => r.CreatedAt)
            .Take(50)
            .ToListAsync();
        return Ok(rooms.Select(GameMapper.ToDto));
    }

    /// <summary>Chi tiết phòng; state nóng ưu tiên đọc từ Redis.</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<RoomDto>> Get(Guid id)
    {
        var room = await _db.GameRooms.FindAsync(id);
        if (room is null) return NotFound();

        var cachedState = await _cache.GetAsync($"game:{id}:state");
        if (cachedState is not null) room.StateJson = cachedState;

        return Ok(GameMapper.ToDto(room));
    }

    /// <summary>Tìm kiếm lịch sử ván chơi (OpenSearch).</summary>
    [HttpGet("search")]
    public async Task<ActionResult<IEnumerable<GameRecord>>> Search([FromQuery] string q = "")
        => Ok(await _search.SearchGamesAsync(q));

    private static GameRecord ToRecord(GameRoom r, int moveCount) => new()
    {
        Id = r.Id.ToString(),
        Status = r.Status,
        Winner = r.Winner,
        RedTurnsUsed = GameJson.Deserialize<GameState>(r.StateJson).RedTurnsUsed,
        MoveCount = moveCount,
        RedPlayer = r.RedPlayer,
        WhitePlayer = r.WhitePlayer,
        CreatedAt = r.CreatedAt,
        FinishedAt = r.Status == "Finished" ? r.UpdatedAt : null,
    };
}

public record CreateGameRequest(int? MaxRedTurns, string? PlayerName);
