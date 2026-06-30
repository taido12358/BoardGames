using System.Text.Json;
using BoardGame.Api.Data;
using BoardGame.Api.Platform.Abstractions;
using BoardGame.Api.Platform.Models;
using BoardGame.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BoardGame.Api.Platform;

/// <summary>
/// REST cho sảnh chờ — GENERIC cho mọi game. Nước đi realtime đi qua GameHub.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class GamesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly RedisCacheService _cache;
    private readonly RabbitMqPublisher _queue;
    private readonly OpenSearchService _search;
    private readonly GameEngineRegistry _engines;
    private readonly ILogger<GamesController> _log;

    public GamesController(AppDbContext db, RedisCacheService cache, RabbitMqPublisher queue,
        OpenSearchService search, GameEngineRegistry engines, ILogger<GamesController> log)
    {
        _db = db;
        _cache = cache;
        _queue = queue;
        _search = search;
        _engines = engines;
        _log = log;
    }

    /// <summary>Danh sách game đang hỗ trợ (cho lobby chọn game).</summary>
    [HttpGet("engines")]
    public ActionResult<object> Engines()
        => Ok(_engines.All.Select(e => new { e.Key, e.DisplayName, e.MinPlayers, e.MaxPlayers }));

    /// <summary>Tạo phòng mới cho một game bất kỳ.</summary>
    [HttpPost]
    public async Task<ActionResult<RoomDto>> Create([FromBody] CreateGameRequest req)
    {
        var key = string.IsNullOrWhiteSpace(req.GameKey) ? "vaybat" : req.GameKey;
        if (!_engines.Has(key)) return BadRequest($"Game '{key}' chưa được hỗ trợ");

        var engine = _engines.Get(key);
        var (mapJson, stateJson) = engine.NewGame(req.Options);

        var room = new GameRoom
        {
            GameKey = engine.Key,
            Status = "Waiting",
            RedPlayer = string.IsNullOrWhiteSpace(req.PlayerName) ? null : req.PlayerName,
            MapJson = mapJson,
            StateJson = stateJson,
        };

        _db.GameRooms.Add(room);                                          // PostgreSQL (cốt lõi)
        await _db.SaveChangesAsync();
        await _cache.SetAsync($"game:{room.Id}:state", room.StateJson);   // Redis (cốt lõi)

        // Side-effect best-effort — không chặn tạo phòng.
        try { _queue.PublishGameEvent(GameJson.Serialize(new { type = "RoomCreated", roomId = room.Id, gameKey = room.GameKey })); }
        catch (Exception ex) { _log.LogWarning(ex, "Publish RoomCreated thất bại"); }
        try { await _search.IndexGameAsync(ToRecord(room, 0)); }
        catch (Exception ex) { _log.LogWarning(ex, "Index OpenSearch thất bại"); }

        return Ok(GameMapper.ToDto(room));
    }

    /// <summary>Danh sách phòng đang chờ/đang chơi.</summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<RoomDto>>> List([FromQuery] string? gameKey = null)
    {
        var q = _db.GameRooms.Where(r => r.Status != "Finished");
        if (!string.IsNullOrWhiteSpace(gameKey)) q = q.Where(r => r.GameKey == gameKey);
        // Chỉ SELECT metadata — bỏ qua MapJson/StateJson (có thể vài KB mỗi phòng)
        // vì lobby không cần state chi tiết của từng ván.
        var rows = await q
            .OrderByDescending(r => r.CreatedAt)
            .Take(50)
            .Select(r => new { r.Id, r.GameKey, r.Status, r.RedPlayer, r.WhitePlayer, r.Winner, r.CreatedAt })
            .ToListAsync();
        var empty = GameJson.Element("{}");
        return Ok(rows.Select(r => new RoomDto(
            r.Id, r.GameKey, r.Status,
            r.RedPlayer, r.WhitePlayer, r.Winner,
            empty, empty, r.CreatedAt)));
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
        GameKey = r.GameKey,
        Status = r.Status,
        Winner = r.Winner,
        MoveCount = moveCount,
        RedPlayer = r.RedPlayer,
        WhitePlayer = r.WhitePlayer,
        CreatedAt = r.CreatedAt,
        FinishedAt = r.Status == "Finished" ? r.UpdatedAt : null,
    };
}

public record CreateGameRequest(string? GameKey, JsonElement? Options, string? PlayerName);
