import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { consumeMock, getDbMock } = vi.hoisted(() => ({ consumeMock: vi.fn(), getDbMock: vi.fn() }));
vi.mock("../db", () => ({ getDb: getDbMock }));
vi.mock("../app/rate-limit-repository", () => ({
  rateLimitRepository: { consume: consumeMock },
  rateLimitScopes: { commentsGlobal: "comments-global", commentsUser: "comments-user" },
}));

import { DELETE, GET, PATCH, POST } from "../app/api/learning-comments/route";

const commentId = "a4fe79cb-785a-43ef-a7f6-5516cd2af83e";

interface RequestOptions {
  readonly body?: unknown;
  readonly email?: string;
  readonly method: "DELETE" | "GET" | "PATCH" | "POST";
  readonly origin?: string;
  readonly search?: string;
  readonly userId?: string;
}

function ownerRequest(method: RequestOptions["method"], extra: Partial<RequestOptions> = {}) {
  return request({ method, origin: "http://localhost", userId: "owner", email: "owner@example.com", ...extra });
}

function readableDb(rows: unknown[], where = vi.fn()) {
  const limit = vi.fn().mockResolvedValue(rows);
  where.mockReturnValue({ orderBy: () => ({ limit }) });
  return { db: { delete: () => ({ where: vi.fn().mockResolvedValue(undefined) }), select: () => ({ from: () => ({ where }) }) }, limit };
}

function pageOf(size: number, createdAt: string) {
  return Array.from({ length: size }, (_, index) => ({ id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`, createdAt }));
}

function request(options: RequestOptions) {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (options.userId) headers.set("oai-authenticated-user-id", options.userId);
  if (options.email) headers.set("oai-authenticated-user-email", options.email);
  if (options.origin) headers.set("origin", options.origin);
  return new Request(`http://localhost/api/learning-comments${options.search ?? ""}`, {
    method: options.method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

beforeEach(() => {
  consumeMock.mockResolvedValue(1);
});

afterEach(() => {
  consumeMock.mockReset();
  getDbMock.mockReset();
  vi.unstubAllEnvs();
});

describe("learning comment authorization contract", () => {
  it("requires authentication and owner access before reading comments", async () => {
    vi.stubEnv("SITE_OWNER_EMAIL", "owner@example.com");
    const signedOut = await GET(request({ method: "GET" }));
    const nonOwner = await GET(request({ method: "GET", userId: "reader", email: "reader@example.com" }));

    expect(signedOut.status).toBe(401);
    expect(nonOwner.status).toBe(403);
    expect(getDbMock).not.toHaveBeenCalled();
  });

  it("allows the configured owner to read comments", async () => {
    vi.stubEnv("SITE_OWNER_EMAIL", "owner@example.com");
    const where = vi.fn();
    const { db, limit } = readableDb([], where);
    getDbMock.mockReturnValue(db);

    const response = await GET(request({ method: "GET", userId: "owner", email: "OWNER@example.com" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ comments: [] });
    expect(where).toHaveBeenCalledWith(undefined);
    expect(limit).toHaveBeenCalledWith(100);
  });

  it("returns a composite cursor only for a full page and resumes from it", async () => {
    vi.stubEnv("SITE_OWNER_EMAIL", "owner@example.com");
    const fullPage = pageOf(100, "2026-09-01T12:00:00.000Z");
    const where = vi.fn();
    getDbMock.mockReturnValue(readableDb(fullPage, where).db);
    const first = await (await GET(ownerRequest("GET"))).json() as { nextCursor?: string };
    expect(first.nextCursor).toBe(`2026-09-01T12:00:00.000Z|${fullPage.at(-1)?.id}`);

    getDbMock.mockReturnValue(readableDb(pageOf(3, "2026-09-01T12:00:00.000Z"), where).db);
    const response = await GET(ownerRequest("GET", { search: `?before=${encodeURIComponent(first.nextCursor ?? "")}` }));
    const second = await response.json() as { comments: unknown[]; nextCursor?: string };

    expect(response.status).toBe(200);
    expect(second.comments).toHaveLength(3);
    expect(second.nextCursor).toBeUndefined();
    expect(where).toHaveBeenLastCalledWith(expect.objectContaining({ queryChunks: expect.any(Array) }));
  });

  it("rejects a cursor that lacks the record id before touching the database", async () => {
    vi.stubEnv("SITE_OWNER_EMAIL", "owner@example.com");
    for (const before of ["2026-09-01T12:00:00.000Z", "not-a-date|" + commentId, `2026-09-01T12:00:00.000Z|nope`]) {
      const response = await GET(ownerRequest("GET", { search: `?before=${encodeURIComponent(before)}` }));
      expect(response.status).toBe(400);
    }
    expect(getDbMock).not.toHaveBeenCalled();
  });

  it("rejects cross-origin writes before authentication or database access", async () => {
    const response = await POST(request({
      method: "POST",
      origin: "https://attacker.example",
      body: { pageSlug: "introduction", body: "Injected" },
    }));

    expect(response.status).toBe(403);
    expect(getDbMock).not.toHaveBeenCalled();
  });

  it("validates comment input before database access", async () => {
    const where = vi.fn().mockResolvedValue([{ value: 0 }]);
    getDbMock.mockReturnValue({
      delete: () => ({ where: vi.fn().mockResolvedValue(undefined) }),
      select: () => ({ from: () => ({ where }) }),
    });
    const response = await POST(request({
      method: "POST",
      origin: "http://localhost",
      userId: "reader",
      email: "reader@example.com",
      body: { pageSlug: "introduction", body: "" },
    }));

    expect(response.status).toBe(400);
  });

  it("accepts a valid same-origin comment without a hosted database", async () => {
    const values = vi.fn().mockResolvedValue(undefined);
    getDbMock.mockReturnValue({
      delete: () => ({ where: vi.fn().mockResolvedValue(undefined) }),
      insert: () => ({ values }),
      select: () => ({ from: () => ({ where: vi.fn().mockResolvedValue([{ value: 0 }]) }) }),
    });

    const response = await POST(request({
      method: "POST",
      origin: "http://localhost",
      userId: "reader",
      email: "reader@example.com",
      body: { pageSlug: "introduction", body: "Clarify this section." },
    }));

    expect(response.status).toBe(201);
    expect(values).toHaveBeenCalledWith(expect.objectContaining({
      userId: "reader",
      pageSlug: "introduction",
      body: "Clarify this section.",
      status: "new",
    }));
  });

  it("requires owner access before changing a comment status", async () => {
    vi.stubEnv("SITE_OWNER_EMAIL", "owner@example.com");
    const response = await PATCH(request({
      method: "PATCH",
      origin: "http://localhost",
      userId: "reader",
      email: "reader@example.com",
      body: { id: commentId, status: "read" },
    }));

    expect(response.status).toBe(403);
    expect(getDbMock).not.toHaveBeenCalled();
  });

  it("reports whether a status update changed a record", async () => {
    vi.stubEnv("SITE_OWNER_EMAIL", "owner@example.com");
    const returning = vi.fn().mockResolvedValueOnce([{ id: commentId }]).mockResolvedValueOnce([]);
    getDbMock.mockReturnValue({ update: () => ({ set: () => ({ where: () => ({ returning }) }) }) });
    const body = { id: commentId, status: "read" };

    const changed = await PATCH(ownerRequest("PATCH", { body }));
    const missing = await PATCH(ownerRequest("PATCH", { body }));

    expect(changed.status).toBe(200);
    expect(await changed.json()).toEqual({ updated: true });
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ updated: false, message: "That comment no longer exists." });
  });

  it("enforces the durable comment quota before database writes", async () => {
    consumeMock.mockResolvedValue(6);

    const response = await POST(request({
      method: "POST",
      origin: "http://localhost",
      userId: "reader",
      email: "reader@example.com",
      body: { pageSlug: "introduction", body: "Flood" },
    }));

    expect(response.status).toBe(429);
    expect(consumeMock).toHaveBeenCalledTimes(1);
    expect(consumeMock).toHaveBeenCalledWith("comments-user", "reader", 86_400_000);
    expect(getDbMock).not.toHaveBeenCalled();
  });

  it("lets a learner delete only through the authenticated deletion path", async () => {
    const returning = vi.fn().mockResolvedValue([{ id: commentId }]);
    getDbMock.mockReturnValue({ delete: () => ({ where: () => ({ returning }) }) });

    const response = await DELETE(request({
      method: "DELETE",
      origin: "http://localhost",
      userId: "reader",
      email: "reader@example.com",
      body: { id: commentId },
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ deleted: true });
    expect(returning).toHaveBeenCalledWith(expect.objectContaining({ id: expect.anything() }));
  });
});
