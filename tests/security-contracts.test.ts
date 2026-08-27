import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readJsonRequest } from "../app/json-request";
import { securityHeaders } from "../app/security-headers";
import nextConfig from "../next.config";

function request(body: BodyInit, contentType = "application/json") {
  const init = {
    method: "POST",
    headers: { "Content-Type": contentType },
    body,
    duplex: body instanceof ReadableStream ? "half" : undefined,
  } as RequestInit;
  return new Request("https://example.com/api/test", init);
}

describe("bounded JSON request parsing", () => {
  it("accepts valid JSON within the declared byte limit", async () => {
    const result = await readJsonRequest(request('{"safe":true}'), 128);

    expect(result).toEqual({ ok: true, value: { safe: true } });
  });

  it("rejects unsupported media types and malformed JSON", async () => {
    expect(await readJsonRequest(request("{}", "text/plain"), 128)).toEqual({ ok: false, status: 415 });
    expect(await readJsonRequest(request("{"), 128)).toEqual({ ok: false, status: 400 });
  });

  it("rejects streamed bodies after the byte ceiling", async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('{"value":"'));
        controller.enqueue(encoder.encode("x".repeat(256)));
        controller.enqueue(encoder.encode('"}'));
        controller.close();
      },
    });
    const streamed = request(body);

    expect(await readJsonRequest(streamed, 128)).toEqual({ ok: false, status: 413 });
  });
});

describe("production response header policy", () => {
  it("defines the required browser security controls for every route", async () => {
    const values = Object.fromEntries(securityHeaders.map(({ key, value }) => [key, value]));
    const rules = await nextConfig.headers?.();

    expect(rules).toEqual([{ source: "/:path*", headers: [...securityHeaders] }]);
    expect(values["Content-Security-Policy"]).toContain("frame-ancestors 'self' https://chatgpt.com");
    expect(values["Content-Security-Policy"]).toContain("object-src 'none'");
    expect(values["Permissions-Policy"]).toBe("camera=(), geolocation=(), microphone=()");
    expect(values["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(values["Strict-Transport-Security"]).toBe("max-age=31536000");
    expect(values["X-Content-Type-Options"]).toBe("nosniff");
  });

  it("applies the same required headers to statically served assets", () => {
    const assetHeaders = readFileSync("public/_headers", "utf8").toLowerCase();
    for (const header of securityHeaders) {
      expect(assetHeaders).toContain(`${header.key.toLowerCase()}: ${header.value.toLowerCase()}`);
    }
  });
});
