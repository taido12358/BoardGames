using StackExchange.Redis;

namespace BoardGame.Api.Services;

/// <summary>
/// Thin Redis wrapper used to cache the most recent greeting.
/// </summary>
public class RedisCacheService
{
    private readonly IDatabase _db;

    public RedisCacheService(IConnectionMultiplexer redis)
    {
        _db = redis.GetDatabase();
    }

    public Task SetAsync(string key, string value, TimeSpan? ttl = null)
        => _db.StringSetAsync(key, value, ttl ?? TimeSpan.FromMinutes(10));

    public async Task<string?> GetAsync(string key)
    {
        var value = await _db.StringGetAsync(key);
        return value.HasValue ? value.ToString() : null;
    }
}
