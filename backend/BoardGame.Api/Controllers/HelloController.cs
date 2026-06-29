using BoardGame.Api.Data;
using BoardGame.Api.Hubs;
using BoardGame.Api.Models;
using BoardGame.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace BoardGame.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HelloController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly RedisCacheService _cache;
    private readonly RabbitMqPublisher _queue;
    private readonly OpenSearchService _search;
    private readonly MinioStorageService _storage;
    private readonly IHubContext<GameHub> _hub;

    public HelloController(
        AppDbContext db,
        RedisCacheService cache,
        RabbitMqPublisher queue,
        OpenSearchService search,
        MinioStorageService storage,
        IHubContext<GameHub> hub)
    {
        _db = db;
        _cache = cache;
        _queue = queue;
        _search = search;
        _storage = storage;
        _hub = hub;
    }

    /// <summary>Returns the latest greeting, served from Redis when warm.</summary>
    [HttpGet]
    public async Task<ActionResult<object>> Get()
    {
        var cached = await _cache.GetAsync("latest-greeting");
        if (cached is not null)
        {
            return Ok(new { message = cached, source = "redis" });
        }

        var latest = await _db.Greetings
            .OrderByDescending(g => g.CreatedAt)
            .FirstOrDefaultAsync();

        return Ok(new { message = latest?.Message ?? "Hello, World!", source = "postgres" });
    }

    /// <summary>
    /// Creates a greeting and fans it out across the whole stack:
    /// PostgreSQL → Redis → RabbitMQ → OpenSearch → MinIO → SignalR.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<Greeting>> Create([FromBody] CreateGreetingRequest request)
    {
        var greeting = new Greeting
        {
            Message = string.IsNullOrWhiteSpace(request.Message) ? "Hello, World!" : request.Message
        };

        // 1. Persist (PostgreSQL)
        _db.Greetings.Add(greeting);
        await _db.SaveChangesAsync();

        // 2. Cache (Redis)
        await _cache.SetAsync("latest-greeting", greeting.Message);

        // 3. Announce (RabbitMQ)
        _queue.Publish(greeting.Message);

        // 4. Index (OpenSearch)
        await _search.IndexAsync(greeting);

        // 5. Store an artifact (MinIO)
        await _storage.SaveAsync($"greeting-{greeting.Id}.txt", greeting.Message);

        // 6. Push to clients (SignalR)
        await _hub.Clients.All.SendAsync("GreetingCreated", greeting.Message);

        return CreatedAtAction(nameof(Get), new { id = greeting.Id }, greeting);
    }

    /// <summary>Full-text search over greetings (OpenSearch).</summary>
    [HttpGet("search")]
    public async Task<ActionResult<IEnumerable<Greeting>>> Search([FromQuery] string q)
    {
        var results = await _search.SearchAsync(q);
        return Ok(results);
    }
}

public record CreateGreetingRequest(string? Message);
