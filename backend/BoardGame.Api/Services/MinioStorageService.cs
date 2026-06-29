using System.Text;
using Minio;
using Minio.DataModel.Args;

namespace BoardGame.Api.Services;

/// <summary>
/// Stores a small text artifact for each greeting in a MinIO bucket.
/// </summary>
public class MinioStorageService
{
    public const string BucketName = "greetings";
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

    public Task SaveAsync(string objectName, string content)
        => SaveAsync(BucketName, objectName, content, "text/plain");

    /// <summary>Lưu artifact replay (JSON) của một ván vào bucket replays.</summary>
    public Task SaveReplayAsync(string objectName, string json)
        => SaveAsync(ReplaysBucket, objectName, json, "application/json");

    public async Task SaveAsync(string bucket, string objectName, string content, string contentType)
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
