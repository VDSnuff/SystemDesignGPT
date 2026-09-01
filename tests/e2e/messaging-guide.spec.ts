import { expect, test } from "@playwright/test";
import { mockChatBoundary } from "./mock-chat";

test("the Messaging guide article renders at desktop and mobile widths", async ({ page }) => {
  await mockChatBoundary(page, "Review the message contract.");
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    expect((await page.goto("/chapter/messaging"))?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 2, name: "Worked example: accept an order and start fulfillment" })).toBeVisible();
    await expect(page.getByRole("table")).toContainText("Retained event log");
    await expect(page.getByRole("link", { name: "6. Messaging and Asynchronous Work" }).first()).toHaveAttribute(
      "href",
      "/book/6-messaging-and-asynchronous-work",
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});
