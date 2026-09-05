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

    /// <summary>
    /// Tên "side" (ghế người chơi dùng trong ApplyMove/RedactStateForViewer) ứng với chỉ số
    /// ghế 0-based mà Platform gán — Platform không còn tự phân biệt game 2 người/N người,
    /// engine tự quyết định vocabulary side của mình. Mặc định "P0".."P{N-1}" (như Bang);
    /// game 2 người có side cố định (như VayBat "RED"/"WHITE") override lại.
    /// </summary>
    string SideForSeat(int seatIndex) => $"P{seatIndex}";

    /// <summary>
    /// Phòng vừa đủ ghế (tất cả SeatCount ghế đã có người) — engine tự quyết có cần làm gì để
    /// thật sự bắt đầu ván hay không (vd chia bài/vai trò khi đã biết tên thật của mọi người,
    /// điều NewGame() chưa biết vì gọi trước khi ai vào phòng). seatDisplayNames theo đúng thứ
    /// tự ghế 0..N-1. Mặc định: không cần làm gì (như Vây Bắt — NewGame() đã đủ để chơi ngay).
    /// </summary>
    MoveOutcome OnRoomFull(string mapJson, string stateJson, IReadOnlyList<string> seatDisplayNames)
        => new MoveOutcome(true, null, stateJson, null);

    /// <summary>
    /// Ghế "side" mất kết nối quá lâu giữa ván (xem SeatTimeoutService) — engine tự quyết xử lý
    /// (bỏ lượt, xử thua, tự động chọn hành động mặc định…) vì chỉ engine mới biết ý nghĩa của
    /// việc "một ghế biến mất" trong luật của mình. Trả Ok=false nếu side đó hiện KHÔNG ở vị trí
    /// cần hành động (chưa tới lượt/không liên quan) — SeatTimeoutService sẽ thử lại sau, không
    /// coi là lỗi. Mặc định: không có khái niệm lượt/AFK, không làm gì.
    /// </summary>
    MoveOutcome OnSeatTimedOut(string mapJson, string stateJson, string side)
        => new MoveOutcome(false, null, stateJson, null);
}
