import { expect, test, type Page } from "@playwright/test";
import { mockBrowserBoundaries } from "./browser-boundaries";

const viewports = [
  { name: "narrow-reflow", width: 320, height: 720 },
  { name: "phone", width: 390, height: 844 },
  { name: "tablet-portrait", width: 768, height: 1024 },
  { name: "tablet-landscape", width: 1024, height: 768 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

const surfaces = [
  { path: "/", heading: "System Design Checklist Book" },
  { path: "/chapter/requirements", heading: "Design from requirements, not from patterns." },
  { path: "/book/practical-system-design-workflow", heading: "Practical system-design workflow" },
  { path: "/workshop", heading: "Build the system you mean." },
  { path: "/owner/comments", heading: "Learning comments" },
] as const;

function captureDiagnostics(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  page.on("requestfailed", (request) => {
    errors.push(`request: ${request.url()} ${request.failure()?.errorText ?? "failed"}`);
  });
  return errors;
}

for (const viewport of viewports) {
  test(`${viewport.name} keeps representative templates usable`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await mockBrowserBoundaries(page);
    const errors = captureDiagnostics(page);

    for (const surface of surfaces) {
      await test.step(surface.path, async () => {
        errors.length = 0;
        const response = await page.goto(surface.path);
        expect(response?.status()).toBe(200);
        await expect(page.getByRole("heading", { level: 1, name: surface.heading })).toBeVisible();
        await page.waitForLoadState("networkidle");
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        expect(errors).toEqual([]);
      });
    }
  });
}

test("phone orientation change preserves the active reader controls", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockBrowserBoundaries(page);
  await page.goto("/book/1-requirements-frs-nfrs-constraints-and-assumptions");
  const openCopilot = page.getByRole("button", { name: /Open design copilot/ });
  await openCopilot.click();
  await page.getByRole("dialog", { name: /Design copilot/ })
    .getByRole("button", { name: "Close design copilot" }).click();

  await page.setViewportSize({ width: 844, height: 390 });
  await expect(openCopilot).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Search the guide and handbook" })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
