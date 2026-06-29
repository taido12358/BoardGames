namespace BoardGame.Api.Platform.Abstractions;

/// <summary>
/// Sổ đăng ký engine: tra cứu IGameEngine theo Key. Tất cả engine được DI
/// inject vào đây, nên thêm game mới chỉ cần đăng ký 1 dòng ở Program.cs.
/// </summary>
public class GameEngineRegistry
{
    private readonly Dictionary<string, IGameEngine> _engines;

    public GameEngineRegistry(IEnumerable<IGameEngine> engines)
        => _engines = engines.ToDictionary(e => e.Key, StringComparer.OrdinalIgnoreCase);

    public IGameEngine Get(string key)
        => _engines.TryGetValue(key, out var e)
            ? e
            : throw new KeyNotFoundException($"Chưa đăng ký game '{key}'");

    public bool Has(string key) => _engines.ContainsKey(key);

    public IReadOnlyCollection<IGameEngine> All => _engines.Values;
}
