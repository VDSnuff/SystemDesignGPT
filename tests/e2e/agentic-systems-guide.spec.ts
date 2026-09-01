import { expect, test } from "@playwright/test";
import { mockChatBoundary } from "./mock-chat";

test("the Agentic systems guide article renders at desktop and mobile widths", async ({ page }) => {
  await mockChatBoundary(page, "Review the agent boundary.");
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    expect((await page.goto("/chapter/agentic-systems"))?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 2, name: "Worked example: a bounded order-cancellation agent" })).toBeVisible();
    await expect(page.getByRole("table")).toContainText("Single bounded agent");
    await expect(page.getByRole("link", { name: "15. LLM and Agentic Systems" })).toHaveAttribute(
      "href",
      "/book/15-llm-and-agentic-systems",
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});
