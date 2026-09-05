import { expect, test } from "@playwright/test";
import { mockChatBoundary } from "./mock-chat";

test("the Agentic systems guide article renders at desktop and mobile widths", async ({ page }) => {
  await mockChatBoundary(page, "Review the agent boundary.");
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    expect((await page.goto("/chapter/agentic-systems"))?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 2, name: "Worked example: a bounded order-cancellation agent" })).toBeVisible();
    await expect(page.getByRole("table")).toContainText("Single bounded agent");
    const coverage = page.getByRole("region", { name: "This Quick Guide summarizes" });
    await expect(coverage.getByRole("link", { name: "Canonical handbook chapter 15: LLM and Agentic Systems" })).toHaveAttribute("href", "/book/15-llm-and-agentic-systems");
    await expect(coverage.getByRole("link", { name: "Canonical handbook chapter 16: Spec-Driven Development for Agentic Systems" })).toHaveAttribute("href", "/book/16-spec-driven-development-for-agentic-systems");
    await expect(coverage.getByRole("link", { name: "Canonical handbook chapter 17: Agent-System Design Review Checklist" })).toHaveAttribute("href", "/book/17-agent-system-design-review-checklist");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});
