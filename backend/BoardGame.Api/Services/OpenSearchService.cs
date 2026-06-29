using BoardGame.Api.Models;
using OpenSearch.Client;

namespace BoardGame.Api.Services;

/// <summary>
/// Indexes greetings into OpenSearch and exposes a simple full-text search.
/// </summary>
public class OpenSearchService
{
    public const string IndexName = "greetings";

    private readonly IOpenSearchClient _client;

    public OpenSearchService(IConfiguration config)
    {
        var uri = new Uri(config.GetConnectionString("OpenSearch")
                          ?? "http://localhost:9200");
        var settings = new ConnectionSettings(uri).DefaultIndex(IndexName);
        _client = new OpenSearchClient(settings);
    }

    public Task IndexAsync(Greeting greeting)
        => _client.IndexDocumentAsync(greeting);

    public async Task<IReadOnlyCollection<Greeting>> SearchAsync(string term)
    {
        var response = await _client.SearchAsync<Greeting>(s => s
            .Query(q => q.Match(m => m.Field(f => f.Message).Query(term))));
        return response.Documents;
    }
}
