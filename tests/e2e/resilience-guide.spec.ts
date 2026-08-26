import { expect, test, type Page } from "@playwright/test";

async function mockChatBoundary(page: Page) {
  await page.route("**/api/chat", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: { status: "ready" } });
    return route.fulfill({ json: { answer: "Review the failure contract.", status: "ready" } });
  });
}

test("the Failures and resilience guide renders at desktop and mobile widths", async ({ page }) => {
  await mockChatBoundary(page);
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    expect((await page.goto("/chapter/resilience"))?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 2, name: "Worked example: dependency outage during checkout" })).toBeVisible();
    await expect(page.getByRole("table").first()).toContainText("Ambiguous outcome");
    await expect(page.getByRole("link", { name: "7. Failure Handling and Resilience" }).first()).toHaveAttribute(
      "href",
      "/book/7-failure-handling-and-resilience",
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});
