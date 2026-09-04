import { describe, expect, it, vi } from "vitest";
import { checkUrl, hasBlockingFailure } from "../scripts/check-external-links.mjs";

function response(status: number, url = "https://example.com/final") {
  return { status, url } as Response;
}

describe("external link checker", () => {
  it("retries a method-specific HEAD failure with GET", async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(response(404))
      .mockResolvedValueOnce(response(206));

    await expect(checkUrl("https://doi.org/example", request)).resolves.toMatchObject({
      result: "PASS",
      verification: "AUTOMATED",
      status: 206,
    });
    expect(request.mock.calls.map(([, method]) => method)).toEqual(["HEAD", "GET"]);
  });

  it("fails a URL that remains broken after the GET retry", async () => {
    const request = vi.fn().mockResolvedValue(response(404));
    const result = await checkUrl("https://example.com/missing", request);

    expect(result).toMatchObject({
      result: "FAIL",
      verification: "AUTOMATED",
      status: 404,
    });
    expect(hasBlockingFailure([result])).toBe(true);
  });

  it("keeps bot-protected sources explicitly browser-required", async () => {
    const request = vi.fn().mockResolvedValue(response(403));
    const result = await checkUrl("https://example.com/protected", request);

    expect(result).toMatchObject({
      result: "UNVERIFIED",
      verification: "BROWSER_REQUIRED",
      status: 403,
    });
    expect(hasBlockingFailure([result])).toBe(false);
  });
});
