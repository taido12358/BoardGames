namespace BoardGame.Api.Platform.Models;

/// <summary>
/// Giá trị hợp lệ của GameRoom.Status (vẫn là cột text tự do — chỉ chuẩn hoá giá trị dùng).
/// Tách rõ Cancelled (chủ phòng tự huỷ) và Abandoned (hệ thống dọn — bỏ dở khi chờ, hoặc mất
/// kết nối quá lâu giữa ván) khỏi Finished (chỉ dùng khi ván có kết quả thật) — trước đây cả
/// 3 trường hợp bị gộp chung "Finished" khiến lịch sử/OpenSearch không phân biệt được.
/// </summary>
public static class RoomStatus
{
    public const string Waiting = "Waiting";
    public const string Playing = "Playing";
    public const string Finished = "Finished";
    public const string Cancelled = "Cancelled";
    public const string Abandoned = "Abandoned";

    /// <summary>Phòng còn "mở" (hiện trong sảnh) — dùng thay cho so sánh "!= Finished" trước đây.</summary>
    public static bool IsOpen(string status) => status == Waiting || status == Playing;
}
