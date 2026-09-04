import { expect, test } from "@playwright/test";
import { mockReaderBoundaries } from "./mock-reader-boundaries";

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
