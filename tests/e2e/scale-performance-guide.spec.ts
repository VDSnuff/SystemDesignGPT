import { expect, test, type Page } from "@playwright/test";

async function mockChatBoundary(page: Page) {
  await page.route("**/api/chat", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: { status: "ready" } });
    return route.fulfill({ json: { answer: "Start with the load model.", status: "ready" } });
  });
}

test("the Scale, performance & caching guide renders at desktop and mobile widths", async ({ page }) => {
  await mockChatBoundary(page);
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    expect((await page.goto("/chapter/scale-performance"))?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 2, name: "Worked example: size an order-read path" })).toBeVisible();
    await expect(page.getByRole("table").first()).toContainText("Horizontal scale");
    await expect(page.getByRole("link", { name: "8. Scale, Capacity, Performance, and Caching" }).first()).toHaveAttribute(
      "href",
      "/book/8-scale-capacity-performance-and-caching",
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});
