import { expect, test } from "@playwright/test";
import { mockChatBoundary } from "./mock-chat";

test("the Cost, simplicity & operability guide renders at desktop and mobile widths", async ({ page }) => {
  await mockChatBoundary(page, "Start with the requirements.");
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    expect((await page.goto("/chapter/cost-simplicity"))?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 2, name: "Worked simplification review: an order-status portal" })).toBeVisible();
    await expect(page.getByRole("table").first()).toContainText("Self-manage a platform");
    await expect(page.getByRole("link", { name: "12. Cost, Simplicity, and Operability" }).first()).toHaveAttribute(
      "href",
      "/book/12-cost-simplicity-and-operability",
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});
