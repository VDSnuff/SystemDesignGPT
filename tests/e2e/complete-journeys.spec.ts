import { expect, test, type Page } from "@playwright/test";
import { bookSections } from "../../app/book-content.generated";
import { guidePages, workshopPage } from "../../app/content";
import type { HandbookProgress } from "../../app/handbook-progress";
import type { LearningPayload } from "../../app/learning-types";

interface RouteExpectation { readonly path: string; readonly title: string }

const DEV_FONT_ORIGIN = "https://fonts.googleapis.com";

const routeExpectations: readonly RouteExpectation[] = [
  { path: "/", title: bookSections[0].title },
  ...guidePages.map(({ slug, title }) => ({ path: `/chapter/${slug}`, title })),
  ...bookSections.slice(1).map(({ slug, title }) => ({ path: `/book/${slug}`, title })),
  { path: "/workshop", title: workshopPage.title },
  { path: "/owner/comments", title: "Learning comments" },
];

interface LearnerStores {
  learning: LearningPayload | null;
  progress: HandbookProgress | null;
}

function isExpectedDevFontConsole(message: string) {
  return message.includes(DEV_FONT_ORIGIN) && message.includes("Content Security Policy");
}

function isExpectedDevFontRequest(url: string, errorText?: string) {
  return url.startsWith(DEV_FONT_ORIGIN) && errorText === "csp";
}

async function mockBoundaries(page: Page, stores: LearnerStores = { learning: null, progress: null }) {
  await page.route("**/api/chat", (route) => route.fulfill({ json: { status: "ready" } }));
  await page.route("**/api/learning-comments**", async (route) => {
    if (route.request().method() === "POST") return route.fulfill({ json: { id: "comment-1" }, status: 201 });
    return route.fulfill({ json: { comments: [] } });
  });
  await page.route("**/api/learning-state**", async (route) => {
    if (route.request().method() === "PUT") {
      stores.learning = route.request().postDataJSON() as LearningPayload;
      return route.fulfill({ json: { saved: true } });
    }
    return route.fulfill({ json: { state: stores.learning } });
  });
  await page.route("**/api/handbook-progress", async (route) => {
    if (route.request().method() === "PUT") {
      stores.progress = route.request().postDataJSON() as HandbookProgress;
      return route.fulfill({ json: { saved: true } });
    }
    return route.fulfill({ json: { state: stores.progress } });
  });
}

test("every public UI route renders cleanly at the reflow width", async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 320, height: 720 });
  await mockBoundaries(page);
  const diagnostics: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !isExpectedDevFontConsole(message.text())) {
      diagnostics.push(`console: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => diagnostics.push(`page: ${error.message}`));
  page.on("requestfailed", (request) => {
    const errorText = request.failure()?.errorText;
    if (!isExpectedDevFontRequest(request.url(), errorText)) {
      diagnostics.push(`request: ${request.url()} ${errorText ?? "failed"}`);
    }
  });

  for (const route of routeExpectations) {
    await test.step(route.path, async () => {
      diagnostics.length = 0;
      const response = await page.goto(route.path);
      expect(response?.status(), route.path).toBe(200);
      await expect(page.getByRole("heading", { level: 1, name: route.title })).toBeVisible();
      await page.waitForLoadState("networkidle");
      expect(await page.locator("h1").count(), route.path).toBe(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), route.path).toBe(true);
      expect(diagnostics, route.path).toEqual([]);
    });
  }
});

test("guest reading remains usable when account persistence is unavailable", async ({ page }) => {
  await page.route("**/api/chat", (route) => route.fulfill({ json: { status: "authentication-required" } }));
  await page.route("**/api/learning-state**", (route) => route.fulfill({ json: { message: "Sign in to load saved work." }, status: 401 }));
  await page.route("**/api/handbook-progress", (route) => route.fulfill({ json: { message: "Sign in to load handbook progress." }, status: 401 }));
  await page.goto("/book/9-security");

  await expect(page.locator("p:visible", { hasText: "Reading stays available. Sign in to save progress across visits." })).toBeVisible();
  await page.getByRole("button", { name: "Mark section complete" }).click();
  await expect(page.getByRole("button", { name: /Section complete · Undo/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("tab", { name: "Notes & feedback" }).click();
  await page.getByLabel("Private page note").fill("Keep this draft in the current page.");
  await expect(page.getByLabel("Private page note")).toHaveValue("Keep this draft in the current page.");
});

test("learner progress, quiz, notes, and feedback survive a reload", async ({ page }) => {
  const stores: LearnerStores = { learning: null, progress: null };
  await mockBoundaries(page, stores);
  await page.goto("/book/5-apis-contracts-and-idempotency");
  await expect(page.getByText("Ready for your first save.")).toBeVisible();

  await page.getByRole("button", { name: "Mark section complete" }).click();
  await page.locator("#section-content input[type='checkbox']").first().check();
  await page.getByRole("tab", { name: "Quiz" }).click();
  const questions = page.locator("fieldset");
  for (let index = 0; index < await questions.count(); index += 1) {
    await questions.nth(index).getByRole("radio").last().check();
  }
  await page.getByRole("tab", { name: "Notes & feedback" }).click();
  await page.getByLabel("Private page note").fill("Review idempotency scope before implementation.");
  await page.getByLabel("Learning comment").fill("The worked example is clear.");
  await page.getByRole("button", { name: "Send to owner" }).click();
  await expect(page.getByText("Comment sent to the owner.")).toBeVisible();
  await page.getByRole("button", { name: "Save learning work" }).click();
  await expect(page.getByText("All learning work for this page is saved.")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: /Section complete · Undo/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#section-content input[type='checkbox']").first()).toBeChecked();
  await page.getByRole("tab", { name: "Notes & feedback" }).click();
  await expect(page.getByLabel("Private page note")).toHaveValue("Review idempotency scope before implementation.");
  await page.getByRole("tab", { name: "Quiz" }).click();
  await expect(page.getByRole("radio", { checked: true })).toHaveCount(await questions.count());
});

test("deep links preserve navigation through history, refresh, and a new tab", async ({ page, context }) => {
  await mockBoundaries(page);
  await page.goto("/chapter/requirements");
  await page.getByRole("link", { name: "1. Requirements: FRs, NFRs, Constraints, and Assumptions" }).click();
  await expect(page).toHaveURL(/\/book\/1-requirements-frs-nfrs-constraints-and-assumptions$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/chapter\/requirements$/);
  await page.goForward();
  await expect(page).toHaveURL(/\/book\/1-requirements-frs-nfrs-constraints-and-assumptions$/);
  await expect(page.getByRole("heading", { level: 1, name: "1. Requirements: FRs, NFRs, Constraints, and Assumptions" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "1. Requirements: FRs, NFRs, Constraints, and Assumptions" })).toBeVisible();

  const newTab = await context.newPage();
  await mockBoundaries(newTab);
  await newTab.goto("/book/9-security#checklist");
  await expect(newTab).toHaveURL(/\/book\/9-security#checklist$/);
  await expect(newTab.locator("#checklist")).toBeVisible();
  await newTab.close();
});

test("intentional missing routes render the not-found contract", async ({ page }) => {
  for (const path of ["/not-a-real-route", "/book/not-a-real-section"]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: "This page is outside the map." })).toBeVisible();
  }
});
