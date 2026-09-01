import { expect, test } from "@playwright/test";
import { mockChatBoundary } from "./mock-chat";

test("the Real-time and long-running work guide renders at desktop and mobile widths", async ({ page }) => {
  await mockChatBoundary(page, "Review the operation lifecycle.");
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    expect((await page.goto("/chapter/realtime-work"))?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 2, name: "Worked example: generate a large account export" })).toBeVisible();
    await expect(page.getByRole("table")).toContainText("Server-sent events (SSE)");
    await expect(page.getByRole("link", { name: "6A. Real-Time and Long-Running Work" }).first()).toHaveAttribute(
      "href",
      "/book/6a-real-time-and-long-running-work",
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});
