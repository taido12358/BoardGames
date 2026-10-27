using System.Collections.Concurrent;
using BoardGame.Api.Data;
using BoardGame.Api.Platform.Abstractions;
using BoardGame.Api.Platform.Auth;
using BoardGame.Api.Platform.Models;
using BoardGame.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace BoardGame.Api.Platform;

/// <summary>
/// SignalR hub — GENERIC cho mọi game. Toàn bộ logic phòng/ghế/ván
/// nằm ở <see cref="RoomService"/> — hub chỉ điều phối transport: nhận invoke, gọi RoomService,
/// rồi lo phần realtime (group/connection tracking, broadcast, best-effort cache/publish).
///
/// Yêu cầu đăng nhập (JWT cookie — SignalR đọc tự động qua JwtBearerEvents.OnMessageReceived,
/// xem Program.cs). Danh tính người gọi lấy từ Context.User (Claims), KHÔNG tin tham số
/// client tự gửi nữa — bài học 2026-08-05: trước đây hub nhận "playerName" thẳng từ client
/// để gán ghế, ai cũng giả được người khác chỉ bằng cách gửi đúng chuỗi tên.
///
/// Mô hình ghế (SeatsJson trên GameRoom) và side ("RED"/"WHITE"/"P0".."P{N-1}"...) nay HOÀN
/// TOÀN generic — hub không còn rẽ nhánh theo engine.MaxPlayers, side là quy ước riêng của
/// từng engine qua IGameEngine.SideForSeat.
/// </summary>
[Authorize]
public class GameHub : Hub
{
    // Hub instance là transient (tạo mới mỗi lần gọi) nên map connection -> (room, user id)
    // phải static để sống được giữa các lời gọi — cần cho việc gửi state RIÊNG theo
    // từng người xem (RedactStateForViewer) thay vì một bản y hệt cho cả nhóm. internal để
    // SeatTimeoutService (qua BroadcastRoomStateAsync) dùng chung được.
    private static readonly ConcurrentDictionary<string, (string RoomId, Guid UserId)> _connections = new();

    private const string LobbyGroup = "lobby";

    internal static Dictionary<Guid, HashSet<Guid>> ConnectedUsersByRoom() => _connections.Values.ToArray()
        .GroupBy(connection => Guid.Parse(connection.RoomId))
        .ToDictionary(group => group.Key, group => group.Select(connection => connection.UserId).ToHashSet());

    private readonly AppDbContext _db;
    private readonly RoomService _rooms;
    private readonly RedisCacheService _cache;
    private readonly RabbitMqPublisher _queue;
    private readonly OpenSearchService _search;
    private readonly MinioStorageService _storage;
    private readonly GameEngineRegistry _engines;
    private readonly ILogger<GameHub> _log;

    public GameHub(AppDbContext db, RoomService rooms, RedisCacheService cache, RabbitMqPublisher queue,
        OpenSearchService search, MinioStorageService storage, GameEngineRegistry engines,
        ILogger<GameHub> log)
    {
        _db = db;
        _rooms = rooms;
        _cache = cache;
        _queue = queue;
        _search = search;
        _storage = storage;
        _engines = engines;
        _log = log;
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (_connections.TryRemove(Context.ConnectionId, out var info))
            await MarkSeatDisconnectedIfLastConnectionAsync(info.RoomId, info.UserId);
        await base.OnDisconnectedAsync(exception);
    }

    private async Task MarkSeatDisconnectedIfLastConnectionAsync(string roomId, Guid userId)
    {
        // Leaving a room and closing the socket have the same seat-liveness semantics.
        // Another tab in the same room must keep the seat connected.
        if (_connections.Values.Any(v => v.RoomId == roomId && v.UserId == userId)) return;
        try
        {
            if (!Guid.TryParse(roomId, out var id)) return;
            if (!await _rooms.MarkSeatDisconnectedAsync(id, userId)) return;
            var room = await _db.GameRooms.FindAsync(id);
            if (room is not null && _engines.Has(room.GameKey))
                await BroadcastRoomStateAsync(Clients, roomId, room, _engines.Get(room.GameKey));
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Xử lý rời phòng/mất kết nối thất bại cho phòng {RoomId}", roomId);
        }
    }

    /// <summary>Danh tính người gọi từ JWT cookie — null nếu token không hợp lệ (không nên xảy ra sau [Authorize], phòng thủ thêm).</summary>
    private Guid? CallerUserId => Context.User?.TryGetUserId();
    private string CallerDisplayName => Context.User?.GetDisplayName() ?? "Ẩn danh";

    // ----- Sảnh (danh sách phòng realtime) -----

    public Task SubscribeLobby() => Groups.AddToGroupAsync(Context.ConnectionId, LobbyGroup);
    public Task UnsubscribeLobby() => Groups.RemoveFromGroupAsync(Context.ConnectionId, LobbyGroup);

    // ----- Game realtime -----

    /// <summary>Tham gia phòng: nhận ghế và subscribe nhóm phòng. Danh tính lấy từ JWT, không nhận playerName từ client.</summary>
    public async Task JoinRoom(string roomId)
    {
        var userId = CallerUserId;
        if (userId is null) { await Err("Phiên đăng nhập không hợp lệ."); return; }
        if (!Guid.TryParse(roomId, out var id)) { await Err("roomId không hợp lệ"); return; }

        var (room, side, error) = await _rooms.JoinRoomAsync(id, userId.Value, CallerDisplayName);
        if (error is not null) { await Err(error); return; }

        if (_connections.TryGetValue(Context.ConnectionId, out var previous) && previous.RoomId != roomId)
        {
            _connections.TryRemove(Context.ConnectionId, out _);
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, previous.RoomId);
            await MarkSeatDisconnectedIfLastConnectionAsync(previous.RoomId, previous.UserId);
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
        _connections[Context.ConnectionId] = (roomId, userId.Value);

        var engine = _engines.Get(room!.GameKey);
        await Clients.Caller.SendAsync("Seated", new { roomId, side });
        await BroadcastRoomStateAsync(Clients, roomId, room, engine);
    }

    /// <summary>Rời đúng phòng đang theo dõi; tab cuối rời sẽ đánh dấu ghế mất kết nối để timeout xử lý.</summary>
    public async Task LeaveRoom(string roomId)
    {
        if (!_connections.TryGetValue(Context.ConnectionId, out var info)) return; // idempotent after an earlier leave
        if (info.RoomId != roomId) { await Err("Bạn chưa ở trong phòng này."); return; }
        _connections.TryRemove(Context.ConnectionId, out _);
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);
        await MarkSeatDisconnectedIfLastConnectionAsync(info.RoomId, info.UserId);
    }

    /// <summary>
    /// Chat trong phòng — GENERIC cho mọi game (Platform, không phải riêng game nào). Chỉ
    /// broadcast qua SignalR, KHÔNG lưu DB — mất khi phòng đóng/người chat tải lại trang. Cả
    /// player lẫn spectator đều chat được (xem rules/coding/security.md mục "Phân quyền": khán
    /// giả được phép chat) — chỉ cần đã JoinRoom đúng phòng này (tracked trong _connections),
    /// không phân biệt có ghế hay không.
    /// </summary>
    public async Task SendChatMessage(string roomId, string text)
    {
        var userId = CallerUserId;
        if (userId is null) { await Err("Phiên đăng nhập không hợp lệ."); return; }
        if (!_connections.TryGetValue(Context.ConnectionId, out var info) || info.RoomId != roomId)
        {
            await Err("Bạn chưa ở trong phòng này.");
            return;
        }

        var trimmed = text?.Trim() ?? "";
        if (trimmed.Length == 0) return;
        if (trimmed.Length > 500) trimmed = trimmed[..500]; // chặn spam tin nhắn khổng lồ

        var message = new
        {
            roomId,
            userId = userId.Value,
            displayName = CallerDisplayName,
            text = trimmed,
            sentAt = DateTimeOffset.UtcNow,
        };
        await Clients.Group(roomId).SendAsync("ChatMessageReceived", message);
    }

    /// <summary>
    /// Báo cho những người còn đang xem màn thắng/thua ở phòng CŨ rằng đã có phòng chơi lại —
    /// chỉ rebroadcast, không tạo phòng (đó là việc của REST <c>POST /api/games/{id}/rematch</c>,
    /// xem GamesController.Rematch/RoomService.CreateRematchAsync). Người tạo tự điều hướng
    /// bằng response của REST, không cần nhận lại broadcast của chính mình.
    /// </summary>
    public async Task AnnounceRematch(string oldRoomId, string newRoomId)
    {
        if (!_connections.TryGetValue(Context.ConnectionId, out var info) || info.RoomId != oldRoomId)
        {
            await Err("Bạn không ở trong phòng này.");
            return;
        }
        await Clients.OthersInGroup(oldRoomId).SendAsync("RematchAvailable", new { oldRoomId, newRoomId, byDisplayName = CallerDisplayName });
    }

    /// <summary>
    /// Thực hiện một nước đi. moveJson là payload tuỳ game; hub xác định ghế của
    /// người chơi (theo JWT, không theo tham số client) rồi giao cho engine tương ứng.
    /// </summary>
    public async Task MakeMove(string roomId, string moveJson)
    {
        var userId = CallerUserId;
        if (userId is null) { await Err("Phiên đăng nhập không hợp lệ."); return; }
        if (!Guid.TryParse(roomId, out var id)) { await Err("roomId không hợp lệ"); return; }

        var (room, outcome, side, error) = await _rooms.MakeMoveAsync(id, userId.Value, moveJson);
        if (error is not null) { await Err(error); return; }
        var engine = _engines.Get(room!.GameKey);

        // Redis chỉ là cache — không được để lỗi Redis chặn broadcast GameStateUpdated
        // (nếu không client sẽ thấy "không đi được quân" dù nước đi đã lưu DB).
        try { await _cache.SetAsync($"game:{id}:state", room.StateJson); }
        catch (Exception ex) { _log.LogWarning(ex, "Ghi Redis cache thất bại"); }

        try { _queue.PublishGameEvent(GameJson.Serialize(new { type = "Move", roomId, side, move = GameJson.Element(moveJson), winner = outcome!.Winner })); }
        catch (Exception ex) { _log.LogWarning(ex, "Publish Move thất bại"); }

        if (outcome!.Winner is not null)
        {
            try { await FinishGame(_db, _search, _storage, room, id); }
            catch (Exception ex) { _log.LogWarning(ex, "Lưu kết quả/replay thất bại"); }
        }

        await BroadcastRoomStateAsync(Clients, roomId, room, engine);
    }

    /// <summary>
    /// Gửi GameStateUpdated RIÊNG cho từng connection đang ở trong phòng — mỗi người
    /// nhận state đã qua engine.RedactStateForViewer(side) theo đúng ghế của họ, thay
    /// vì một bản y hệt cho cả nhóm. Với engine không có thông tin ẩn (vd VayBat),
    /// RedactStateForViewer mặc định trả nguyên state nên nội dung nhận được y hệt
    /// broadcast nhóm trước đây — chỉ đổi cơ chế gửi, không đổi dữ liệu.
    ///
    /// static + nhận IHubClients (không phải this.Clients) để SeatTimeoutService (chạy ngoài
    /// một hub instance, chỉ có IHubContext&lt;GameHub&gt;) cũng gọi được nguyên vẹn logic này.
    /// </summary>
    public static async Task BroadcastRoomStateAsync(IHubClients<IClientProxy> clients, string roomId, GameRoom room, IGameEngine engine)
    {
        var recipients = _connections.Where(kv => kv.Value.RoomId == roomId).ToList();
        if (recipients.Count == 0)
        {
            // Không track được connection nào (không nên xảy ra bình thường — mọi
            // connection trong group đều đã qua JoinRoom). An toàn nhất là gửi bản
            // đã ẩn tối đa (side=null) cho cả nhóm, tránh rò rỉ thông tin ẩn.
            var safeDto = GameMapper.ToDto(room, engine, null);
            var safeRedacted = engine.RedactStateForViewer(room.StateJson, null);
            await clients.Group(roomId).SendAsync("GameStateUpdated", safeDto with { State = GameJson.Element(safeRedacted) });
            return;
        }

        foreach (var (connectionId, info) in recipients)
        {
            var dto = GameMapper.ToDto(room, engine, info.UserId);
            var redacted = engine.RedactStateForViewer(room.StateJson, dto.MySide);
            await clients.Client(connectionId).SendAsync("GameStateUpdated", dto with { State = GameJson.Element(redacted) });
        }
    }

    /// <summary>
    /// Index lịch sử (OpenSearch) + lưu artifact replay (MinIO) khi 1 ván kết thúc — gọi được từ
    /// BẤT KỲ nơi nào có thể set <c>room.Winner</c>, không chỉ <see cref="MakeMove"/>. static +
    /// nhận dependency qua tham số (giống <see cref="BroadcastRoomStateAsync"/>) vì
    /// <c>SeatTimeoutService</c> (BackgroundService riêng, không có instance GameHub) và
    /// <c>BangDebugController</c> cũng cần gọi được — trước 2026-09-11, 2 nơi đó tự set
    /// Status/Winner trực tiếp mà KHÔNG gọi hàm này, khiến ván thắng qua timeout/debug panel vô
    /// hình với cả `/history` lẫn Replay (phát hiện lúc live-test tính năng Replay, xem
    /// rules/tasks/backlog.md).
    /// </summary>
    public static async Task FinishGame(AppDbContext db, OpenSearchService search, MinioStorageService storage, GameRoom room, Guid id)
    {
        var moves = await db.GameMoves
            .Where(m => m.RoomId == id)
            .OrderBy(m => m.MoveNumber)
            .ToListAsync();

        var seatNames = SeatCodec.SeatsOf(room).Select(s => s?.DisplayName).ToList();
        var playersLabel = string.Join(", ", seatNames.Where(n => !string.IsNullOrWhiteSpace(n)));

        await search.IndexGameAsync(new GameRecord                       // OpenSearch
        {
            Id = room.Id.ToString(),
            GameKey = room.GameKey,
            Status = room.Status,
            Winner = room.Winner,
            MoveCount = moves.Count,
            Players = playersLabel,
            CreatedAt = room.CreatedAt,
            FinishedAt = room.UpdatedAt,
        });

        await storage.SaveReplayAsync($"replay-{room.Id}.json", ReplayArtifact.Serialize(room, moves));
    }

    private Task Err(string message) => Clients.Caller.SendAsync("Error", message);
}
