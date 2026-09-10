using BoardGame.Api.Data;
using BoardGame.Api.Platform;
using BoardGame.Api.Platform.Abstractions;
using BoardGame.Api.Platform.Auth;
using BoardGame.Api.Platform.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace BoardGame.Api.Games.Bang;

/// <summary>
/// Debug panel cho BANG! — theo đúng van-de.md §51 ("For development only... Never expose it
/// in production"). CHỈ bật khi Development THẬT (<see cref="IHostEnvironment.IsDevelopment"/>)
/// HOẶC cờ cấu hình rõ ràng <c>Debug:BangPanelEnabled</c> — không chỉ dựa vào IsDevelopment() vì
/// stack Docker Compose local của dự án này chạy ASPNETCORE_ENVIRONMENT=Production (xem
/// docker-compose.yml), cùng lý do <see cref="Services.SmtpOtpSender"/> phải dùng thêm cờ
/// <c>Auth:DevLogOtp</c> thay vì chỉ IsDevelopment(). Mặc định cờ này TẮT (an toàn) — chỉ
/// docker-compose.yml của dự án mới bật sẵn cho máy dev.
///
/// Cố tình BỎ QUA validate lượt/lá bài bình thường (mục đích của debug panel là ép trạng thái
/// tuỳ ý để test) — tái dùng logic thiệt hại/loại/thắng-thua thật qua BangRules.DebugXxx thay vì
/// tự viết lại, để không lệch hành vi với luồng chơi thật (elimination, rút bài thưởng khi hạ
/// Outlaw, v.v.). Không dùng SELECT FOR UPDATE như RoomService — công cụ dev-only, không cần an
/// toàn đồng thời cấp production.
/// </summary>
[Authorize]
[ApiController]
[Route("api/debug/bang")]
public class BangDebugController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IHostEnvironment _env;
    private readonly IConfiguration _config;
    private readonly IHubContext<GameHub> _hub;
    private readonly GameEngineRegistry _engines;
    private readonly ILogger<BangDebugController> _log;

    public BangDebugController(AppDbContext db, IHostEnvironment env, IConfiguration config,
        IHubContext<GameHub> hub, GameEngineRegistry engines, ILogger<BangDebugController> log)
    {
        _db = db;
        _env = env;
        _config = config;
        _hub = hub;
        _engines = engines;
        _log = log;
    }

    private bool IsEnabled => _env.IsDevelopment() || _config.GetValue<bool>("Debug:BangPanelEnabled");

    /// <summary>Frontend gọi lúc mount để quyết định có hiện nút "Debug" hay không — không tiết lộ gì nhạy cảm, chỉ true/false.</summary>
    [HttpGet("enabled")]
    public ActionResult<object> Enabled() => Ok(new { enabled = IsEnabled });

    public record ForceDrawRequest(string PlayerId, int Count = 1);
    public record ForceDamageRequest(string PlayerId, int Amount = 1);

    [HttpGet("{roomId:guid}/state")]
    public async Task<IActionResult> FullState(Guid roomId)
    {
        if (!IsEnabled) return NotFound();
        var room = await _db.GameRooms.FindAsync(roomId);
        if (room is null || room.GameKey != "bang") return NotFound();
        // Trả THẲNG StateJson, KHÔNG qua RedactStateForViewer — mục đích debug là thấy hết
        // (bài mọi người, vai trò ẩn) để kiểm tra logic, khác hẳn luồng xem bình thường.
        return Content(room.StateJson, "application/json");
    }

    [HttpPost("{roomId:guid}/force-draw")]
    public Task<IActionResult> ForceDraw(Guid roomId, [FromBody] ForceDrawRequest req)
        => Mutate(roomId, "force-draw", state =>
        {
            BangRules.DebugForceDraw(state, req.PlayerId, req.Count, Random.Shared);
            return null;
        });

    [HttpPost("{roomId:guid}/force-damage")]
    public Task<IActionResult> ForceDamage(Guid roomId, [FromBody] ForceDamageRequest req)
        => Mutate(roomId, "force-damage", state => BangRules.DebugForceDamage(state, req.PlayerId, req.Amount, Random.Shared));

    [HttpPost("{roomId:guid}/force-end-turn")]
    public Task<IActionResult> ForceEndTurn(Guid roomId)
        => Mutate(roomId, "force-end-turn", state =>
        {
            BangRules.DebugForceEndTurn(state, Random.Shared);
            return null;
        });

    private async Task<IActionResult> Mutate(Guid roomId, string action, Func<BangGameState, string?> apply)
    {
        if (!IsEnabled) return NotFound();

        var room = await _db.GameRooms.FindAsync(roomId);
        if (room is null || room.GameKey != "bang") return NotFound();
        if (room.Status != RoomStatus.Playing) return BadRequest(new { error = "Phòng chưa ở trạng thái đang chơi." });

        // Log ai-làm-gì-lúc-nào ngay cả ở debug tool — cùng tinh thần rules/coding/security.md
        // (mọi thao tác mutate state đáng ngờ đều nên để lại dấu vết, kể cả tool dev-only).
        _log.LogWarning("[BangDebug] {Email} gọi {Action} trên phòng {RoomId}", User.TryGetEmail(), action, roomId);

        BangGameState state;
        try { state = GameJson.Deserialize<BangGameState>(room.StateJson); }
        catch (Exception ex) { return BadRequest(new { error = $"State hỏng: {ex.Message}" }); }

        string? winner;
        try { winner = apply(state); }
        catch (ArgumentException ex) { return BadRequest(new { error = ex.Message }); }

        room.StateJson = GameJson.Serialize(state);
        if (winner is not null) { room.Status = RoomStatus.Finished; room.Winner = winner; }
        room.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var engine = _engines.Get("bang");
        await GameHub.BroadcastRoomStateAsync(_hub.Clients, roomId.ToString(), room, engine);
        return Ok(new { ok = true });
    }
}
