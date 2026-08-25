import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const representativeRoutes = [
  "/",
  "/book/1-requirements-frs-nfrs-constraints-and-assumptions",
  "/book/practical-system-design-workflow",
  "/workshop",
  "/owner/comments",
] as const;

async function mockAccessibilityBoundaries(page: Page) {
  await page.route("**/api/chat", (route) => route.fulfill({ json: { status: "ready" } }));
  await page.route("**/api/learning-state**", (route) => route.fulfill({ json: { state: null } }));
  await page.route("**/api/handbook-progress", (route) => route.fulfill({ json: { state: null } }));
  await page.route("**/api/learning-comments", (route) => route.fulfill({ json: { comments: [] } }));
}

async function seriousViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  return results.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious");
}

async function waitForHydratedSurface(page: Page, route: string) {
  if (route === "/owner/comments") return page.getByText("No learning comments yet.").waitFor();
  if (route === "/workshop") return page.getByText("Ready for your first workshop save.").waitFor();
  return page.getByText("Ready for your first save.").waitFor();
}

for (const route of representativeRoutes) {
  test(`${route} has no serious or critical accessibility violations`, async ({ page }) => {
    await mockAccessibilityBoundaries(page);
    await page.goto(route);
    await waitForHydratedSurface(page, route);
    if (route.includes("practical-system-design-workflow")) {
      const diagram = page.getByRole("img", { name: "Architecture diagram" });
      if (!await diagram.count()) await page.locator(".mermaid-loading").scrollIntoViewIfNeeded();
      await expect(diagram).toBeVisible({ timeout: 20_000 });
    }

    expect(await seriousViolations(page)).toEqual([]);
  });
}

test("learning lab follows the tabs keyboard pattern", async ({ page }) => {
  await mockAccessibilityBoundaries(page);
  await page.goto("/book/1-requirements-frs-nfrs-constraints-and-assumptions");
  await page.getByText("Ready for your first save.").waitFor();
  const tabs = page.getByRole("tablist", { name: "Learning lab tools" });
  const diagram = tabs.getByRole("tab", { name: "Diagram" });
  const quiz = tabs.getByRole("tab", { name: "Quiz" });

  await diagram.focus();
  await page.keyboard.press("ArrowRight");
  await expect(quiz).toBeFocused();
  await expect(quiz).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel", { name: "Quiz" })).toBeVisible();
  await page.keyboard.press("End");
  await expect(tabs.getByRole("tab", { name: "Notes & feedback" })).toBeFocused();
  await page.keyboard.press("Home");
  await expect(diagram).toBeFocused();
});

test("skip link focuses the main landmark", async ({ page }) => {
  await mockAccessibilityBoundaries(page);
  await page.goto("/");

  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
});

test("core pages reflow without page-level horizontal scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await mockAccessibilityBoundaries(page);
  for (const route of ["/book/1-requirements-frs-nfrs-constraints-and-assumptions", "/workshop"]) {
    await page.goto(route);
    const hasPageOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(hasPageOverflow).toBe(false);
  }
});

test("interactive controls retain visible focus and 44 pixel targets", async ({ page }) => {
  await mockAccessibilityBoundaries(page);
  await page.goto("/book/1-requirements-frs-nfrs-constraints-and-assumptions");
  const controls = page.locator(".nav-target:visible, .search-control:visible, .tool-button:visible, .tool-button-dark:visible, .compact-action:visible");
  const count = await controls.count();
  for (let index = 0; index < count; index += 1) {
    const box = await controls.nth(index).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
  let focusedControls = 0;
  for (let index = 0; index < 40; index += 1) {
    await page.keyboard.press("Tab");
    const focus = await page.evaluate(() => {
      const active = document.activeElement;
      if (!(active instanceof HTMLElement) || !active.matches(".nav-target, .search-control, .tool-button, .tool-button-dark, .compact-action")) return null;
      return { outline: getComputedStyle(active).outlineStyle, visible: Boolean(active.offsetWidth || active.offsetHeight) };
    });
    if (!focus) continue;
    focusedControls += 1;
    expect(focus.visible).toBe(true);
    expect(focus.outline).not.toBe("none");
  }
  expect(focusedControls).toBeGreaterThan(5);
});

test("reduced-motion preference removes meaningful transitions", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockAccessibilityBoundaries(page);
  await page.goto("/");

  const duration = await page.getByRole("link", { name: /System Design Studio/ }).evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(Number.parseFloat(duration)).toBeLessThanOrEqual(0.00001);
});
