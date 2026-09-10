using BoardGame.Api.Platform.Models;
using OpenSearch.Client;

namespace BoardGame.Api.Services;

/// <summary>
/// Indexes finished games into OpenSearch and exposes a simple full-text search over history.
/// </summary>
public class OpenSearchService
{
    public const string GamesIndex = "games";

    private readonly IOpenSearchClient _client;

    public OpenSearchService(IConfiguration config)
    {
        var uri = new Uri(config.GetConnectionString("OpenSearch")
                          ?? "http://localhost:9200");
        var settings = new ConnectionSettings(uri).DefaultIndex(GamesIndex);
        _client = new OpenSearchClient(settings);
    }

    public Task IndexGameAsync(GameRecord record)
        => _client.IndexAsync(record, i => i.Index(GamesIndex).Id(record.Id));

    public async Task<IReadOnlyCollection<GameRecord>> SearchGamesAsync(string term)
    {
        var response = await _client.SearchAsync<GameRecord>(s => s
            .Index(GamesIndex)
            .Query(q => string.IsNullOrWhiteSpace(term)
                ? q.MatchAll()
                : q.MultiMatch(m => m
                    .Fields(f => f
                        .Field(x => x.Winner)
                        .Field(x => x.Players)
                        .Field(x => x.Status))
                    .Query(term))));
        return response.Documents;
    }
}
