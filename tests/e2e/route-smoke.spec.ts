import { expect, test, type Page } from "@playwright/test";
import type { HandbookProgress } from "../../app/handbook-progress";

const handbookRoutes = [
  { path: "/", title: "System Design Checklist Book" },
  { path: "/book/1-requirements-frs-nfrs-constraints-and-assumptions", title: "1. Requirements: FRs, NFRs, Constraints, and Assumptions" },
  { path: "/book/practical-system-design-workflow", title: "Practical system-design workflow" },
] as const;

interface ProgressStore { state: HandbookProgress | null }

async function mockReaderBoundaries(page: Page, progressStore: ProgressStore = { state: null }) {
  await page.route("**/api/chat", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: { status: "ready" } });
    return route.fulfill({ json: { answer: "Review requirements first.", status: "ready" } });
  });
  await page.route("**/api/learning-state**", (route) => route.fulfill({ json: { state: null } }));
  await page.route("**/api/handbook-progress", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: { state: progressStore.state } });
    progressStore.state = route.request().postDataJSON() as HandbookProgress;
    return route.fulfill({ json: { saved: true } });
  });
}

for (const route of handbookRoutes) {
  test(`${route.path} renders its canonical heading`, async ({ page }) => {
    await mockReaderBoundaries(page);
    const response = await page.goto(route.path);

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: route.title })).toBeVisible();
  });
}

test("reader pagination follows the generated section route", async ({ page }) => {
  await mockReaderBoundaries(page);
  await page.goto("/");

  await page.getByRole("navigation", { name: "Book pagination" })
    .getByRole("link", { name: /Book plan/ }).click();

  await expect(page).toHaveURL(/\/book\/book-plan$/);
  await expect(page.getByRole("heading", { level: 1, name: "Book plan" })).toBeVisible();
});

test("keyboard search opens the exact generated heading anchor", async ({ page }) => {
  const progressStore: ProgressStore = { state: null };
  await mockReaderBoundaries(page, progressStore);
  await page.goto("/book/1-requirements-frs-nfrs-constraints-and-assumptions");

  const search = page.getByRole("combobox", { name: "Search the complete handbook" });
  await expect(search).toBeEnabled({ timeout: 20_000 });
  await search.fill("14.2 functional requ");
  await expect(page.getByRole("option").first()).toBeVisible();
  await search.press("ArrowDown");
  const focusedHref = await page.locator("a:focus").getAttribute("href");
  expect(focusedHref).toMatch(/#14-2-functional-requirements-fr-full-cycle$/);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#14-2-functional-requirements-fr-full-cycle$/);
  await expect.poll(() => progressStore.state?.lastRead?.headingId).toBe("14-2-functional-requirements-fr-full-cycle");
});

test("completion and checklist choices survive reload", async ({ page }) => {
  const progressStore: ProgressStore = { state: null };
  await mockReaderBoundaries(page, progressStore);
  await page.goto("/book/1-requirements-frs-nfrs-constraints-and-assumptions");
  const sidebar = page.locator("aside").filter({ hasText: "Your handbook progress" });
  await expect(sidebar.getByText(/No saved progress yet/)).toBeVisible();

  await page.getByRole("button", { name: "Mark section complete" }).click();
  const firstChecklistItem = page.locator("#section-content input[type='checkbox']").first();
  await firstChecklistItem.check();
  await expect.poll(() => progressStore.state?.completedSections).toContain("1-requirements-frs-nfrs-constraints-and-assumptions");
  await expect.poll(() => progressStore.state?.checkedItems.length).toBe(1);

  await page.reload();
  await expect(page.getByRole("button", { name: /Section complete · Undo/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#section-content input[type='checkbox']").first()).toBeChecked();
});

test("a mobile reader can open and use the contextual copilot without page clipping", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockReaderBoundaries(page);
  await page.goto("/book/1-requirements-frs-nfrs-constraints-and-assumptions");

  await page.getByRole("button", { name: /Open design copilot/ }).click();
  const dialog = page.getByRole("dialog", { name: /Design copilot/ });
  const textbox = page.getByRole("textbox", { name: /Ask about 1. Requirements/ });
  await expect(dialog).toBeVisible();
  await textbox.fill("Review my design");
  await page.getByRole("button", { name: "Send question" }).click();
  await expect(page.getByText("Review requirements first.")).toBeVisible();

  const hasPageOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasPageOverflow).toBe(false);
  await expect(textbox).toBeInViewport();
  await dialog.getByRole("button", { name: "Close design copilot" }).click();

  const search = page.getByRole("combobox", { name: "Search the complete handbook" });
  await expect(search).toBeEnabled({ timeout: 20_000 });
  await search.fill("9 Security");
  await page.getByRole("option").first().getByRole("link").click();
  await expect(page).toHaveURL(/\/book\/9-security$/);
});

test("unknown handbook routes return not found", async ({ page }) => {
  const response = await page.goto("/book/not-a-real-section");

  expect(response?.status()).toBe(404);
});
