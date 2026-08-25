import { afterEach, describe, expect, it, vi } from "vitest";

const { getDbMock } = vi.hoisted(() => ({ getDbMock: vi.fn() }));
vi.mock("../db", () => ({ getDb: getDbMock }));

import { GET, PATCH, POST } from "../app/api/learning-comments/route";

interface RequestOptions {
  readonly body?: unknown;
  readonly email?: string;
  readonly method: "GET" | "PATCH" | "POST";
  readonly origin?: string;
  readonly userId?: string;
}

function request(options: RequestOptions) {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (options.userId) headers.set("oai-authenticated-user-id", options.userId);
  if (options.email) headers.set("oai-authenticated-user-email", options.email);
  if (options.origin) headers.set("origin", options.origin);
  return new Request("http://localhost/api/learning-comments", {
    method: options.method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

afterEach(() => {
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
    const limit = vi.fn().mockResolvedValue([]);
    getDbMock.mockReturnValue({
      select: () => ({ from: () => ({ orderBy: () => ({ limit }) }) }),
    });

    const response = await GET(request({ method: "GET", userId: "owner", email: "OWNER@example.com" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ comments: [] });
    expect(limit).toHaveBeenCalledWith(100);
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
    const response = await POST(request({
      method: "POST",
      origin: "http://localhost",
      userId: "reader",
      email: "reader@example.com",
      body: { pageSlug: "introduction", body: "" },
    }));

    expect(response.status).toBe(400);
    expect(getDbMock).not.toHaveBeenCalled();
  });

  it("accepts a valid same-origin comment without a hosted database", async () => {
    const values = vi.fn().mockResolvedValue(undefined);
    getDbMock.mockReturnValue({ insert: () => ({ values }) });

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
      body: { id: "a4fe79cb-785a-43ef-a7f6-5516cd2af83e", status: "read" },
    }));

    expect(response.status).toBe(403);
    expect(getDbMock).not.toHaveBeenCalled();
  });
});
