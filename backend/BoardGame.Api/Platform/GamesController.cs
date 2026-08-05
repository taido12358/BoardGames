using System.Text.Json;
using BoardGame.Api.Data;
using BoardGame.Api.Platform.Abstractions;
using BoardGame.Api.Platform.Auth;
using BoardGame.Api.Platform.Models;
using BoardGame.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BoardGame.Api.Platform;

/// <summary>
/// REST cho sảnh chờ — GENERIC cho mọi game. Nước đi realtime đi qua GameHub.
/// Yêu cầu đăng nhập (JWT cookie) — danh tính ghế lấy từ token, không tin client tự khai.
/// </summary>
[Authorize]
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

    /// <summary>Danh sách game đang hỗ trợ (cho Thư viện trò chơi).</summary>
    [HttpGet("engines")]
    public ActionResult<object> Engines()
        => Ok(_engines.All.Select(e => new { e.Key, e.DisplayName, e.MinPlayers, e.MaxPlayers }));

    /// <summary>Tạo phòng mới cho một game bất kỳ. Người tạo tự động ngồi ghế đầu tiên.</summary>
    [HttpPost]
    public async Task<ActionResult<RoomDto>> Create([FromBody] CreateGameRequest req)
    {
        var userId = User.TryGetUserId();
        if (userId is null) return Unauthorized(new { error = "Phiên đăng nhập không hợp lệ." });
        var displayName = User.GetDisplayName();

        var key = string.IsNullOrWhiteSpace(req.GameKey) ? "vaybat" : req.GameKey;
        if (!_engines.Has(key)) return BadRequest($"Game '{key}' chưa được hỗ trợ");

        var engine = _engines.Get(key);
        var (mapJson, stateJson) = engine.NewGame(req.Options);

        var room = new GameRoom
        {
            GameKey = engine.Key,
            Status = "Waiting",
            MapJson = mapJson,
            StateJson = stateJson,
        };

        if (engine.MaxPlayers <= 2)
        {
            // Game 2 người: đường cũ, không đổi hành vi hiển thị — chỉ thêm Id để xác thực.
            room.RedPlayer = displayName;
            room.RedPlayerId = userId;
        }
        else
        {
            // Game > 2 người: ghế generic. Người tạo phòng ngồi ghế 0 luôn.
            room.SeatCount = ResolveSeatCount(req.Options, engine.MinPlayers, engine.MaxPlayers);
            var seats = new string?[room.SeatCount];
            var seatIds = new string?[room.SeatCount];
            seats[0] = displayName;
            seatIds[0] = userId.ToString();
            room.SeatsJson = GameJson.Serialize(seats);
            room.SeatUserIdsJson = GameJson.Serialize(seatIds);
        }

        _db.GameRooms.Add(room);                                          // PostgreSQL (cốt lõi)
        await _db.SaveChangesAsync();

        // Redis chỉ là cache — lỗi Redis không được chặn tạo phòng.
        try { await _cache.SetAsync($"game:{room.Id}:state", room.StateJson); }
        catch (Exception ex) { _log.LogWarning(ex, "Ghi Redis cache thất bại"); }

        // Side-effect best-effort — không chặn tạo phòng.
        try { _queue.PublishGameEvent(GameJson.Serialize(new { type = "RoomCreated", roomId = room.Id, gameKey = room.GameKey })); }
        catch (Exception ex) { _log.LogWarning(ex, "Publish RoomCreated thất bại"); }
        try { await _search.IndexGameAsync(ToRecord(room, 0)); }
        catch (Exception ex) { _log.LogWarning(ex, "Index OpenSearch thất bại"); }

        return Ok(GameMapper.ToDto(room));
    }

    /// <summary>Huỷ phòng do chính mình tạo — chỉ khi còn "Waiting" (chưa đủ người/chưa bắt đầu).</summary>
    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid id)
    {
        var userId = User.TryGetUserId();
        if (userId is null) return Unauthorized(new { error = "Phiên đăng nhập không hợp lệ." });

        var room = await _db.GameRooms.FindAsync(id);
        if (room is null) return NotFound(new { error = "Không tìm thấy phòng." });
        if (room.Status != "Waiting") return BadRequest(new { error = "Chỉ huỷ được phòng đang chờ." });

        var isOwner = _engines.Has(room.GameKey) && _engines.Get(room.GameKey).MaxPlayers <= 2
            ? room.RedPlayerId == userId
            : GameMapper.SeatUserIdsOf(room).FirstOrDefault() == userId.ToString();
        if (!isOwner) return Forbid();

        room.Status = "Finished";
        room.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok();
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
            .Select(r => new { r.Id, r.GameKey, r.Status, r.RedPlayer, r.WhitePlayer, r.Winner, r.CreatedAt, r.SeatCount, r.SeatsJson })
            .ToListAsync();
        var empty = GameJson.Element("{}");
        return Ok(rows.Select(r => new RoomDto(
            r.Id, r.GameKey, r.Status,
            r.RedPlayer, r.WhitePlayer, r.Winner,
            empty, empty, r.CreatedAt,
            r.SeatCount, SafeSeats(r.SeatsJson))));
    }

    private static List<string?> SafeSeats(string seatsJson)
    {
        try { return GameJson.Deserialize<List<string?>>(seatsJson) ?? new(); }
        catch { return new(); }
    }

    /// <summary>Số ghế mong muốn cho game > 2 người: đọc options.seatCount (nếu hợp lệ), kẹp trong [min,max], mặc định max.</summary>
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

    /// <summary>Chi tiết phòng; state nóng ưu tiên đọc từ Redis.</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<RoomDto>> Get(Guid id)
    {
        var room = await _db.GameRooms.FindAsync(id);
        if (room is null) return NotFound();

        try
        {
            var cachedState = await _cache.GetAsync($"game:{id}:state");
            if (cachedState is not null) room.StateJson = cachedState;
        }
        catch (Exception ex) { _log.LogWarning(ex, "Đọc Redis cache thất bại — dùng state từ DB"); }

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

public record CreateGameRequest(string? GameKey, JsonElement? Options);
