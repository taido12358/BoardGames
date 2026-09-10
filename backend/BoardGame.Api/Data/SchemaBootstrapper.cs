using Microsoft.EntityFrameworkCore;

namespace BoardGame.Api.Data;

/// <summary>
/// Schema bootstrap idempotent bằng raw SQL — KHÔNG dùng EF Core migration (xem
/// rules/architecture/database.md). Tách khỏi Program.cs (2026-09-11) để backend test
/// (Testcontainers) dùng lại ĐÚNG SQL thật thay vì một bản sao có thể lệch dần theo thời gian —
/// nội dung SQL bên dưới COPY NGUYÊN VẸN từ Program.cs, không sửa bất kỳ ký tự nào lúc tách.
///
/// CẢNH BÁO (bài học 2026-09-05, xem rules/logs/2026-09-05.md — một agent trước đã lỡ chạy
/// DROP TABLE trên DB dev thật lúc thử migration, mất dữ liệu không khôi phục được): khối SQL
/// này có thể chứa DROP COLUMN — chỉ được chạy nhắm đúng database dự định (app thật lúc boot,
/// hoặc container test cách ly hoàn toàn), KHÔNG BAO GIỜ chạy tuỳ tiện nhắm một connection string
/// không chắc chắn trỏ tới đâu.
/// </summary>
public static class SchemaBootstrapper
{
    // Mỗi câu SQL chạy riêng — Npgsql extended protocol không cho phép nhiều lệnh
    // trong một lần gọi, cần tách ra.
    public static readonly string[] Sqls =
[
    """
    CREATE TABLE IF NOT EXISTS "GameRooms" (
        "Id"          uuid PRIMARY KEY,
        "GameKey"     text NOT NULL DEFAULT '',
        "Status"      text NOT NULL,
        "Winner"      text NULL,
        "MapJson"     jsonb NOT NULL DEFAULT '{{}}'::jsonb,
        "StateJson"   jsonb NOT NULL DEFAULT '{{}}'::jsonb,
        "OwnerUserId" uuid NULL,
        "SeatCount"   integer NOT NULL DEFAULT 2,
        "SeatsJson"   jsonb NOT NULL DEFAULT '[]'::jsonb,
        "CreatedAt"   timestamp with time zone NOT NULL,
        "UpdatedAt"   timestamp with time zone NOT NULL DEFAULT now()
    )
    """,
    """ALTER TABLE "GameRooms" ADD COLUMN IF NOT EXISTS "GameKey"   text  NOT NULL DEFAULT ''""",
    """ALTER TABLE "GameRooms" ADD COLUMN IF NOT EXISTS "MapJson"   jsonb NOT NULL DEFAULT '{{}}'::jsonb""",
    """ALTER TABLE "GameRooms" ADD COLUMN IF NOT EXISTS "StateJson" jsonb NOT NULL DEFAULT '{{}}'::jsonb""",
    """ALTER TABLE "GameRooms" ADD COLUMN IF NOT EXISTS "UpdatedAt" timestamp with time zone NOT NULL DEFAULT now()""",
    """ALTER TABLE "GameRooms" ADD COLUMN IF NOT EXISTS "SeatCount" integer NOT NULL DEFAULT 2""",
    """ALTER TABLE "GameRooms" ADD COLUMN IF NOT EXISTS "SeatsJson" jsonb NOT NULL DEFAULT '[]'::jsonb""",
    """ALTER TABLE "GameRooms" ADD COLUMN IF NOT EXISTS "OwnerUserId" uuid NULL""",
    """ALTER TABLE "GameRooms" DROP COLUMN IF EXISTS "MaxRedTurns" """,
    // Hợp nhất mô hình ghế: RedPlayer(Id)/WhitePlayer(Id) (2 người) + SeatUserIdsJson (N người,
    // song song SeatsJson) -> MỘT SeatsJson duy nhất (mảng SeatSlot?, xem Models/SeatSlot.cs)
    // dùng cho MỌI game. Backfill 1 lần cho DB còn cột cũ rồi DROP hẳn — khối DO này chạy lại
    // MỖI LẦN app khởi động (idempotent), nên guard bằng information_schema + EXECUTE động (SQL
    // tĩnh tham chiếu cột đã bị DROP sẽ lỗi "column does not exist" ở các lần chạy sau).
    """
    DO $mig_seats$
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='GameRooms' AND column_name='RedPlayerId') THEN
            EXECUTE 'UPDATE "GameRooms" SET "OwnerUserId" = "RedPlayerId" WHERE "OwnerUserId" IS NULL AND "RedPlayerId" IS NOT NULL';

            EXECUTE 'UPDATE "GameRooms" SET "OwnerUserId" = ("SeatUserIdsJson"->>0)::uuid
                WHERE "OwnerUserId" IS NULL AND jsonb_array_length("SeatUserIdsJson") > 0
                  AND ("SeatUserIdsJson"->>0) IS NOT NULL';

            EXECUTE $sql$
                UPDATE "GameRooms" SET "SeatsJson" = jsonb_build_array(
                    CASE WHEN "RedPlayerId" IS NOT NULL THEN jsonb_build_object(
                        'userId', "RedPlayerId", 'displayName', "RedPlayer", 'connected', true, 'lastSeenAt', "UpdatedAt")
                        ELSE NULL END,
                    CASE WHEN "WhitePlayerId" IS NOT NULL THEN jsonb_build_object(
                        'userId', "WhitePlayerId", 'displayName', "WhitePlayer", 'connected', true, 'lastSeenAt', "UpdatedAt")
                        ELSE NULL END
                )
                WHERE "SeatCount" = 2
            $sql$;

            EXECUTE $sql$
                UPDATE "GameRooms" gr SET "SeatsJson" = sub.new_seats
                FROM (
                    SELECT g."Id",
                        jsonb_agg(
                            CASE WHEN uid.value = 'null'::jsonb THEN NULL
                                 ELSE jsonb_build_object(
                                    'userId', uid.value #>> '{{}}',
                                    'displayName', nm.value #>> '{{}}',
                                    'connected', true,
                                    'lastSeenAt', g."UpdatedAt")
                            END ORDER BY uid.ord
                        ) AS new_seats
                    FROM "GameRooms" g
                    CROSS JOIN LATERAL jsonb_array_elements(g."SeatUserIdsJson") WITH ORDINALITY AS uid(value, ord)
                    CROSS JOIN LATERAL jsonb_array_elements(g."SeatsJson") WITH ORDINALITY AS nm(value, ord2)
                    WHERE g."SeatCount" > 2 AND uid.ord = nm.ord2
                    GROUP BY g."Id"
                ) sub
                WHERE gr."Id" = sub."Id"
            $sql$;
        END IF;
    END
    $mig_seats$
    """,
    """ALTER TABLE "GameRooms" DROP COLUMN IF EXISTS "RedPlayer" """,
    """ALTER TABLE "GameRooms" DROP COLUMN IF EXISTS "WhitePlayer" """,
    """ALTER TABLE "GameRooms" DROP COLUMN IF EXISTS "RedPlayerId" """,
    """ALTER TABLE "GameRooms" DROP COLUMN IF EXISTS "WhitePlayerId" """,
    """ALTER TABLE "GameRooms" DROP COLUMN IF EXISTS "SeatUserIdsJson" """,
    """
    CREATE TABLE IF NOT EXISTS "GameMoves" (
        "Id"         bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
        "RoomId"     uuid NOT NULL,
        "MoveNumber" integer NOT NULL DEFAULT 0,
        "Side"       text NOT NULL DEFAULT '',
        "MoveJson"   jsonb NOT NULL DEFAULT '{{}}'::jsonb,
        "CreatedAt"  timestamp with time zone NOT NULL
    )
    """,
    """ALTER TABLE "GameMoves" DROP COLUMN IF EXISTS "PieceId" """,
    """ALTER TABLE "GameMoves" ADD COLUMN IF NOT EXISTS "MoveJson"   jsonb   NOT NULL DEFAULT '{{}}'::jsonb""",
    """ALTER TABLE "GameMoves" ADD COLUMN IF NOT EXISTS "Side"       text    NOT NULL DEFAULT ''""",
    """ALTER TABLE "GameMoves" ADD COLUMN IF NOT EXISTS "MoveNumber" integer NOT NULL DEFAULT 0""",
    """CREATE INDEX IF NOT EXISTS "IX_GameMoves_RoomId_MoveNumber" ON "GameMoves" ("RoomId", "MoveNumber")""",
    """CREATE UNIQUE INDEX IF NOT EXISTS "UX_GameMoves_RoomId_MoveNumber" ON "GameMoves" ("RoomId", "MoveNumber")""",
    """
    CREATE TABLE IF NOT EXISTS "Users" (
        "Id"          uuid PRIMARY KEY,
        "Email"       text NOT NULL DEFAULT '',
        "DisplayName" text NOT NULL DEFAULT '',
        "CreatedAt"   timestamp with time zone NOT NULL DEFAULT now(),
        "LastLoginAt" timestamp with time zone NULL
    )
    """,
    """CREATE UNIQUE INDEX IF NOT EXISTS "UX_Users_Email" ON "Users" ("Email")""",
    """
    CREATE TABLE IF NOT EXISTS "AuthOtps" (
        "Id"         bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
        "Email"      text NOT NULL DEFAULT '',
        "CodeHash"   text NOT NULL DEFAULT '',
        "ExpiresAt"  timestamp with time zone NOT NULL DEFAULT now(),
        "Attempts"   integer NOT NULL DEFAULT 0,
        "ConsumedAt" timestamp with time zone NULL,
        "CreatedAt"  timestamp with time zone NOT NULL DEFAULT now()
    )
    """,
    """CREATE INDEX IF NOT EXISTS "IX_AuthOtps_Email" ON "AuthOtps" ("Email")""",
    ];

    /// <summary>
    /// Chạy toàn bộ <see cref="Sqls"/> với retry — dùng lúc app khởi động thật (Program.cs, mặc
    /// định 10 lần cách nhau 5s để chờ Postgres sẵn sàng khi cùng khởi động qua Docker Compose)
    /// và trong test fixture Testcontainers (thường 1 lần vì DB test đã sẵn sàng trước khi gọi).
    /// </summary>
    public static async Task ApplyAsync(AppDbContext db, ILogger logger, int maxAttempts = 10, TimeSpan? retryDelay = null)
    {
        var delay = retryDelay ?? TimeSpan.FromSeconds(5);
        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            var errors = new List<string>();
            foreach (var sql in Sqls)
            {
                try { db.Database.ExecuteSqlRaw(sql); }
                catch (Exception ex) { errors.Add(ex.Message.Split('\n')[0]); }
            }

            if (errors.Count == 0)
            {
                logger.LogInformation("Schema bootstrap hoàn tất (lần {Attempt}).", attempt);
                return;
            }

            if (attempt < maxAttempts)
            {
                logger.LogWarning("Schema bootstrap lần {Attempt}: {N} lỗi, thử lại sau {Delay}…\n{Errors}",
                    attempt, errors.Count, delay, string.Join("\n", errors));
                await Task.Delay(delay);
            }
            else
            {
                var msg = $"Schema bootstrap thất bại sau {maxAttempts} lần:\n{string.Join("\n", errors)}";
                logger.LogCritical(msg);
                throw new InvalidOperationException(msg);
            }
        }
    }
}
