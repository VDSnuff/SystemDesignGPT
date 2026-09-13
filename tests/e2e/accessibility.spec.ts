import { expect, test, type Page } from "@playwright/test";
import { guidePages } from "../../app/content";
import { seriousViolations } from "./axe";
import { observeRoute } from "./route-diagnostics";

const guideRoutes = guidePages.map(({ slug }) => `/chapter/${slug}`);
const representativeRoutes = [
  "/",
  ...guideRoutes,
  "/book/1-requirements-frs-nfrs-constraints-and-assumptions",
  "/book/practical-system-design-workflow",
  "/workshop",
  "/owner/comments",
] as const;

async function mockAccessibilityBoundaries(page: Page) {
  await page.route("**/api/chat", (route) => route.fulfill({ json: { status: "ready" } }));
  await page.route("**/api/learning-state**", (route) => route.fulfill({ json: { state: null, revision: null } }));
  await page.route("**/api/handbook-progress", (route) => route.fulfill({ json: { state: null, revision: null } }));
  await page.route("**/api/learning-comments", (route) => route.fulfill({ json: { comments: [] } }));
}

async function waitForHydratedSurface(page: Page, route: string) {
  if (route === "/owner/comments") return page.getByText("No learning comments yet.").waitFor();
  if (route === "/workshop") return page.getByText("Ready for your first workshop save.").waitFor();
  if (route.startsWith("/chapter/")) return page.getByRole("heading", { name: "Review questions" }).waitFor();
  return page.getByText("Ready for your first save.").waitFor();
}

for (const route of representativeRoutes) {
  test(`${route} has no serious or critical accessibility violations`, async ({ page }) => {
    await mockAccessibilityBoundaries(page);
    await page.goto(route);
    await waitForHydratedSurface(page, route);
    if (route.includes("practical-system-design-workflow")) {
      const diagram = page.getByRole("img", { name: "Architecture diagram" });
      await page.locator(".book-prose").getByText(/^Figure 1\./).scrollIntoViewIfNeeded();
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

test("skip link focuses the main landmark", async ({ browserName, page }) => {
  await mockAccessibilityBoundaries(page);
  await page.goto("/");

  await page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab");
  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
});

test("core pages reflow without page-level horizontal scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await mockAccessibilityBoundaries(page);
  const reflowRoutes = [
    ...guideRoutes,
    "/book/1-requirements-frs-nfrs-constraints-and-assumptions",
    "/workshop",
  ];
  for (const route of reflowRoutes) {
    await observeRoute(route, () => page.goto(route));
    const hasPageOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(hasPageOverflow).toBe(false);
  }
});

test("mobile Quick Guide navigation exposes canonical and handbook-only coverage", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockAccessibilityBoundaries(page);
  await page.goto("/chapter/requirements");
  await page.waitForLoadState("networkidle");
  await page.getByText("Quick Guides · Requirements", { exact: true }).click();

  const navigation = page.getByRole("navigation", { name: "Quick Guides" });
  await expect(navigation.getByRole("link", { name: "01 Requirements", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: "13. Master System Design Review Checklist" }).first()).toBeVisible();
  await expect(page.getByRole("region", { name: "This Quick Guide summarizes" })).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);
});

test("interactive controls retain visible focus and 44 pixel targets", async ({ browserName, page }) => {
  await mockAccessibilityBoundaries(page);
  await page.goto("/book/1-requirements-frs-nfrs-constraints-and-assumptions");
  await expect(page.getByRole("combobox", { name: "Search the guide and handbook" })).toBeEnabled({ timeout: 20_000 });
  const controls = page.locator(".nav-target:visible, .search-control:visible, .tool-button:visible, .tool-button-dark:visible, .compact-action:visible");
  const count = await controls.count();
  for (let index = 0; index < count; index += 1) {
    const box = await controls.nth(index).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
  let focusedControls = 0;
  for (let index = 0; index < 40; index += 1) {
    await page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab");
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
  expect(focusedControls).toBeGreaterThanOrEqual(5);
});

test("reduced-motion preference removes meaningful transitions", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockAccessibilityBoundaries(page);
  await page.goto("/");

  const duration = await page.getByRole("link", { name: /System Design Studio/ }).evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(Number.parseFloat(duration)).toBeLessThanOrEqual(0.00001);
});

test("200 percent text zoom keeps core pages usable without page-level overflow", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await mockAccessibilityBoundaries(page);
  const zoomRoutes = ["/", "/chapter/requirements", "/book/1-requirements-frs-nfrs-constraints-and-assumptions", "/workshop"];
  for (const route of zoomRoutes) {
    await observeRoute(route, () => page.goto(route));
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    await expect(page.getByRole("combobox", { name: "Search the guide and handbook" })).toBeEnabled({ timeout: 20_000 });
    const rootFontSize = await page.evaluate(() => Number.parseFloat(getComputedStyle(document.documentElement).fontSize));
    expect(rootFontSize).toBeGreaterThanOrEqual(32);
    const hasPageOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(hasPageOverflow).toBe(false);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
});

test("forced-colors mode keeps controls bounded and focus visible", async ({ browserName, page }) => {
  test.skip(browserName !== "chromium", "forced-colors emulation is Chromium-only");
  await page.emulateMedia({ forcedColors: "active" });
  await mockAccessibilityBoundaries(page);
  await page.goto("/book/1-requirements-frs-nfrs-constraints-and-assumptions");
  await page.getByText("Ready for your first save.").waitFor();
  expect(await page.evaluate(() => matchMedia("(forced-colors: active)").matches)).toBe(true);

  const controls = page.locator("button.tool-button:visible, button.tool-button-dark:visible, button.compact-action:visible, input.search-control:visible");
  const count = await controls.count();
  expect(count).toBeGreaterThanOrEqual(5);
  for (let index = 0; index < count; index += 1) {
    const boundary = await controls.nth(index).evaluate((element) => {
      const style = getComputedStyle(element);
      return { borderStyle: style.borderTopStyle, borderWidth: Number.parseFloat(style.borderTopWidth) };
    });
    expect(boundary.borderStyle).not.toBe("none");
    expect(boundary.borderWidth).toBeGreaterThan(0);
  }

  await page.getByRole("combobox", { name: "Search the guide and handbook" }).focus();
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) return null;
    const style = getComputedStyle(active);
    return { outline: style.outlineStyle, width: Number.parseFloat(style.outlineWidth) };
  });
  expect(focus?.outline).not.toBe("none");
  expect(focus?.width).toBeGreaterThan(0);
  // Forced colors replace author colors with the system palette, so axe contrast math is not meaningful here.
  expect(await seriousViolations(page, { disableRules: ["color-contrast"] })).toEqual([]);
});
