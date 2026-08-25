import { expect, test, type Page } from "@playwright/test";

const handbookRoutes = [
  { path: "/", title: "System Design Checklist Book" },
  { path: "/book/1-requirements-frs-nfrs-constraints-and-assumptions", title: "1. Requirements: FRs, NFRs, Constraints, and Assumptions" },
  { path: "/book/practical-system-design-workflow", title: "Practical system-design workflow" },
] as const;

async function mockReaderBoundaries(page: Page) {
  await page.route("**/api/chat", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: { status: "ready" } });
    return route.fulfill({ json: { answer: "Review requirements first.", status: "ready" } });
  });
  await page.route("**/api/learning-state**", (route) => route.fulfill({ json: { state: null } }));
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
});

test("unknown handbook routes return not found", async ({ page }) => {
  const response = await page.goto("/book/not-a-real-section");

  expect(response?.status()).toBe(404);
});
