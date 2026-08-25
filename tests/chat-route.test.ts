import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "../app/api/chat/route";

function chatRequest(userId: string) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", "oai-authenticated-user-id": userId },
    body: JSON.stringify({ pageId: "requirements", question: "Review this design", history: [] }),
  });
}

async function responseBody(response: Response) {
  return await response.json() as unknown;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("chat route service contract", () => {
  it("checks configuration without calling the provider", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    const providerFetch = vi.fn();
    vi.stubGlobal("fetch", providerFetch);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await responseBody(response)).toEqual({ status: "ready" });
    expect(providerFetch).not.toHaveBeenCalled();
  });

  it("returns a typed unconfigured error when the key is missing", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");

    const response = await POST(chatRequest("missing-key"));

    expect(response.status).toBe(503);
    expect(await responseBody(response)).toEqual({
      error: { code: "unconfigured", message: "The copilot is not configured yet." },
    });
  });

  it("returns an answer while preserving the provider no-storage setting", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    const providerFetch = vi.fn().mockResolvedValue(Response.json({
      output: [{ content: [{ type: "output_text", text: "Review complete." }] }],
    }));
    vi.stubGlobal("fetch", providerFetch);

    const response = await POST(chatRequest("success"));
    const requestInit = providerFetch.mock.calls[0]?.[1] as RequestInit;
    const providerBody = JSON.parse(String(requestInit.body)) as { store?: unknown };

    expect(response.status).toBe(200);
    expect(await responseBody(response)).toEqual({ answer: "Review complete.", status: "ready" });
    expect(providerBody.store).toBe(false);
  });

  it("maps provider 429 responses to usage-limited without leaking the provider body", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ secret: "provider detail" }, { status: 429 })));

    const response = await POST(chatRequest("usage-limit"));
    const body = await responseBody(response);

    expect(response.status).toBe(429);
    expect(body).toEqual({ error: { code: "usage_limited", message: "The AI project has reached a usage limit." } });
    expect(JSON.stringify(body)).not.toContain("provider detail");
  });

  it("maps provider 5xx responses to a temporary service error", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("upstream failure", { status: 500 })));

    const response = await POST(chatRequest("provider-error"));

    expect(response.status).toBe(503);
    expect(await responseBody(response)).toEqual({
      error: { code: "provider_unavailable", message: "The copilot provider is temporarily unavailable." },
    });
  });

  it("maps a successful provider response without answer text to malformed-response", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ output: [] })));

    const response = await POST(chatRequest("malformed"));

    expect(response.status).toBe(502);
    expect(await responseBody(response)).toEqual({
      error: { code: "malformed_response", message: "The copilot returned an invalid response." },
    });
  });
});
