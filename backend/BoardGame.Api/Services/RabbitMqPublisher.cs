using System.Text;
using RabbitMQ.Client;

namespace BoardGame.Api.Services;

/// <summary>
/// Publishes game events to RabbitMQ fanout exchanges.
/// Kết nối được tạo lazily (lần đầu dùng) và tự reconnect nếu channel bị đóng —
/// tránh crash khi RabbitMQ chưa sẵn sàng lúc backend khởi động.
/// </summary>
public class RabbitMqPublisher : IDisposable
{
    public const string ExchangeName = "boardgame.greetings";
    public const string GamesExchange = "boardgame.games";

    private readonly ConnectionFactory _factory;
    private IConnection? _connection;
    private IModel? _channel;
    private readonly object _lock = new();

    public RabbitMqPublisher(IConfiguration config)
    {
        _factory = new ConnectionFactory
        {
            Uri = new Uri(config.GetConnectionString("RabbitMq")
                          ?? "amqp://guest:guest@localhost:5672/"),
            DispatchConsumersAsync = true,
            // Tắt auto-recovery của thư viện — GetChannel() tự reconnect khi channel đóng.
            // Hai cơ chế cùng tồn tại sẽ race nhau dispose/recreate cùng connection object.
            AutomaticRecoveryEnabled = false,
        };
    }

    private IModel GetChannel()
    {
        // Volatile.Read đảm bảo không đọc torn reference trên ARM/non-x86
        var ch = Volatile.Read(ref _channel);
        if (ch is { IsOpen: true }) return ch;
        lock (_lock)
        {
            if (_channel is { IsOpen: true }) return _channel;
            _channel?.Dispose();
            _connection?.Dispose();
            _connection = _factory.CreateConnection();
            var newCh = _connection.CreateModel();
            newCh.ExchangeDeclare(ExchangeName, ExchangeType.Fanout, durable: true);
            newCh.ExchangeDeclare(GamesExchange, ExchangeType.Fanout, durable: true);
            Volatile.Write(ref _channel, newCh);
            return newCh;
        }
    }

    public void Publish(string message)
    {
        var body = Encoding.UTF8.GetBytes(message);
        GetChannel().BasicPublish(ExchangeName, routingKey: string.Empty, basicProperties: null, body: body);
    }

    public void PublishGameEvent(string jsonPayload)
    {
        var body = Encoding.UTF8.GetBytes(jsonPayload);
        GetChannel().BasicPublish(GamesExchange, routingKey: string.Empty, basicProperties: null, body: body);
    }

    public void Dispose()
    {
        _channel?.Dispose();
        _connection?.Dispose();
        GC.SuppressFinalize(this);
    }
}
