import { expect, test, type Page } from "@playwright/test";

async function mockChatBoundary(page: Page) {
  await page.route("**/api/chat", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: { status: "ready" } });
    return route.fulfill({ json: { answer: "Start with the assets and trust boundaries.", status: "ready" } });
  });
}

test("the Security guide renders at desktop and mobile widths", async ({ page }) => {
  await mockChatBoundary(page);
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    expect((await page.goto("/chapter/security"))?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 2, name: "Worked threat model: export customer invoices" })).toBeVisible();
    await expect(page.getByRole("table").nth(1)).toContainText("A user changes tenant or invoice IDs");
    await expect(page.getByRole("link", { name: "9. Security" }).first()).toHaveAttribute("href", "/book/9-security");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});
