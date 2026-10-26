using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using Microsoft.Extensions.Configuration;

namespace BoardGame.Api.Tests.Platform;

/// <summary>Owns a real API process on loopback; crash/restart tests cannot pass using in-process state.</summary>
internal sealed class KestrelTestHost(string postgres, IConfiguration config) : IAsyncDisposable
{
    private Process? _process;
    private Task<string>? _stderr;
    private Task<string>? _stdout;
    public Uri BaseAddress { get; private set; } = null!;
    public Uri HubAddress => new UriBuilder(BaseAddress) { Scheme = "ws", Path = "/hubs/game" }.Uri;
    public int ProcessId => _process?.Id ?? throw new InvalidOperationException("Host is not running.");

    public async Task StartAsync()
    {
        if (_process is not null) throw new InvalidOperationException("Stop the owned process before starting another.");
        var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        var port = ((IPEndPoint)listener.LocalEndpoint).Port;
        listener.Stop();
        BaseAddress = new Uri($"http://127.0.0.1:{port}");
        var assembly = typeof(Program).Assembly.Location;
        var start = new ProcessStartInfo("dotnet")
        {
            UseShellExecute = false, CreateNoWindow = true,
            WorkingDirectory = Path.GetDirectoryName(assembly)!,
            RedirectStandardOutput = true, RedirectStandardError = true,
        };
        start.ArgumentList.Add(assembly);
        start.ArgumentList.Add("--urls"); start.ArgumentList.Add(BaseAddress.ToString());
        start.Environment["ASPNETCORE_ENVIRONMENT"] = "Development";
        start.Environment["EMAIL_PROVIDER"] = "";
        start.Environment["Auth__DevLogOtp"] = "false"; // No OTP is requested from the child host.
        start.Environment["JWT_SECRET"] = config["JWT_SECRET"] is { Length: > 0 } secret ? secret : config["Jwt:Secret"];
        start.Environment["ConnectionStrings__Postgres"] = postgres;
        start.Environment["ConnectionStrings__Redis"] = "127.0.0.1:1,connectTimeout=50,syncTimeout=100,asyncTimeout=100,abortConnect=false";
        start.Environment["ConnectionStrings__RabbitMq"] = "amqp://guest:guest@127.0.0.1:1/";
        start.Environment["ConnectionStrings__OpenSearch"] = "http://127.0.0.1:1";
        start.Environment["Minio__Endpoint"] = "127.0.0.1:1";
        start.Environment["Logging__LogLevel__Default"] = "Warning";
        start.Environment["Logging__LogLevel__Microsoft.EntityFrameworkCore.Database.Command"] = "Warning";
        start.Environment["Logging__EventLog__LogLevel__Default"] = "None";
        _process = Process.Start(start) ?? throw new InvalidOperationException("Could not start owned Kestrel host.");
        _stderr = _process.StandardError.ReadToEndAsync();
        _stdout = _process.StandardOutput.ReadToEndAsync(); // Drain both pipes to prevent blocked child output.
        using var client = new HttpClient { BaseAddress = BaseAddress, Timeout = TimeSpan.FromSeconds(1) };
        var deadline = DateTime.UtcNow.AddSeconds(30);
        while (DateTime.UtcNow < deadline)
        {
            if (_process.HasExited) throw new InvalidOperationException($"Owned Kestrel exited {_process.ExitCode}: {await _stderr}");
            try { using var response = await client.GetAsync("/"); return; }
            catch (HttpRequestException) { }
            catch (TaskCanceledException) { }
            await Task.Delay(100);
        }
        throw new TimeoutException("Owned Kestrel did not become ready within 30 seconds.");
    }

    public async Task CrashAsync()
    {
        if (_process is null) return;
        if (!_process.HasExited) _process.Kill(entireProcessTree: true);
        await _process.WaitForExitAsync();
        if (_stdout is not null) await _stdout;
        if (_stderr is not null) await _stderr;
        _process.Dispose(); _process = null;
    }

    public async ValueTask DisposeAsync() => await CrashAsync();
}
