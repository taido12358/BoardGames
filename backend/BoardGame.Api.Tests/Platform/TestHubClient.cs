using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using BoardGame.Api.Platform;
using Microsoft.AspNetCore.TestHost;

namespace BoardGame.Api.Tests.Platform;

/// <summary>Real WebSocket/SignalR JSON transport for TestServer; no production debug endpoint or extra SDK.</summary>
internal sealed class TestHubClient : IAsyncDisposable
{
    private readonly WebSocket _socket;
    private readonly Queue<JsonElement> _frames = new();
    private string _pending = "";
    private int _invocation;
    private bool _disposed;
    public JsonElement? Room { get; private set; }
    public string? Side { get; private set; }
    public List<string> Errors { get; } = [];
    public List<(string Target, JsonElement Payload)> Events { get; } = [];

    private TestHubClient(WebSocket socket) => _socket = socket;

    public static async Task<TestHubClient> ConnectAsync(TestServer server, string token)
    {
        var client = server.CreateWebSocketClient();
        client.ConfigureRequest = request => request.Headers["Authorization"] = $"Bearer {token}";
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(15));
        var socket = await client.ConnectAsync(new Uri("ws://localhost/hubs/game"), timeout.Token);
        return await HandshakeAsync(socket, timeout.Token);
    }

    public static async Task<TestHubClient> ConnectAsync(Uri uri, string token)
    {
        var socket = new ClientWebSocket();
        socket.Options.SetRequestHeader("Authorization", $"Bearer {token}");
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(15));
        await socket.ConnectAsync(uri, timeout.Token);
        return await HandshakeAsync(socket, timeout.Token);
    }

    private static async Task<TestHubClient> HandshakeAsync(WebSocket socket, CancellationToken ct)
    {
        var hub = new TestHubClient(socket);
        await hub.SendAsync(new { protocol = "json", version = 1 }, ct);
        var handshake = await hub.ReadAsync(ct);
        if (handshake.TryGetProperty("error", out var error)) throw new InvalidOperationException(error.GetString());
        return hub;
    }

    public void Abort() => _socket.Abort();

    public async Task InvokeAsync(string target, params object[] arguments)
    {
        var invocationId = (++_invocation).ToString();
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(15));
        await SendAsync(new { type = 1, invocationId, target, arguments }, timeout.Token);
        while (true)
        {
            var frame = await ReadAsync(timeout.Token);
            if (frame.TryGetProperty("type", out var type) && type.GetInt32() == 3
                && frame.GetProperty("invocationId").GetString() == invocationId)
            {
                if (frame.TryGetProperty("error", out var error)) throw new InvalidOperationException(error.GetString());
                return;
            }
        }
    }

    public async Task<JsonElement> WaitForRoomAsync(Func<JsonElement, bool> predicate)
    {
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(15));
        while (true)
        {
            if (Room is JsonElement room && predicate(room)) return room;
            await ReadAsync(timeout.Token);
        }
    }

    public async Task<JsonElement> WaitForEventAsync(string target, Func<JsonElement, bool> predicate)
    {
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(15));
        while (true)
        {
            foreach (var entry in Events)
                if (entry.Target == target && predicate(entry.Payload)) return entry.Payload;
            await ReadAsync(timeout.Token);
        }
    }

    private Task SendAsync(object value, CancellationToken ct)
        => _socket.SendAsync(new ArraySegment<byte>(Encoding.UTF8.GetBytes(GameJson.Serialize(value) + '\u001e')),
            WebSocketMessageType.Text, true, ct);

    private async Task<JsonElement> ReadAsync(CancellationToken ct)
    {
        while (_frames.Count == 0)
        {
            using var message = new MemoryStream();
            var bytes = new byte[8192];
            WebSocketReceiveResult result;
            do
            {
                result = await _socket.ReceiveAsync(new ArraySegment<byte>(bytes), ct);
                if (result.MessageType == WebSocketMessageType.Close) throw new InvalidOperationException("SignalR closed before expected state.");
                message.Write(bytes, 0, result.Count);
            } while (!result.EndOfMessage);
            _pending += Encoding.UTF8.GetString(message.ToArray());
            int end;
            while ((end = _pending.IndexOf('\u001e')) >= 0)
            {
                var json = _pending[..end];
                _pending = _pending[(end + 1)..];
                if (json.Length > 0) _frames.Enqueue(GameJson.Element(json));
            }
        }
        var frame = _frames.Dequeue();
        if (frame.TryGetProperty("type", out var type) && type.GetInt32() == 1)
        {
            var argument = frame.GetProperty("arguments")[0];
            Events.Add((frame.GetProperty("target").GetString()!, argument));
            switch (frame.GetProperty("target").GetString())
            {
                case "GameStateUpdated": Room = argument; break;
                case "Seated": Side = argument.GetProperty("side").GetString(); break;
                case "Error": Errors.Add(argument.GetString() ?? "Unknown hub error"); break;
            }
        }
        return frame;
    }

    public async ValueTask DisposeAsync()
    {
        if (_disposed) return;
        _disposed = true;
        if (_socket.State is WebSocketState.Open or WebSocketState.CloseReceived)
        {
            using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(5));
            await _socket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Test finished", timeout.Token);
        }
        _socket.Dispose();
    }
}
