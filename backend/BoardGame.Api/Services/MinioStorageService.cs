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

    public async Task SaveAsync(string objectName, string content)
    {
        var found = await _client.BucketExistsAsync(
            new BucketExistsArgs().WithBucket(BucketName));
        if (!found)
        {
            await _client.MakeBucketAsync(new MakeBucketArgs().WithBucket(BucketName));
        }

        var bytes = Encoding.UTF8.GetBytes(content);
        using var stream = new MemoryStream(bytes);
        await _client.PutObjectAsync(new PutObjectArgs()
            .WithBucket(BucketName)
            .WithObject(objectName)
            .WithStreamData(stream)
            .WithObjectSize(bytes.Length)
            .WithContentType("text/plain"));
    }
}
