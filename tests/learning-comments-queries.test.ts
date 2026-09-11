import { readFileSync } from "node:fs";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { learningComments } from "../db/schema";
import journal from "../drizzle/meta/_journal.json";

interface ExecutedQuery {
  readonly params: readonly unknown[];
  readonly sql: string;
}

type SqlParameter = null | number | bigint | string | Uint8Array;

const { database, executed } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite");
  return { database: new DatabaseSync(":memory:"), executed: [] as ExecutedQuery[] };
});

vi.mock("../app/rate-limit-repository", () => ({
  rateLimitRepository: { consume: vi.fn().mockResolvedValue(1) },
  rateLimitScopes: { commentsGlobal: "comments-global", commentsUser: "comments-user" },
}));
vi.mock("../db", () => {
  const db = drizzle(async (sql, params, method) => {
    executed.push({ sql, params });
    const statement = database.prepare(sql);
    if (method === "run") {
      statement.run(...params as SqlParameter[]);
      return { rows: [] };
    }
    const rows = statement.all(...params as SqlParameter[]).map((row) => Object.values(row));
    return { rows: method === "get" ? rows[0] : rows };
  });
  return { getDb: () => db };
});

import { GET, PATCH, POST } from "../app/api/learning-comments/route";

const ownerHeaders = {
  "Content-Type": "application/json",
  origin: "http://localhost",
  "oai-authenticated-user-email": "owner@example.com",
  "oai-authenticated-user-id": "owner",
};
const timestamps = ["2026-09-03T09:00:00.000Z", "2026-09-02T09:00:00.000Z", "2026-09-01T09:00:00.000Z"];
const collidingRows = 250;

function commentRow(index: number) {
  // Timestamps repeat across page boundaries, and ids are random, so ordering cannot rely on insertion.
  const createdAt = index < 50 ? timestamps[0] : index < 150 ? timestamps[1] : timestamps[2];
  return {
    id: crypto.randomUUID(), userId: `learner-${index % 7}`, userEmail: "learner@example.test",
    pageSlug: "introduction", pageTitle: "Introduction", body: `Comment ${index}`, status: "new" as const, createdAt,
  };
}

async function readPage(before?: string) {
  const search = before ? `?before=${encodeURIComponent(before)}` : "";
  const response = await GET(new Request(`http://localhost/api/learning-comments${search}`, { headers: ownerHeaders }));
  expect(response.status).toBe(200);
  return await response.json() as { comments: { id: string; createdAt: string }[]; nextCursor?: string };
}

function queryPlan(query: ExecutedQuery) {
  const rows = database.prepare(`EXPLAIN QUERY PLAN ${query.sql}`).all(...query.params as SqlParameter[]);
  return rows.map((row) => String(row.detail)).join("\n");
}

function lastExecuted(pattern: RegExp) {
  const query = executed.findLast(({ sql }) => pattern.test(sql));
  if (!query) throw new Error(`No executed query matched ${pattern}`);
  return query;
}

let seeded: ReturnType<typeof commentRow>[] = [];

beforeAll(async () => {
  vi.stubEnv("SITE_OWNER_EMAIL", "owner@example.com");
  for (const { tag } of journal.entries) database.exec(readFileSync(`drizzle/${tag}.sql`, "utf8"));
  const { getDb } = await import("../db");
  seeded = Array.from({ length: collidingRows }, (_, index) => commentRow(index));
  await getDb().insert(learningComments).values(seeded);
});

afterAll(() => {
  vi.unstubAllEnvs();
  database.close();
});

describe("learning comment queries against SQLite", () => {
  it("pages every comment exactly once when created_at collides on the boundary", async () => {
    const seen: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await readPage(cursor);
      seen.push(...page.comments.map(({ id }) => id));
      cursor = page.nextCursor;
    } while (cursor);

    expect(seen).toHaveLength(collidingRows);
    expect(new Set(seen).size).toBe(collidingRows);
    expect(seen.toSorted()).toEqual(seeded.map(({ id }) => id).toSorted());
  });

  it("uses the created_at index for pagination and retention", () => {
    expect(queryPlan(lastExecuted(/^select .* order by/i))).toContain("learning_comments_created_id_idx");
    expect(queryPlan(lastExecuted(/^delete from "learning_comments"/i))).toContain("learning_comments_created_id_idx");
  });

  it("uses the user index for the per-user retained count", async () => {
    const response = await POST(new Request("http://localhost/api/learning-comments", {
      method: "POST", headers: ownerHeaders, body: JSON.stringify({ pageSlug: "introduction", body: "Indexed" }),
    }));

    expect(response.status).toBe(201);
    expect(queryPlan(lastExecuted(/^select count\(\*\)/i))).toContain("learning_comments_user_idx");
  });

  it("only reports an update when a record changed", async () => {
    const target = seeded[0];
    const patch = (id: string) => PATCH(new Request("http://localhost/api/learning-comments", {
      method: "PATCH", headers: ownerHeaders, body: JSON.stringify({ id, status: "read" }),
    }));

    const changed = await patch(target.id);
    const missing = await patch(crypto.randomUUID());

    expect(changed.status).toBe(200);
    expect(missing.status).toBe(404);
    expect(database.prepare("SELECT status FROM learning_comments WHERE id = ?").get(target.id)?.status).toBe("read");
  });
});
