import { expect, test, type Page } from "@playwright/test";
import type { HandbookProgress } from "../../app/handbook-progress";

interface ProgressStore { state: HandbookProgress | null }

async function mockSearchBoundaries(page: Page, progressStore: ProgressStore = { state: null }) {
  await page.route("**/api/chat", (route) => route.fulfill({ json: { status: "ready" } }));
  await page.route("**/api/learning-state**", (route) => route.fulfill({ json: { state: null } }));
  await page.route("**/api/handbook-progress", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: { state: progressStore.state } });
    progressStore.state = route.request().postDataJSON() as HandbookProgress;
    return route.fulfill({ json: { saved: true } });
  });
}

test("keyboard search opens the exact generated handbook heading anchor", async ({ page }) => {
  const progressStore: ProgressStore = { state: null };
  await mockSearchBoundaries(page, progressStore);
  await page.goto("/book/1-requirements-frs-nfrs-constraints-and-assumptions");

  const search = page.getByRole("combobox", { name: "Search the guide and handbook" });
  await expect(search).toBeEnabled({ timeout: 20_000 });
  await search.fill("14.2 functional requ");
  await expect(page.getByRole("option").first()).toBeVisible();
  await search.press("ArrowDown");
  expect(await page.locator("a:focus").getAttribute("href"))
    .toMatch(/#14-2-functional-requirements-fr-full-cycle$/);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#14-2-functional-requirements-fr-full-cycle$/);
  await expect.poll(() => progressStore.state?.lastRead?.headingId)
    .toBe("14-2-functional-requirements-fr-full-cycle");
});

test("search opens an enriched Quick Guide heading anchor", async ({ page }) => {
  await mockSearchBoundaries(page);
  await page.goto("/chapter/requirements");

  const search = page.getByRole("combobox", { name: "Search the guide and handbook" });
  await expect(search).toBeEnabled({ timeout: 20_000 });
  await search.fill("bounded order cancellation agent");
  const result = page.getByRole("option").first().getByRole("link");
  await expect(result).toHaveAttribute(
    "href",
    "/chapter/agentic-systems#worked-example-a-bounded-order-cancellation-agent",
  );
  await result.click();
  await expect(page).toHaveURL(/\/chapter\/agentic-systems#worked-example-a-bounded-order-cancellation-agent$/);
});

test("search reports a lazy corpus loading failure", async ({ page }) => {
  await page.route(
    /\/(?:app\/book-search\.ts|_next\/static\/chunks\/book-search-[^/]+\.js)(?:\?|$)/,
    (route) => route.abort("failed"),
  );
  await mockSearchBoundaries(page);
  await page.goto("/");

  await page.getByRole("combobox", { name: "Search the guide and handbook" }).fill("requirements");
  await expect(page.getByText("Search is unavailable. Use the guide or handbook navigation.")).toBeVisible();
});
