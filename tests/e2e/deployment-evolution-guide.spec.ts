import { expect, test } from "@playwright/test";
import { mockChatBoundary } from "./mock-chat";

test("the Deployment & evolution guide renders at desktop and mobile widths", async ({ page }) => {
  await mockChatBoundary(page, "Start with mixed-version compatibility.");
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    expect((await page.goto("/chapter/deployment-evolution"))?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 2, name: "Worked migration: rename a customer field without downtime" })).toBeVisible();
    await expect(page.getByRole("table").first()).toContainText("Canary release");
    await expect(page.getByRole("link", { name: "11. Deployment, Migration, and Evolution" }).first()).toHaveAttribute(
      "href",
      "/book/11-deployment-migration-and-evolution",
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});
