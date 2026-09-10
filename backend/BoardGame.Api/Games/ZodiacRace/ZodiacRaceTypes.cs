namespace BoardGame.Api.Games.ZodiacRace;

/// <summary>
/// "Map" ở đây là đường đua tĩnh, giống nhau mọi ván (không phụ thuộc số người chơi) — không
/// có khái niệm hình học như VayBat. CrateTiles: các ô có thùng hàng, dừng đúng ô đó (kể cả đi
/// ngang qua không tính, phải DỪNG hẳn) được +1 điểm thu thập (không ảnh hưởng thắng/thua, chỉ
/// là điểm phụ để chấm khi 2 xe cùng cán đích... hiện tại chưa dùng tới vì thắng là ai về đích
/// TRƯỚC, giữ lại cho hướng mở rộng sau — xem ADR trong rules/history/decisions.md).
/// </summary>
public class MapDef
{
    public int TrackLength { get; set; } = 30;
    public int[] CrateTiles { get; set; } = { 5, 10, 15, 20, 25 };
}

/// <summary>
/// State — mảng Positions/CratesCollected đánh số theo seat index (0-based), side tương ứng là
/// "P{index}" (mặc định IGameEngine.SideForSeat, không override). Started=false nghĩa là phòng
/// chưa đủ người, mảng còn rỗng — IGameEngine.OnRoomFull mới thật sự cấp phát theo đúng số ghế
/// (không tự đoán seatCount từ options ở NewGame() để tránh lệch với RoomService.ResolveSeatCount).
/// </summary>
public class GameState
{
    public bool Started { get; set; }
    public int[] Positions { get; set; } = Array.Empty<int>();
    public int[] CratesCollected { get; set; } = Array.Empty<int>();
    public int Turn { get; set; }
    public int? LastRoll { get; set; }
    public string? Winner { get; set; }
}

/// <summary>Chỉ một loại nước đi duy nhất ở v1: đổ xúc xắc rồi tự động di chuyển — không có lựa chọn nào khác cho người chơi.</summary>
public record ZodiacRaceMove(string Type);
