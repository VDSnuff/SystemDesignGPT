import type { Page } from "@playwright/test";

export async function mockBrowserBoundaries(page: Page) {
  await page.route("**/api/chat", (route) => route.fulfill({ json: { status: "ready" } }));
  await page.route("**/api/learning-comments**", (route) => route.fulfill({ json: { comments: [] } }));
  await page.route("**/api/learning-state**", (route) => route.fulfill({ json: { state: null, revision: null } }));
  await page.route("**/api/handbook-progress", (route) => route.fulfill({ json: { state: null, revision: null } }));
}
