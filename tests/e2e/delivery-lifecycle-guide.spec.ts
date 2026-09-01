import { expect, test } from "@playwright/test";
import { mockChatBoundary } from "./mock-chat";

test("the Requirements-to-delivery guide renders at desktop and mobile widths", async ({ page }) => {
  await mockChatBoundary(page, "Review the traceability chain.");
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    expect((await page.goto("/chapter/delivery-lifecycle"))?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 2, name: "Worked example: cancel a pending order safely" })).toBeVisible();
    await expect(page.getByRole("table").filter({ hasText: "Architecture or technical design" })).toBeVisible();
    await expect(page.getByRole("link", { name: /14\. Requirements-to-Delivery Lifecycle/ })).toHaveAttribute(
      "href",
      "/book/14-requirements-to-delivery-lifecycle-fr-nfr-constraints-adr-and-tip",
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});
