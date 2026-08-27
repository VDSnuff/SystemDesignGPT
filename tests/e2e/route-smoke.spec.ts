import { expect, test, type Locator, type Page } from "@playwright/test";
import type { HandbookProgress } from "../../app/handbook-progress";

const handbookRoutes = [
  { path: "/", title: "System Design Checklist Book" },
  { path: "/book/1-requirements-frs-nfrs-constraints-and-assumptions", title: "1. Requirements: FRs, NFRs, Constraints, and Assumptions" },
  { path: "/book/practical-system-design-workflow", title: "Practical system-design workflow" },
] as const;

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

async function dragHorizontally(page: Page, handle: Locator, distance: number) {
  const box = await handle.boundingBox();
  if (!box) throw new Error("Resize handle is not visible");
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await expect(handle).not.toHaveAttribute("data-resizing", "true");
  expect(await handle.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0.18s, 0.18s");
  await page.mouse.move(startX + distance, startY, { steps: 5 });
  await expect(handle).toHaveAttribute("data-resizing", "true");
  expect(await handle.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0s");
  await page.mouse.up();
  await expect(handle).not.toHaveAttribute("data-resizing", "true");
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
  await expect(page.getByText("Review requirements first.", { exact: true })).toBeVisible();

  const hasPageOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasPageOverflow).toBe(false);
  await expect(textbox).toBeInViewport();
  await dialog.getByRole("button", { name: "Close design copilot" }).click();

  const search = page.getByRole("combobox", { name: "Search the guide and handbook" });
  await expect(search).toBeEnabled({ timeout: 20_000 });
  await search.fill("9 Security");
  await page.getByRole("option").first().getByRole("link").click();
  await expect(page).toHaveURL(/\/book\/9-security$/);
});

test("a desktop reader can resize and collapse both side panels", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await mockReaderBoundaries(page);
  await page.goto("/book/1-requirements-frs-nfrs-constraints-and-assumptions");
  await expect(page.getByLabel("Copilot status: Ready to ask")).toBeVisible();

  const article = page.locator("#main-content > article");
  const initialWidth = (await article.boundingBox())?.width ?? 0;
  const navigation = page.locator(".desktop-navigation");
  const chat = page.locator(".responsive-chat-surface");
  const initialNavigationWidth = (await navigation.boundingBox())?.width ?? 0;
  const initialChatWidth = (await chat.boundingBox())?.width ?? 0;
  const menuHandle = page.getByRole("button", { name: "Resize or collapse complete book menu" });
  const chatHandle = page.getByRole("button", { name: "Resize or collapse design copilot" });
  const menuHandleBox = await menuHandle.boundingBox();
  const chatHandleBox = await chatHandle.boundingBox();

  expect(menuHandleBox?.y).toBe(chatHandleBox?.y);
  await menuHandle.focus();
  expect(await menuHandle.evaluate((element) => getComputedStyle(element, "::before").boxShadow)).toContain("inset");

  await dragHorizontally(page, menuHandle, 40);
  await expect.poll(async () => (await navigation.boundingBox())?.width ?? 0).toBeGreaterThan(initialNavigationWidth + 30);
  await dragHorizontally(page, chatHandle, -40);
  await expect.poll(async () => (await chat.boundingBox())?.width ?? 0).toBeGreaterThan(initialChatWidth + 30);

  await menuHandle.click();
  await chatHandle.click();

  await expect(page.getByRole("button", { name: "Expand complete book menu" })).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("button", { name: "Expand design copilot" })).toHaveAttribute("aria-expanded", "false");
  await expect.poll(async () => (await article.boundingBox())?.width ?? 0).toBeGreaterThan(initialWidth);
  await expect(page.getByRole("navigation", { name: "Complete handbook sections" }).last()).toBeHidden();

  await page.getByRole("button", { name: "Expand complete book menu" }).click();
  await page.getByRole("button", { name: "Expand design copilot" }).click();
  await expect(page.getByRole("navigation", { name: "Complete handbook sections" }).last()).toBeVisible();
  await expect(page.getByRole("textbox", { name: /Ask about 1. Requirements/ })).toBeVisible();
});

test("the Requirements guide article renders at desktop and mobile widths", async ({ page }) => {
  await mockReaderBoundaries(page);
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    const response = await page.goto("/chapter/requirements");

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "Design from requirements, not from patterns." })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Worked example: order cancellation" })).toBeVisible();
    await expect(page.getByRole("link", { name: "1. Requirements: FRs, NFRs, Constraints, and Assumptions" })).toHaveAttribute(
      "href",
      "/book/1-requirements-frs-nfrs-constraints-and-assumptions",
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test("the Boundaries guide article renders at desktop and mobile widths", async ({ page }) => {
  await mockReaderBoundaries(page);
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    const response = await page.goto("/chapter/boundaries-state-data");

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "Make ownership and state visible." })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Worked example: an order-status flow" })).toBeVisible();
    await expect(page.getByRole("link", { name: "2. Boundaries, State, and Data" })).toHaveAttribute(
      "href",
      "/book/2-boundaries-state-and-data",
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test("the Networking guide article renders at desktop and mobile widths", async ({ page }) => {
  await mockReaderBoundaries(page);
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    const response = await page.goto("/chapter/networking");

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "Treat the network as a failure surface." })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Worked example: export progress" })).toBeVisible();
    await expect(page.getByRole("link", { name: "2A. Networking and Communication" })).toHaveAttribute(
      "href",
      "/book/2a-networking-and-communication",
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test("the Data modeling guide article renders at desktop and mobile widths", async ({ page }) => {
  await mockReaderBoundaries(page);
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    const response = await page.goto("/chapter/data-modeling");

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "Model from access patterns." })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Worked example: tenant order history" })).toBeVisible();
    await expect(page.getByRole("link", { name: "2B. Data Modeling, Indexing, and Partitioning" })).toHaveAttribute(
      "href",
      "/book/2b-data-modeling-indexing-and-partitioning",
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test("the Time and ordering guide article renders at desktop and mobile widths", async ({ page }) => {
  await mockReaderBoundaries(page);
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    const response = await page.goto("/chapter/time-ordering");

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "Define what time means." })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Worked example: a ticket hold and payment" })).toBeVisible();
    await expect(page.getByRole("link", { name: "2C. Time, Clocks, and Ordering" })).toHaveAttribute(
      "href",
      "/book/2c-time-clocks-and-ordering",
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test("the Concurrency guide article renders at desktop and mobile widths", async ({ page }) => {
  await mockReaderBoundaries(page);
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    const response = await page.goto("/chapter/concurrency");

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "Protect shared state deliberately." })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Worked example: the last concert seat" })).toBeVisible();
    await expect(page.getByRole("link", { name: "3. Concurrency" })).toHaveAttribute("href", "/book/3-concurrency");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test("the Transactions and consistency guide article renders at desktop and mobile widths", async ({ page }) => {
  await mockReaderBoundaries(page);
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    const response = await page.goto("/chapter/transactions-consistency");

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "Choose consistency, do not inherit it." })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Worked example: checkout across three owners" })).toBeVisible();
    await expect(page.getByRole("table")).toContainText("Transactional outbox");
    await expect(page.getByRole("link", { name: "4. Transactions and Consistency" }).first()).toHaveAttribute(
      "href",
      "/book/4-transactions-and-consistency",
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test("the APIs and idempotency guide article renders at desktop and mobile widths", async ({ page }) => {
  await mockReaderBoundaries(page);
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    const response = await page.goto("/chapter/apis-idempotency");

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "Make retries safe at the contract." })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Worked example: create one payment safely" })).toBeVisible();
    await expect(page.getByRole("table")).toContainText("Cursor pagination");
    await expect(page.getByRole("link", { name: "5. APIs, Contracts, and Idempotency" }).first()).toHaveAttribute(
      "href",
      "/book/5-apis-contracts-and-idempotency",
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test("unknown handbook routes return not found", async ({ page }) => {
  const response = await page.goto("/book/not-a-real-section");

  expect(response?.status()).toBe(404);
});

test("a non-diagram section does not load the Mermaid runtime", async ({ page }) => {
  const mermaidRequests: string[] = [];
  page.on("request", (request) => {
    if (/node_modules\/(?:\.vite\/deps\/)?mermaid/.test(request.url())) mermaidRequests.push(request.url());
  });
  await mockReaderBoundaries(page);
  await page.goto("/book/1-requirements-frs-nfrs-constraints-and-assumptions");
  await page.waitForLoadState("networkidle");

  expect(mermaidRequests).toEqual([]);
});

test("every source-authored Mermaid diagram renders on approach", async ({ page }) => {
  await mockReaderBoundaries(page);
  for (const route of mermaidRoutes) {
    await page.goto(route);
    const loadingState = page.locator(".mermaid-loading");
    await expect(loadingState).toHaveCount(1);
    await loadingState.scrollIntoViewIfNeeded();
    await expect(page.getByRole("img", { name: "Architecture diagram" })).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(".mermaid-fallback")).toHaveCount(0);
  }
});
