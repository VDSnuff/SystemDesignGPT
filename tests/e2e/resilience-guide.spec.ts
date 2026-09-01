import { expect, test } from "@playwright/test";
import { mockChatBoundary } from "./mock-chat";

test("the Failures and resilience guide renders at desktop and mobile widths", async ({ page }) => {
  await mockChatBoundary(page, "Review the failure contract.");
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
