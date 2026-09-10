using System.Text.Json;
using BoardGame.Api.Data;
using BoardGame.Api.Platform.Abstractions;
using BoardGame.Api.Platform.Auth;
using BoardGame.Api.Platform.Models;
using BoardGame.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace BoardGame.Api.Platform;

/// <summary>
/// REST cho sảnh chờ — GENERIC cho mọi game. Nước đi realtime đi qua GameHub.
/// Yêu cầu đăng nhập (JWT cookie) — danh tính ghế lấy từ token, không tin client tự khai.
/// Logic ghế/phòng đều gọi qua RoomService (dùng chung với GameHub) — controller ở đây chỉ
/// map HTTP <-> RoomService rồi phát LobbyUpdated qua SignalR khi trạng thái sảnh đổi.
/// </summary>
[Authorize]
[ApiController]
[Route("api/[controller]")]
public class GamesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly RoomService _rooms;
    private readonly RedisCacheService _cache;
    private readonly RabbitMqPublisher _queue;
    private readonly OpenSearchService _search;
    private readonly MinioStorageService _storage;
    private readonly GameEngineRegistry _engines;
    private readonly IHubContext<GameHub> _hub;
    private readonly ILogger<GamesController> _log;

    public GamesController(AppDbContext db, RoomService rooms, RedisCacheService cache, RabbitMqPublisher queue,
        OpenSearchService search, MinioStorageService storage, GameEngineRegistry engines, IHubContext<GameHub> hub,
        ILogger<GamesController> log)
    {
        _db = db;
        _rooms = rooms;
        _cache = cache;
        _queue = queue;
        _search = search;
        _storage = storage;
        _engines = engines;
        _hub = hub;
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
        if (string.IsNullOrWhiteSpace(req.GameKey)) return BadRequest(new { error = "Thiếu gameKey" });
        var displayName = User.GetDisplayName();

        var (room, error) = await _rooms.CreateRoomAsync(req.GameKey, userId.Value, displayName, req.Options);
        if (error is not null) return BadRequest(new { error });

        // Redis chỉ là cache — lỗi Redis không được chặn tạo phòng.
        try { await _cache.SetAsync($"game:{room!.Id}:state", room.StateJson); }
        catch (Exception ex) { _log.LogWarning(ex, "Ghi Redis cache thất bại"); }

        // Side-effect best-effort — không chặn tạo phòng.
        try { _queue.PublishGameEvent(GameJson.Serialize(new { type = "RoomCreated", roomId = room!.Id, gameKey = room.GameKey })); }
        catch (Exception ex) { _log.LogWarning(ex, "Publish RoomCreated thất bại"); }
        try { await _search.IndexGameAsync(ToRecord(room!, 0)); }
        catch (Exception ex) { _log.LogWarning(ex, "Index OpenSearch thất bại"); }

        await PublishLobbyUpdated(room!);

        var engine = _engines.Get(room!.GameKey);
        return Ok(GameMapper.ToDto(room!, engine, userId));
    }

    /// <summary>
    /// "Chơi lại" — tạo phòng mới cùng game/cùng số ghế với phòng vừa kết thúc, người gọi ngồi
    /// ghế 0. Chỉ tạo phòng cho người gọi; báo cho những người khác còn đang xem màn thắng/thua
    /// là việc của <c>GameHub.AnnounceRematch</c> (SignalR), REST ở đây không biết ai đang online.
    /// </summary>
    [HttpPost("{id:guid}/rematch")]
    public async Task<ActionResult<RoomDto>> Rematch(Guid id)
    {
        var userId = User.TryGetUserId();
        if (userId is null) return Unauthorized(new { error = "Phiên đăng nhập không hợp lệ." });
        var displayName = User.GetDisplayName();

        var (room, error) = await _rooms.CreateRematchAsync(id, userId.Value, displayName);
        if (error is not null) return BadRequest(new { error });

        try { await _cache.SetAsync($"game:{room!.Id}:state", room.StateJson); }
        catch (Exception ex) { _log.LogWarning(ex, "Ghi Redis cache thất bại"); }
        try { _queue.PublishGameEvent(GameJson.Serialize(new { type = "RoomCreated", roomId = room!.Id, gameKey = room.GameKey })); }
        catch (Exception ex) { _log.LogWarning(ex, "Publish RoomCreated thất bại"); }

        await PublishLobbyUpdated(room!);

        var engine = _engines.Get(room!.GameKey);
        return Ok(GameMapper.ToDto(room!, engine, userId));
    }

    /// <summary>Huỷ phòng do chính mình tạo — chỉ khi còn "Waiting" (chưa đủ người/chưa bắt đầu).</summary>
    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid id)
    {
        var userId = User.TryGetUserId();
        if (userId is null) return Unauthorized(new { error = "Phiên đăng nhập không hợp lệ." });

        var outcome = await _rooms.CancelRoomAsync(id, userId.Value);
        switch (outcome)
        {
            case RoomService.CancelOutcome.NotFound: return NotFound(new { error = "Không tìm thấy phòng." });
            case RoomService.CancelOutcome.NotWaiting: return BadRequest(new { error = "Chỉ huỷ được phòng đang chờ." });
            case RoomService.CancelOutcome.Forbidden: return Forbid();
        }

        var room = await _db.GameRooms.FindAsync(id);
        if (room is not null) await PublishLobbyUpdated(room);
        return Ok();
    }

    /// <summary>Ghép vào phòng "Waiting" còn ghế trống gần nhất theo gameKey, hết thì tự tạo phòng mới.</summary>
    [HttpPost("quick-match")]
    public async Task<ActionResult<RoomDto>> QuickMatch([FromBody] QuickMatchRequest req)
    {
        var userId = User.TryGetUserId();
        if (userId is null) return Unauthorized(new { error = "Phiên đăng nhập không hợp lệ." });
        if (string.IsNullOrWhiteSpace(req.GameKey)) return BadRequest(new { error = "Thiếu gameKey" });
        var displayName = User.GetDisplayName();

        var (room, error) = await _rooms.QuickMatchAsync(req.GameKey, userId.Value, displayName);
        if (error is not null) return BadRequest(new { error });

        await PublishLobbyUpdated(room!);
        var engine = _engines.Get(room!.GameKey);
        return Ok(GameMapper.ToDto(room!, engine, userId));
    }

    /// <summary>Danh sách phòng đang chờ/đang chơi (sảnh) — Playing cũng hiện để chủ ghế cũ có thể "vào lại".</summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<RoomSummaryDto>>> List([FromQuery] string? gameKey = null)
    {
        var userId = User.TryGetUserId();
        var q = _db.GameRooms.Where(r => r.Status == RoomStatus.Waiting || r.Status == RoomStatus.Playing);
        if (!string.IsNullOrWhiteSpace(gameKey)) q = q.Where(r => r.GameKey == gameKey);
        // Chỉ SELECT metadata — bỏ qua MapJson/StateJson (có thể vài KB mỗi phòng)
        // vì lobby không cần state chi tiết của từng ván.
        var rows = await q
            .OrderByDescending(r => r.CreatedAt)
            .Take(50)
            .Select(r => new { r.Id, r.GameKey, r.Status, r.CreatedAt, r.SeatCount, r.SeatsJson, r.OwnerUserId })
            .ToListAsync();

        return Ok(rows.Select(r => new RoomSummaryDto(
            r.Id, r.GameKey, r.Status, r.CreatedAt, r.SeatCount,
            GameMapper.SeatDtosOf(new GameRoom { SeatsJson = r.SeatsJson, SeatCount = r.SeatCount }),
            userId.HasValue && r.OwnerUserId == userId.Value)));
    }

    /// <summary>Chi tiết phòng; state nóng ưu tiên đọc từ Redis. Redact theo đúng ghế người gọi — REST cũng không được rò rỉ thông tin ẩn.</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<RoomDto>> Get(Guid id)
    {
        var userId = User.TryGetUserId();
        var room = await _db.GameRooms.FindAsync(id);
        if (room is null || !_engines.Has(room.GameKey)) return NotFound();
        var engine = _engines.Get(room.GameKey);

        try
        {
            var cachedState = await _cache.GetAsync($"game:{id}:state");
            if (cachedState is not null) room.StateJson = cachedState;
        }
        catch (Exception ex) { _log.LogWarning(ex, "Đọc Redis cache thất bại — dùng state từ DB"); }

        var mySide = GameMapper.MySideOf(room, engine, userId);
        var redacted = engine.RedactStateForViewer(room.StateJson, mySide);
        var dto = GameMapper.ToDto(room, engine, userId) with { State = GameJson.Element(redacted) };
        return Ok(dto);
    }

    /// <summary>Tìm kiếm lịch sử ván chơi (OpenSearch).</summary>
    [HttpGet("search")]
    public async Task<ActionResult<IEnumerable<GameRecord>>> Search([FromQuery] string q = "")
        => Ok(await _search.SearchGamesAsync(q));

    /// <summary>
    /// Xem lại 1 ván đã kết thúc — trả nguyên artifact đã lưu ở MinIO lúc ván kết thúc
    /// (<see cref="GameHub.FinishGame"/>: seats/map/finalState/danh sách nước đi theo thứ tự).
    /// MinioStorageService trước đây CHỈ GHI, chưa từng có cách đọc lại — trang "Lịch sử ván đấu"
    /// (<c>/history</c>) chỉ hiện tóm tắt (thắng/số nước đi), chưa ai xem lại được diễn biến thật.
    /// Không giới hạn chỉ người đã chơi mới xem được — cùng chính sách với `/history` (đã mở cho
    /// mọi người đăng nhập từ trước, không phải thông tin nhạy cảm sau khi ván đã kết thúc).
    /// </summary>
    [HttpGet("{id:guid}/replay")]
    public async Task<IActionResult> Replay(Guid id)
    {
        string? json;
        try { json = await _storage.GetReplayAsync($"replay-{id}.json"); }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Đọc replay từ MinIO thất bại");
            return StatusCode(503, new { error = "Không tải được replay lúc này. Thử lại sau." });
        }
        if (json is null) return NotFound(new { error = "Chưa có replay cho ván này (chưa kết thúc hoặc không tồn tại)." });
        return Ok(GameJson.Element(json));
    }

    private static GameRecord ToRecord(GameRoom r, int moveCount) => new()
    {
        Id = r.Id.ToString(),
        GameKey = r.GameKey,
        Status = r.Status,
        Winner = r.Winner,
        MoveCount = moveCount,
        Players = string.Join(", ", SeatCodec.SeatsOf(r).Select(s => s?.DisplayName).Where(n => !string.IsNullOrWhiteSpace(n))),
        CreatedAt = r.CreatedAt,
        FinishedAt = r.Status == RoomStatus.Finished ? r.UpdatedAt : null,
    };

    /// <summary>
    /// Báo sảnh đổi (tạo/đầy ghế/huỷ/kết thúc) cho mọi client đang SubscribeLobby.
    /// LƯU Ý: broadcast theo NHÓM (nhiều người xem khác nhau cùng nhận 1 payload), nên IsMine
    /// ở đây tính theo góc nhìn "không ai cụ thể" (luôn false) — KHÔNG đáng tin cho việc hiển
    /// thị nút HUỶ/"vào lại ván của tôi". Frontend nên chỉ tin IsMine lấy trực tiếp từ GET
    /// /api/games (mỗi người gọi tự thấy đúng góc nhìn của mình), dùng LobbyUpdated chỉ để biết
    /// CÓ thay đổi mà refetch/merge các field khác (status/seats), không ghi đè IsMine bằng nó.
    /// </summary>
    private async Task PublishLobbyUpdated(GameRoom room)
    {
        try
        {
            var dto = GameMapper.ToSummaryDto(room, null);
            await _hub.Clients.Group("lobby").SendAsync("LobbyUpdated", dto);
        }
        catch (Exception ex) { _log.LogWarning(ex, "Publish LobbyUpdated thất bại"); }
    }
}

public record CreateGameRequest(string? GameKey, JsonElement? Options);
public record QuickMatchRequest(string? GameKey);
