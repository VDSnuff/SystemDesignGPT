import { expect, test, type Page, type Route } from "@playwright/test";
import { seriousViolations } from "./axe";
import { mockBrowserBoundaries } from "./browser-boundaries";

const handbookRoute = "/book/1-requirements-frs-nfrs-constraints-and-assumptions";
const mermaidRoute = "/book/practical-system-design-workflow";
const revision = "2026-09-01T12:00:00.000Z";
const phoneViewport = { width: 390, height: 844 };

interface Gate { open: () => void; closed: Promise<void> }

function gate(): Gate {
  let open = () => {};
  const closed = new Promise<void>((resolve) => { open = resolve; });
  return { open, closed };
}

function fulfillJson(route: Route, json: unknown, status = 200) {
  return route.fulfill({ json, status });
}

async function expectClean(page: Page, state: string) {
  expect(await seriousViolations(page), state).toEqual([]);
}

async function openHandbook(page: Page) {
  await page.goto(handbookRoute);
  await page.getByText("Ready for your first save.").waitFor();
}

async function mockLearningLab(page: Page, saveOutcomes: Array<{ status: number; message?: string }>) {
  await mockBrowserBoundaries(page);
  await page.route("**/api/learning-comments**", (route) => fulfillJson(route, { id: "comment-1" }, 201));
  await page.route("**/api/learning-state**", (route) => {
    if (route.request().method() !== "PUT") return fulfillJson(route, { state: null, revision: null });
    const outcome = saveOutcomes.shift() ?? { status: 200 };
    if (outcome.status === 200) return fulfillJson(route, { saved: true, updatedAt: revision });
    return fulfillJson(route, { message: outcome.message }, outcome.status);
  });
  await page.route("**/api/handbook-progress", (route) => {
    if (route.request().method() !== "PUT") return fulfillJson(route, { state: null, revision: null });
    return fulfillJson(route, { message: "Handbook progress changed in another session. Reload before saving again." }, 409);
  });
}

test("progress conflict and quiz feedback states stay accessible", async ({ page }) => {
  await mockLearningLab(page, []);
  await openHandbook(page);

  await page.getByRole("button", { name: "Mark section complete" }).click();
  await expect(page.locator("p:visible", { hasText: "Handbook progress changed in another session" })).toBeVisible();
  await expectClean(page, "progress conflict");

  await page.getByRole("tab", { name: "Quiz" }).click();
  const quiz = page.getByRole("tabpanel", { name: "Quiz" });
  await quiz.getByRole("radio", { name: "A measurable nonfunctional requirement." }).check();
  await quiz.getByRole("radio", { name: "A named database product." }).check();
  await expect(quiz.getByText(/^✓ Correct\.$/)).toBeVisible();
  await expect(quiz.getByText(/^○ Not quite\.$/)).toBeVisible();
  await expect(page.getByText(/of 2 correct/)).toBeVisible();
  await expectClean(page, "quiz feedback");
});

test("comment sent and save outcome states stay accessible", async ({ page }) => {
  await mockLearningLab(page, [
    { status: 401, message: "Sign in to save learning work." },
    { status: 200 },
    { status: 409, message: "Learning work changed in another session. Reload before saving again." },
  ]);
  await openHandbook(page);

  await page.getByRole("tab", { name: "Notes & feedback" }).click();
  await page.getByLabel("Private page note").fill("Synthetic accessibility note.");
  await page.getByLabel("Learning comment").fill("Synthetic accessibility comment.");
  await page.getByRole("button", { name: "Send to owner" }).click();
  await expect(page.getByText("Comment sent to the owner.")).toBeVisible();
  await expectClean(page, "comment sent");

  const save = page.getByRole("button", { name: "Save learning work" });
  await save.click();
  await expect(page.getByText(/Sign in to save learning work\. Your work is still here/)).toBeVisible();
  await expectClean(page, "signed-out save");
  await save.click();
  await expect(page.getByText("All learning work for this page is saved.")).toBeVisible();
  await expectClean(page, "signed-in save");
  await save.click();
  await expect(page.getByText(/Learning work changed in another session/)).toBeVisible();
  await expectClean(page, "save conflict");
});

const copilotStatusStates = [
  { status: "unconfigured", label: "Not configured" },
  { status: "authentication-required", label: "Sign in required" },
] as const;

for (const state of copilotStatusStates) {
  test(`copilot ${state.status} status stays accessible`, async ({ page }) => {
    await mockBrowserBoundaries(page);
    await page.route("**/api/chat", (route) => fulfillJson(route, { status: state.status }));
    await openHandbook(page);
    await expect(page.getByRole("alert").filter({ hasText: state.label })).toBeVisible();
    await expectClean(page, state.status);
  });
}

test("copilot checking state stays accessible while status is pending", async ({ page }) => {
  const statusGate = gate();
  await mockBrowserBoundaries(page);
  await page.route("**/api/chat", async (route) => {
    await statusGate.closed;
    return fulfillJson(route, { status: "ready" });
  });
  await openHandbook(page);
  await expect(page.getByLabel("Copilot status: Checking setup")).toBeVisible();
  await expectClean(page, "checking");
  statusGate.open();
  await expect(page.getByLabel("Copilot status: Ready to ask")).toBeVisible();
});

const copilotFailures = [
  { code: "rate_limited", status: 429, message: "Copilot request limit reached. Try again in a few minutes." },
  { code: "usage_limited", status: 429, message: "The AI project has reached a usage limit." },
  { code: "provider_unavailable", status: 503, message: "The copilot provider is temporarily unavailable." },
] as const;

for (const failure of copilotFailures) {
  test(`copilot ${failure.code} response stays accessible`, async ({ page }) => {
    await mockBrowserBoundaries(page);
    await page.route("**/api/chat", (route) => {
      if (route.request().method() === "GET") return fulfillJson(route, { status: "ready" });
      return fulfillJson(route, { error: { code: failure.code, message: failure.message } }, failure.status);
    });
    await openHandbook(page);
    await askCopilot(page, "Which requirement is missing a threshold?");
    await expect(page.getByRole("alert").filter({ hasText: failure.message })).toBeVisible();
    await expectClean(page, failure.code);
  });
}

test("copilot sending and answered states stay accessible", async ({ page }) => {
  const answerGate = gate();
  await mockBrowserBoundaries(page);
  await page.route("**/api/chat", async (route) => {
    if (route.request().method() === "GET") return fulfillJson(route, { status: "ready" });
    await answerGate.closed;
    return fulfillJson(route, {
      answer: "Start by making the availability target measurable.",
      metadata: { inputTokens: 120, latencyMs: 850, model: "test-model-v1", outputTokens: 24, totalTokens: 144 },
      status: "ready",
    });
  });
  await openHandbook(page);
  await askCopilot(page, "Which requirement is missing a threshold?");
  await expect(page.getByText("Thinking with this page’s context…")).toBeVisible();
  await expectClean(page, "sending");
  answerGate.open();
  await expect(page.getByText("Start by making the availability target measurable.").first()).toBeVisible();
  await expectClean(page, "answered");
});

async function askCopilot(page: Page, question: string) {
  const field = page.getByRole("textbox", { name: /^Ask about/ });
  await expect(field).toBeEnabled({ timeout: 20_000 });
  await field.fill(question);
  await page.getByRole("button", { name: "Send question" }).click();
}

test("mobile copilot dialog stays accessible", async ({ page }) => {
  await page.setViewportSize(phoneViewport);
  await mockBrowserBoundaries(page);
  await openHandbook(page);
  await page.getByRole("button", { name: /Open design copilot/ }).click();
  await expect(page.getByRole("dialog", { name: /Design copilot/ })).toBeVisible();
  await expectClean(page, "mobile copilot dialog");
});

test("search results and unavailable states stay accessible", async ({ page }) => {
  await mockBrowserBoundaries(page);
  await page.goto("/");
  const search = page.getByRole("combobox", { name: "Search the guide and handbook" });
  await expect(search).toBeEnabled({ timeout: 20_000 });
  await search.fill("requirements");
  await expect(page.getByRole("option").first()).toBeVisible();
  await expectClean(page, "search results");

  await page.route(
    /\/(?:app\/book-search\.ts|_next\/static\/chunks\/book-search-[^/]+\.js)(?:\?|$)/,
    (route) => route.abort("failed"),
  );
  await page.goto("/");
  await search.fill("requirements");
  await expect(page.getByText("Search is unavailable. Use the guide or handbook navigation.")).toBeVisible();
  await expectClean(page, "search unavailable");
});

test("owner comments loading, populated, and failed states stay accessible", async ({ page }) => {
  const commentsGate = gate();
  const comments = [
    { id: "comment-1", userEmail: "learner-a@example.test", pageSlug: "1-requirements-frs-nfrs-constraints-and-assumptions", pageTitle: "Requirements", body: "Synthetic new comment.", status: "new", createdAt: revision },
    { id: "comment-2", userEmail: "learner-b@example.test", pageSlug: "workshop", pageTitle: "Workshop", body: "Synthetic read comment.", status: "read", createdAt: revision },
  ];
  await mockBrowserBoundaries(page);
  await page.route("**/api/learning-comments**", async (route) => {
    await commentsGate.closed;
    return fulfillJson(route, { comments, nextCursor: revision });
  });
  await page.goto("/owner/comments");
  await expect(page.getByText("Loading comments…")).toBeVisible();
  await expectClean(page, "comments loading");
  commentsGate.open();
  await expect(page.getByRole("button", { name: "Load older comments" })).toBeVisible();
  await expect(page.getByText("Status: New")).toBeVisible();
  await expect(page.getByText("Status: Read")).toBeVisible();
  await expectClean(page, "comments populated");

  await page.route("**/api/learning-comments**", (route) => fulfillJson(route, { message: "Owner access is required." }, 403));
  await page.goto("/owner/comments");
  await expect(page.getByText("Owner access is required.")).toBeVisible();
  await expectClean(page, "comments failed");
});

test("Mermaid fallback state stays accessible when the renderer fails to load", async ({ page }) => {
  await mockBrowserBoundaries(page);
  await page.route(/node_modules\/(?:\.vite\/deps\/)?mermaid/, (route) => route.abort("failed"));
  await page.goto(mermaidRoute);
  await page.getByText("Ready for your first save.").waitFor();
  await page.locator(".book-prose").getByText(/^Figure 1\./).scrollIntoViewIfNeeded();
  await expect(page.locator(".mermaid-fallback").first()).toBeVisible({ timeout: 20_000 });
  await expectClean(page, "mermaid fallback");
});

test("workshop signed-out state stays accessible", async ({ page }) => {
  await mockBrowserBoundaries(page);
  await page.route("**/api/learning-state**", (route) => fulfillJson(route, { message: "Sign in to load learning work." }, 401));
  await page.goto("/workshop");
  await expect(page.getByText("You can edit this diagram now. Sign in to save it for your next visit.")).toBeVisible();
  await expectClean(page, "workshop signed out");
});

test("not-found route stays accessible", async ({ page }) => {
  await mockBrowserBoundaries(page);
  await page.goto("/not-a-real-route");
  await expect(page.getByRole("heading", { level: 1, name: "This page is outside the map." })).toBeVisible();
  await expectClean(page, "not found");
});
