using System.Text.Json;
using System.Text.Json.Serialization;

namespace BoardGame.Api.Platform;

/// <summary>Cấu hình JSON dùng chung (camelCase + không phân biệt hoa thường + enum dạng chuỗi).</summary>
public static class GameJson
{
    // Enum dạng chuỗi (vd "bang" thay vì 0) — dễ đọc cho debug/replay và không đổi
    // giá trị ngầm khi thêm enum case mới. VayBat không dùng enum trong state nên
    // không ảnh hưởng gì tới game hiện có.
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) },
    };
    public static string Serialize<T>(T value) => JsonSerializer.Serialize(value, Options);
    public static T Deserialize<T>(string json) => JsonSerializer.Deserialize<T>(json, Options)!;
    public static JsonElement Element(string json) => JsonSerializer.Deserialize<JsonElement>(json, Options);
}
