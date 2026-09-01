import type { Page } from "@playwright/test";

export async function mockChatBoundary(page: Page, answer: string) {
  await page.route("**/api/chat", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: { status: "ready" } });
    return route.fulfill({
      json: {
        answer,
        metadata: { inputTokens: 120, latencyMs: 850, model: "test-model-v1", outputTokens: 24, totalTokens: 144 },
        status: "ready",
      },
    });
  });
}
