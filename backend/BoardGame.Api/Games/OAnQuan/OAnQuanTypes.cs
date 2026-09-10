namespace BoardGame.Api.Games.OAnQuan;

/// <summary>
/// Trạng thái runtime của một ván Ô Ăn Quan. 12 ô theo một vòng cố định:
/// [0]=Quan (phía P0), [1..5]=5 ô dân của P0, [6]=Quan (phía P1), [7..11]=5 ô dân của P1,
/// rồi vòng lại [0]. Không có "map" thật sự (bàn cờ luôn cố định) nên <see cref="OAnQuanEngine"/>
/// trả MapJson rỗng — layout này là kiến thức cố định dùng chung giữa <see cref="OAnQuanRules"/>
/// và frontend.
/// </summary>
public class GameState
{
    public int[] Pits { get; set; } = new int[12];

    /// <summary>
    /// Đã ăn quân "quan" gốc ở ô 0 / ô 6 chưa — quyết định điều kiện kết thúc ván.
    /// KHÔNG dùng "Pits[quanIndex] == 0" để kiểm tra vì ô quan có thể có lại vài quân nhỏ
    /// do rải quân đi ngang qua SAU KHI đã ăn quân quan gốc.
    /// </summary>
    public bool[] QuanCaptured { get; set; } = new bool[2];

    /// <summary>Điểm (số quân đã ăn được) — [0] = P0, [1] = P1.</summary>
    public int[] Scores { get; set; } = new int[2];

    public string Turn { get; set; } = "P0";

    /// <summary>"P0" | "P1" | "DRAW" | null (chưa kết thúc).</summary>
    public string? Winner { get; set; }
}

/// <summary>Payload nước đi — Direction: "cw" (tăng dần chỉ số ô) hoặc "ccw" (giảm dần).</summary>
public record OAnQuanMove(int PitIndex, string Direction);
