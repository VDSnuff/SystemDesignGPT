import path from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { mockBrowserBoundaries } from "./browser-boundaries";

const snapshotStyle = path.join(import.meta.dirname, "visual-regression.css");
const viewports = [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

const surfaces = [
  { name: "home", path: "/", ready: "System Design Checklist Book" },
  { name: "guide", path: "/chapter/requirements", ready: "Design from requirements, not from patterns." },
  { name: "handbook", path: "/book/1-requirements-frs-nfrs-constraints-and-assumptions", ready: "1. Requirements: FRs, NFRs, Constraints, and Assumptions" },
  { name: "owner", path: "/owner/comments", ready: "Learning comments" },
] as const;

async function preparePage(page: Page, pathName: string, heading: string) {
  await mockBrowserBoundaries(page);
  await page.goto(pathName);
  await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

async function expectSnapshot(target: Page | Locator, name: string) {
  await expect(target).toHaveScreenshot(name, { stylePath: snapshotStyle });
}

for (const viewport of viewports) {
  for (const surface of surfaces) {
    test(`${surface.name} ${viewport.name} baseline`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await preparePage(page, surface.path, surface.ready);
      await expectSnapshot(page, `${surface.name}-${viewport.name}.png`);
    });
  }

  test(`Mermaid ${viewport.name} baseline`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await preparePage(page, "/book/practical-system-design-workflow", "Practical system-design workflow");
    const diagram = page.getByRole("img", { name: "Architecture diagram" });
    await page.locator(".book-prose").getByText(/^Figure 1\./).scrollIntoViewIfNeeded();
    await expect(diagram).toBeVisible({ timeout: 20_000 });
    await expectSnapshot(diagram, `mermaid-${viewport.name}.png`);
  });

  test(`workshop ${viewport.name} baseline`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await preparePage(page, "/workshop", "Build the system you mean.");
    const canvas = page.getByRole("group", { name: "Workshop diagram canvas" });
    await canvas.scrollIntoViewIfNeeded();
    await expectSnapshot(canvas, `workshop-${viewport.name}.png`);
  });
}

test("mobile copilot baseline", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await preparePage(page, "/book/1-requirements-frs-nfrs-constraints-and-assumptions", "1. Requirements: FRs, NFRs, Constraints, and Assumptions");
  await page.getByRole("button", { name: /Open design copilot/ }).click();
  await expect(page.getByRole("dialog", { name: /Design copilot/ })).toBeVisible();
  await expectSnapshot(page, "copilot-phone.png");
});

test("search results baseline", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await preparePage(page, "/chapter/requirements", "Design from requirements, not from patterns.");
  const search = page.getByRole("combobox", { name: "Search the guide and handbook" });
  await search.fill("idempotency");
  await expect(page.getByRole("option").first()).toBeVisible();
  await expectSnapshot(page, "search-results-desktop.png");
});
