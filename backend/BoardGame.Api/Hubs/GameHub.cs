using Microsoft.AspNetCore.SignalR;

namespace BoardGame.Api.Hubs;

/// <summary>
/// SignalR hub. The backend pushes "GreetingCreated" events to every
/// connected client whenever a new greeting is saved.
/// </summary>
public class GameHub : Hub
{
    public async Task SendHello(string message)
    {
        await Clients.All.SendAsync("GreetingCreated", message);
    }
}
