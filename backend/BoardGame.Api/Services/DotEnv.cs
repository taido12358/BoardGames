namespace BoardGame.Api.Services;

/// <summary>
/// Nạp file .env ở root repo vào biến môi trường khi chạy `dotnet run` local
/// (docker compose tự đọc .env, không cần loader này — trong container không có file .env).
/// Biến môi trường đã tồn tại luôn thắng giá trị trong file.
/// </summary>
public static class DotEnv
{
    public static void Load()
    {
        // Tìm .env từ thư mục hiện tại đi ngược lên (dotnet run có thể chạy từ root repo,
        // thư mục project, hoặc bin/Debug/net8.0 tuỳ cách gọi — cần đủ sâu để về tới root).
        var dir = new DirectoryInfo(Directory.GetCurrentDirectory());
        for (var depth = 0; depth < 8 && dir is not null; depth++, dir = dir.Parent)
        {
            var file = Path.Combine(dir.FullName, ".env");
            if (!File.Exists(file)) continue;

            foreach (var raw in File.ReadAllLines(file))
            {
                var line = raw.Trim();
                if (line.Length == 0 || line.StartsWith('#')) continue;

                var eq = line.IndexOf('=');
                if (eq <= 0) continue;

                var key = line[..eq].Trim();
                var value = line[(eq + 1)..].Trim().Trim('"');
                if (Environment.GetEnvironmentVariable(key) is null)
                    Environment.SetEnvironmentVariable(key, value);
            }
            return;
        }
    }
}
