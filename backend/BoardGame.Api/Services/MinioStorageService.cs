using System.Text;
using Minio;
using Minio.DataModel.Args;

namespace BoardGame.Api.Services;

/// <summary>
/// Stores replay artifacts for finished games in a MinIO bucket.
/// </summary>
public class MinioStorageService
{
    public const string ReplaysBucket = "replays";

    private readonly IMinioClient _client;

    public MinioStorageService(IConfiguration config)
    {
        var section = config.GetSection("Minio");
        _client = new MinioClient()
            .WithEndpoint(section["Endpoint"] ?? "localhost:9000")
            .WithCredentials(section["AccessKey"] ?? "minioadmin",
                             section["SecretKey"] ?? "minioadmin")
            .WithSSL(false)
            .Build();
    }

    /// <summary>Lưu artifact replay (JSON) của một ván vào bucket replays.</summary>
    public Task SaveReplayAsync(string objectName, string json)
        => SaveAsync(ReplaysBucket, objectName, json, "application/json");

    /// <summary>Đọc lại replay JSON đã lưu — trả null nếu chưa từng lưu (ván chưa kết thúc, hoặc
    /// object không tồn tại) HOẶC không đọc được (MinIO không kết nối được). Trước 2026-09-11,
    /// <see cref="MinioStorageService"/> chỉ ghi, chưa từng có cách đọc lại — xem
    /// <c>GamesController.Replay</c>.</summary>
    public async Task<string?> GetReplayAsync(string objectName)
    {
        try
        {
            using var stream = new MemoryStream();
            await _client.GetObjectAsync(new GetObjectArgs()
                .WithBucket(ReplaysBucket)
                .WithObject(objectName)
                .WithCallbackStream(s => s.CopyTo(stream)));
            // Phát hiện thật (2026-09-11, xem rules/coding/testing.md): khi không kết nối được
            // MinIO, GetObjectAsync đôi khi hoàn tất "thành công" (không throw) nhưng
            // WithCallbackStream không bao giờ được gọi — stream rỗng thay vì có lỗi rõ ràng.
            // Một replay thật KHÔNG BAO GIỜ rỗng (tối thiểu vài trăm byte JSON) nên coi 0 byte là
            // "không đọc được" — nếu không, GameJson.Element("") ở tầng gọi sẽ ném JsonException
            // không bắt được, lộ 500 thay vì 503/404 như thiết kế.
            if (stream.Length == 0) return null;
            return Encoding.UTF8.GetString(stream.ToArray());
        }
        catch (Minio.Exceptions.ObjectNotFoundException)
        {
            return null;
        }
        catch (Minio.Exceptions.BucketNotFoundException)
        {
            return null;
        }
    }

    private async Task SaveAsync(string bucket, string objectName, string content, string contentType)
    {
        var found = await _client.BucketExistsAsync(
            new BucketExistsArgs().WithBucket(bucket));
        if (!found)
        {
            await _client.MakeBucketAsync(new MakeBucketArgs().WithBucket(bucket));
        }

        var bytes = Encoding.UTF8.GetBytes(content);
        using var stream = new MemoryStream(bytes);
        await _client.PutObjectAsync(new PutObjectArgs()
            .WithBucket(bucket)
            .WithObject(objectName)
            .WithStreamData(stream)
            .WithObjectSize(bytes.Length)
            .WithContentType(contentType));
    }
}
