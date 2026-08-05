using System.Text.Json;

namespace BoardGame.Api.Platform.Abstractions;

/// <summary>
/// Kết quả của một nước đi do engine xử lý (ở biên JSON).
/// </summary>
public record MoveOutcome(bool Ok, string? Error, string StateJson, string? Winner);

/// <summary>
/// Hợp đồng mà MỌI boardgame phải hiện thực. Platform (room/lobby/hub/replay)
/// chỉ làm việc qua interface này và truyền JSON qua lại — nên hoàn toàn KHÔNG
/// cần biết shape map/state/move của từng game. Thêm game mới = thêm 1 lớp
/// implement IGameEngine rồi đăng ký DI, không phải sửa platform.
/// </summary>
public interface IGameEngine
{
    /// <summary>Khoá định danh game (vd. "vaybat"), dùng làm discriminator.</summary>
    string Key { get; }
    string DisplayName { get; }
    int MinPlayers { get; }
    int MaxPlayers { get; }

    /// <summary>Tạo ván mới: trả về (MapJson, StateJson). options do từng game tự hiểu.</summary>
    (string MapJson, string StateJson) NewGame(JsonElement? options);

    /// <summary>
    /// Validate &amp; áp dụng một nước đi (authoritative).
    /// side = ghế của người đi ("RED"/"WHITE"...). moveJson = payload tuỳ game.
    /// </summary>
    MoveOutcome ApplyMove(string mapJson, string stateJson, string side, string moveJson);

    /// <summary>
    /// Ẩn thông tin riêng tư (bài trên tay, vai trò ẩn…) khỏi state TRƯỚC KHI gửi
    /// cho một người xem cụ thể qua SignalR — thay vì gửi nguyên state rồi ẩn bằng
    /// CSS phía client (không an toàn: dữ liệu vẫn nằm trong response).
    /// side = ghế của người xem; null = khán giả (ẩn tối đa).
    /// Mặc định: không có thông tin ẩn (như Vây Bắt) — trả nguyên state, không override.
    /// </summary>
    string RedactStateForViewer(string stateJson, string? side) => stateJson;
}
