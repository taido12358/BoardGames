using System.Text;
using RabbitMQ.Client;

namespace BoardGame.Api.Services;

/// <summary>
/// Publishes greeting events to a RabbitMQ fanout exchange.
/// </summary>
public class RabbitMqPublisher : IDisposable
{
    public const string ExchangeName = "boardgame.greetings";

    private readonly IConnection _connection;
    private readonly IModel _channel;

    public RabbitMqPublisher(IConfiguration config)
    {
        var factory = new ConnectionFactory
        {
            Uri = new Uri(config.GetConnectionString("RabbitMq")
                          ?? "amqp://guest:guest@localhost:5672/"),
            DispatchConsumersAsync = true
        };

        _connection = factory.CreateConnection();
        _channel = _connection.CreateModel();
        _channel.ExchangeDeclare(ExchangeName, ExchangeType.Fanout, durable: true);
    }

    public void Publish(string message)
    {
        var body = Encoding.UTF8.GetBytes(message);
        _channel.BasicPublish(ExchangeName, routingKey: string.Empty, basicProperties: null, body: body);
    }

    public void Dispose()
    {
        _channel?.Dispose();
        _connection?.Dispose();
        GC.SuppressFinalize(this);
    }
}
