import { expect, test } from "@playwright/test";
import { mockChatBoundary } from "./mock-chat";

test("the Observability & reliability guide renders at desktop and mobile widths", async ({ page }) => {
  await mockChatBoundary(page, "Start with the user journey.");
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    expect((await page.goto("/chapter/observability"))?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 2, name: "Worked diagnosis: follow one failed checkout" })).toBeVisible();
    await expect(page.getByRole("table").first()).toContainText("0.1% of eligible events");
    await expect(page.getByRole("link", { name: "10. Observability and Reliability" }).first()).toHaveAttribute(
      "href",
      "/book/10-observability-and-reliability",
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});
