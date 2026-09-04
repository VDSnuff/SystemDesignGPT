import { expect, test, type Page } from "@playwright/test";
import { mockBrowserBoundaries } from "./browser-boundaries";

const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 1000 },
] as const;
const revision = "2026-09-01T12:00:00.000Z";
const mermaidRoutes = [
  "/book/practical-system-design-workflow",
  "/book/2-boundaries-state-and-data",
  "/book/2b-data-modeling-indexing-and-partitioning",
  "/book/4-transactions-and-consistency",
  "/book/6a-real-time-and-long-running-work",
  "/book/7-failure-handling-and-resilience",
  "/book/14-requirements-to-delivery-lifecycle-fr-nfr-constraints-adr-and-tip",
  "/book/15-llm-and-agentic-systems",
  "/book/16-spec-driven-development-for-agentic-systems",
] as const;

async function mockLearningState(page: Page) {
  let savedBody: unknown;
  await page.route("**/api/learning-state**", async (route) => {
    if (route.request().method() === "PUT") {
      savedBody = route.request().postDataJSON();
      return route.fulfill({ json: { saved: true, updatedAt: revision } });
    }
    return route.fulfill({ json: { state: null, revision: null } });
  });
  return () => savedBody;
}

for (const viewport of viewports) {
  test(`${viewport.name} keeps every default node reachable`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await mockLearningState(page);
    await page.goto("/workshop");

    const region = page.getByRole("region", { name: /Workshop diagram canvas, horizontally scrollable/ });
    const canvas = page.getByRole("group", { name: "Workshop diagram canvas" });
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveCSS("width", "680px");

    const isOverflowing = await region.evaluate((element) => element.scrollWidth > element.clientWidth);
    expect(isOverflowing).toBe(viewport.width < 768);
    await region.scrollIntoViewIfNeeded();
    await region.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
    await expect(page.getByRole("button", { name: "Database: Primary store" })).toBeInViewport();

    const canvasBox = await canvas.boundingBox();
    const nodes = await canvas.getByRole("button").all();
    expect(canvasBox).not.toBeNull();
    for (const node of nodes) {
      const box = await node.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(canvasBox!.x);
      expect(box!.x + box!.width).toBeLessThanOrEqual(canvasBox!.x + canvasBox!.width);
    }
  });
}

test("every source-authored Mermaid diagram passes CSP", async ({ page }) => {
  await mockBrowserBoundaries(page);
  const cspErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && message.text().includes("Content Security Policy")) {
      cspErrors.push(message.text());
    }
  });
  for (const route of mermaidRoutes) {
    cspErrors.length = 0;
    await page.goto(route);
    const loadingState = page.locator(".mermaid-loading");
    await expect(loadingState).toHaveCount(1);
    await page.evaluate(() => {
      document.querySelector<HTMLElement>(".mermaid-loading, .mermaid-diagram")
        ?.scrollIntoView({ block: "center" });
    });
    await expect(page.getByRole("img", { name: "Architecture diagram" })).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(".mermaid-fallback")).toHaveCount(0);
    expect(cspErrors, route).toEqual([]);
  }
});

test("keyboard-only workflow edits, connects, deletes, undoes, and saves", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const savedBody = await mockLearningState(page);
  await page.goto("/workshop");
  await expect(page.getByText("Ready for your first workshop save.")).toBeVisible();

  for (let index = 0; index < 2; index += 1) {
    await page.getByRole("button", { name: "+ Queue" }).focus();
    await page.keyboard.press("Enter");
  }
  const queues = page.getByRole("button", { name: "Queue: New queue" });
  await expect(queues).toHaveCount(2);

  await queues.first().focus();
  await page.keyboard.press("Enter");
  const label = page.getByLabel("Selected node label");
  const lineStyleBeforeRename = await page.locator(".diagram-line").first().getAttribute("style");
  await label.focus();
  await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await page.keyboard.type("Worker queue");
  const renamed = page.getByRole("button", { name: "Queue: Worker queue" });
  expect(await page.locator(".diagram-line").first().getAttribute("style")).toBe(lineStyleBeforeRename);

  await queues.last().focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Connect selected" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Selected nodes connected.")).toBeVisible();
  const queueConnection = page.locator(".diagram-line").last();
  const lineStyleBeforeMove = await queueConnection.getAttribute("style");
  await renamed.focus();
  await page.keyboard.press("ArrowRight");
  expect(await queueConnection.getAttribute("style")).not.toBe(lineStyleBeforeMove);

  await renamed.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Delete selected" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Node deleted. Undo is available.")).toBeVisible();
  await page.getByRole("button", { name: "Undo delete/reset" }).focus();
  await page.keyboard.press("Enter");
  await expect(renamed).toBeVisible();

  await page.getByRole("button", { name: "Save workshop diagram" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Workshop diagram saved for your next visit.")).toBeVisible();
  expect(savedBody()).toMatchObject({ pageSlug: "diagram-workshop", diagram: { version: 1 } });
});
