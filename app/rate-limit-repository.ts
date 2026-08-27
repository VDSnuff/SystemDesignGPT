import { env } from "cloudflare:workers";

export const rateLimitScopes = {
  chatGlobal: "chat-global",
  chatUser: "chat-user",
  commentsGlobal: "comments-global",
  commentsUser: "comments-user",
} as const;

const consumeSql = `
INSERT INTO api_rate_limits (scope, client_key, window_started_at, request_count)
VALUES (?, ?, ?, 1)
ON CONFLICT (scope, client_key) DO UPDATE SET
  window_started_at = CASE
    WHEN excluded.window_started_at - api_rate_limits.window_started_at >= ? THEN excluded.window_started_at
    ELSE api_rate_limits.window_started_at
  END,
  request_count = CASE
    WHEN excluded.window_started_at - api_rate_limits.window_started_at >= ? THEN 1
    ELSE api_rate_limits.request_count + 1
  END
RETURNING request_count`;

const cleanupSql = "DELETE FROM api_rate_limits WHERE window_started_at < ?";
const retentionMs = 24 * 60 * 60 * 1_000;

async function consume(scope: string, key: string, windowMs: number, now = Date.now()) {
  const database = env.DB;
  if (!database) throw new Error("D1 binding DB is unavailable for rate limiting");
  const row = await database.prepare(consumeSql).bind(scope, key, now, windowMs, windowMs)
    .first<{ request_count: number }>();
  await database.prepare(cleanupSql).bind(now - retentionMs).run();
  if (!row) throw new Error("D1 rate-limit decision was unavailable");
  return row.request_count;
}

export const rateLimitRepository = { consume };
