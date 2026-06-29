using System.Text.Json;

namespace BoardGame.Api.Platform;

/// <summary>Cấu hình JSON dùng chung (camelCase + không phân biệt hoa thường).</summary>
public static class GameJson
{
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web);
    public static string Serialize<T>(T value) => JsonSerializer.Serialize(value, Options);
    public static T Deserialize<T>(string json) => JsonSerializer.Deserialize<T>(json, Options)!;
    public static JsonElement Element(string json) => JsonSerializer.Deserialize<JsonElement>(json, Options);
}
