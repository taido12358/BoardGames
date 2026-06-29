namespace BoardGame.Api.Models;

/// <summary>
/// A "hello world" domain entity. It is persisted in PostgreSQL,
/// cached in Redis, indexed in OpenSearch and announced over RabbitMQ.
/// </summary>
public class Greeting
{
    public int Id { get; set; }
    public string Message { get; set; } = "Hello, World!";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
