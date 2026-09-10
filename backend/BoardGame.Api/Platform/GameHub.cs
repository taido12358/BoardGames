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
        {
            // Chỉ đánh dấu "mất kết nối" khi đây là connection CUỐI CÙNG của user này trong
            // phòng — một người mở 2 tab rồi đóng bớt 1 tab không phải là mất kết nối thật.
            var stillConnected = _connections.Values.Any(v => v.RoomId == info.RoomId && v.UserId == info.UserId);
            if (!stillConnected)
            {
                try
                {
                    if (Guid.TryParse(info.RoomId, out var roomGuid))
                    {
                        var changed = await _rooms.MarkSeatDisconnectedAsync(roomGuid, info.UserId);
                        if (changed)
                        {
                            var room = await _db.GameRooms.FindAsync(roomGuid);
                            if (room is not null && _engines.Has(room.GameKey))
                                await BroadcastRoomStateAsync(Clients, info.RoomId, room, _engines.Get(room.GameKey));
                        }
                    }
                }
                catch (Exception ex)
                {
                    _log.LogWarning(ex, "Xử lý mất kết nối thất bại cho phòng {RoomId}", info.RoomId);
                }
            }
        }
        await base.OnDisconnectedAsync(exception);
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

        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
        _connections[Context.ConnectionId] = (roomId, userId.Value);

        var engine = _engines.Get(room!.GameKey);
        await Clients.Caller.SendAsync("Seated", new { side });
        await BroadcastRoomStateAsync(Clients, roomId, room, engine);
    }

    public Task LeaveRoom(string roomId)
    {
        _connections.TryRemove(Context.ConnectionId, out _);
        return Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);
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
        await Clients.OthersInGroup(oldRoomId).SendAsync("RematchAvailable", new { newRoomId, byDisplayName = CallerDisplayName });
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
            try { await FinishGame(room, id); }
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

    private async Task FinishGame(GameRoom room, Guid id)
    {
        var moves = await _db.GameMoves
            .Where(m => m.RoomId == id)
            .OrderBy(m => m.MoveNumber)
            .ToListAsync();

        var seatNames = SeatCodec.SeatsOf(room).Select(s => s?.DisplayName).ToList();
        var playersLabel = string.Join(", ", seatNames.Where(n => !string.IsNullOrWhiteSpace(n)));

        await _search.IndexGameAsync(new GameRecord                       // OpenSearch
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

        await _storage.SaveReplayAsync($"replay-{room.Id}.json", GameJson.Serialize(new // MinIO
        {
            room.Id, room.GameKey, room.Winner,
            seats = seatNames,
            map = GameJson.Element(room.MapJson),
            finalState = GameJson.Element(room.StateJson),
            moves = moves.Select(m => new { m.MoveNumber, m.Side, move = GameJson.Element(m.MoveJson) }),
        }));
    }

    private Task Err(string message) => Clients.Caller.SendAsync("Error", message);
}
